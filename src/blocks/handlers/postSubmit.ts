import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { PostSubmit } from "@devvit/protos";
import {
    getManagedFlairScore,
    ScoreResult,
    setManagedFlairScoreOnPostSubmit,
} from "../utils/common-utils";
import { AppSetting, TemplateDefaults } from "../config/settings";
import { formatMessage } from "../utils/formatting";
import { UserProfile } from "../config/userProfile";

/**
 * Handles newly submitted posts.
 *
 * The PostIncrement setting updates only the publicly managed flair score.
 * UserProfile reputation, XP, and coins are intentionally separate systems.
 */
export async function onPostSubmit(event: PostSubmit, context: TriggerContext) {
    if (!event.post || !event.author) {
        logger.warn("❌ Missing required event data", { event });
        return;
    }

    const settings = await context.settings.getAll();
    const posterName = event.author.name;
    const normalizedPoster = posterName.trim().toLowerCase();
    const normalizedAppSlug = context.appSlug.trim().toLowerCase();
    const excludedAccount =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;
    const excludedAccounts = excludedAccount
        .split(/\r?\n|,/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    if (
        normalizedPoster === "automoderator" ||
        normalizedPoster === normalizedAppSlug ||
        excludedAccounts.includes(normalizedPoster)
    ) {
        logger.debug("🤖 Poster is excluded from managed scoring", {
            poster: posterName,
        });
        return;
    }

    let originalPoster: User | undefined;

    try {
        originalPoster = await context.reddit.getUserByUsername(posterName);
    } catch (error) {
        logger.warn("❌ Could not resolve post author", {
            poster: posterName,
            error,
        });
    }

    if (!originalPoster) {
        return;
    }

    // XP, streaks, daily coins, achievements, and automatic VIP progression
    // are independent of the legacy managed-flair score.
    try {
        await new UserProfile(originalPoster, context).recordActivity("post");
    } catch (error) {
        logger.error("❌ Failed to record VIPBot post activity", {
            user: originalPoster.username,
            error,
        });
    }

    const prefix = (settings[AppSetting.CommandPrefix] as string) ?? "/";
    const newPostMessage = formatMessage(
        event,
        (settings[AppSetting.NewPostMessage] as string) ??
            TemplateDefaults.NewPostMessage,
        { prefix }
    );

    try {
        const newPostComment = await context.reddit.submitComment({
            id: event.post.id,
            text: newPostMessage,
        });

        await newPostComment.distinguish(true);
    } catch (error) {
        // Failure to post the informational bot comment should not prevent
        // XP/activity rewards or managed-flair scoring.
        logger.warn("⚠️ Could not post VIPBot new-post information comment", {
            postId: event.post.id,
            poster: originalPoster.username,
            error,
        });
    }

    const increment = (settings[AppSetting.PostIncrement] as number) ?? 0;

    if (increment === 0) {
        logger.debug("Managed flair post increment is disabled", {
            poster: posterName,
            postId: event.post.id,
        });
        return;
    }

    const currentScore = await getManagedFlairScore(originalPoster, context);

    if (!currentScore) {
        logger.warn("❌ Could not retrieve managed flair score", {
            poster: originalPoster.username,
            postId: event.post.id,
        });
        return;
    }

    const newScore: ScoreResult = {
        score: currentScore.score + increment,
        userHasFlair: currentScore.userHasFlair,
        flairIsNumber: currentScore.flairIsNumber,
    };

    logger.info("Updating managed flair score for new post", {
        poster: originalPoster.username,
        oldScore: currentScore.score,
        newScore: newScore.score,
        increment,
    });

    await setManagedFlairScoreOnPostSubmit(
        event,
        context,
        originalPoster.username,
        newScore,
        settings
    );
}
