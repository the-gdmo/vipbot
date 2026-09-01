import { logger } from "./logger";
import { AppSetting } from "../config/settings";
import { TriggerContext, User } from "@devvit/public-api";
import { POINTS_STORE_KEY } from "../config/constants";

export interface ScoreResult {
    score: number;
    place?: number;
    userHasFlair?: boolean;
    flairIsNumber?: boolean;
}

export async function getCurrentScore(
    user: User,
    context: TriggerContext
): Promise<ScoreResult | undefined> {
    if (!context.subredditName) {
        logger.error("❌ Subreddit name is not available in context.");
        return;
    }

    const userFlair = await user.getUserFlairBySubreddit(context.subredditName);

    const scoreFromRedis = await context.redis.zScore(
        POINTS_STORE_KEY,
        user.username
    );

    const rank = await context.redis.zRank(POINTS_STORE_KEY, user.username);

    const place = rank !== undefined && rank !== null ? rank + 1 : undefined;

    logger.info("🔢 Values", {
        place,
        rank,
        scoreFromRedis,
        userHasFlair: userFlair?.flairText !== undefined,
    });

    let scoreFromFlair: number | undefined;
    let flairIsNumber = false;

    if (userFlair?.flairText) {
        const flairTextTemplate =
            ((await context.settings.get(AppSetting.FlairFormatting)) as
                | string
                | undefined) ?? "{total}{symbol} | #{place}";

        const escapeRegex = (text: string): string =>
            text.replaceAll(/[.*+?^${}()|[\]\\]/gi, "\\$&");

        // Escape the template first.
        let pattern = escapeRegex(flairTextTemplate);

        // Replace placeholders with regex.
        pattern = pattern.replaceAll(escapeRegex("{{total}}"), "(\\d+)");

        pattern = pattern.replaceAll(escapeRegex("{{symbol}}"), ".*?");

        pattern = pattern.replaceAll(escapeRegex("{{place}}"), "\\d+");

        pattern = pattern.replaceAll(escapeRegex("{total}"), "(\\d+)");

        pattern = pattern.replaceAll(escapeRegex("{symbol}"), ".*?");

        pattern = pattern.replaceAll(escapeRegex("{place}"), "\\d+");

        const regex = new RegExp(`^${pattern}$`);

        const matches = regex.exec(userFlair.flairText);

        const matchedPoints = matches?.[1];

        scoreFromFlair = matchedPoints
            ? parseInt(matchedPoints, 10)
            : undefined;

        logger.debug("Checking flair values", {
            place,
            flairText: userFlair.flairText,
            flairTemplate: flairTextTemplate,
            regex: regex.toString(),
            matches,
            matchedPoints,
            scoreFromFlair,
        });

        // Fallback: extract the first number found anywhere.
        if (scoreFromFlair === undefined) {
            const fallbackRegex = /(\d+)/;
            const fallbackMatches = fallbackRegex.exec(userFlair.flairText);

            scoreFromFlair = fallbackMatches?.[1]
                ? parseInt(fallbackMatches[1], 10)
                : undefined;

            logger.debug("Fallback flair parsing", {
                fallbackMatches,
                scoreFromFlair,
            });
        }

        // We successfully parsed a score.
        flairIsNumber = scoreFromFlair !== undefined;
    }

    const finalScore = scoreFromFlair ?? scoreFromRedis ?? 0;

    await context.redis.zAdd(POINTS_STORE_KEY, {
        member: user.username,
        score: finalScore,
    });

    logger.info("🔢 Values", {
        place,
        score: finalScore,
        scoreFromRedis,
        scoreFromFlair,
        userHasFlair: userFlair?.flairText !== undefined,
        flairIsNumber,
    });

    return {
        score: finalScore,
        userHasFlair: userFlair?.flairText !== undefined,
        flairIsNumber,
    };
}