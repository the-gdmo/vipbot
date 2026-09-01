import { logger } from "./logger";
import { AppSetting, ExistingFlairOverwriteHandling, NotifyOnModAwardSuccessReplyOptions, NotifyOnTrustedUserAwardSuccessReplyOptions, TemplateDefaults } from "../config/settings";
import { SettingsValues, TriggerContext, User } from "@devvit/public-api";
import { POINTS_STORE_KEY } from "../config/constants";
import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { setCleanupForUsers } from "../jobs/cleanup";
import { flairToggleKeyExists, setModDupKey } from "../database/redis";
import { getUserIsSuperuser, handleAutoSuperuserPromotion, isModerator } from "../config/commentTriggerContext";
import { formatMessage } from "./formatting";
import { SafeWikiClient, updateUserWiki } from "../jobs/leaderboard";
import { getParentComment, InitialUserWikiOptions } from "../handlers/commentSubmit";

export interface ScoreResult {
    score: number;
    place?: number;
    userHasFlair?: boolean;
    flairIsNumber?: boolean;
}

export async function awardPointToUserModCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext
) {
    if (!event.comment || !event.subreddit || !event.author || !event.post) {
        logger.warn("❌ Missing required event data", { event });
        return;
    }
    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    const parentComment = await getParentComment(event, context);
    if (!parentComment || !parentComment.authorId) {
        logger.warn("❌ Parent comment missing for mod award");
        return;
    }

    const awarder = event.author.name;
    const awardee = parentComment.authorName;

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(awarder);
    } catch {
        user = undefined;
    }

    if (!user) return;

    let recipient: User | undefined;

    try {
        recipient = await context.reddit.getUserByUsername(awardee);
    } catch {
        recipient = undefined;
    }

    if (!recipient) return;

    const existingScore = await getCurrentScore(recipient, context);

    if (!existingScore) {
        logger.warn("❌ Could not retrieve existing score for user", {
            awardee,
        });
        return;
    }

    const newScore: ScoreResult = {
        score: existingScore.score + 1,
        userHasFlair: existingScore.userHasFlair,
        flairIsNumber: existingScore.flairIsNumber,
    };

    // 🔒 Prevent duplicates
    await setModDupKey(event, context, "1");

    // ⭐ Auto-superuser logic
    const modCommand = (settings[AppSetting.ModAwardCommand] as string) ?? "";
    await handleAutoSuperuserPromotion(
        event,
        context,
        newScore.score,
        modCommand
    );

    // 📣 Notify on success
    const modNotifyMode =
        (settings[AppSetting.NotifyOnModAwardSuccess] as string[])?.[0] ??
        NotifyOnModAwardSuccessReplyOptions.NoReply;
    const trustedUserNotifyMode =
        (
            settings[AppSetting.NotifyOnTrustedUserAwardSuccess] as string[]
        )?.[0] ?? NotifyOnTrustedUserAwardSuccessReplyOptions.NoReply;

    const leaderboard = `https://old.reddit.com/r/${
        event.subreddit.name
    }/wiki/${settings[AppSetting.LeaderboardName] ?? "leaderboard"}`;
    const awarderIsModerator = await isModerator(
        context,
        event.subreddit.name,
        awarder
    );
    const awarderIsSuperUser = await getUserIsSuperuser(context, awarder);

    const modSuccessTemplate =
        (settings[AppSetting.ModAwardCommandSuccess] as string) ??
        TemplateDefaults.ModAwardCommandSuccessMessage;
    const trustedUserSuccessTemplate =
        (settings[AppSetting.TrustedUserAwardSuccessMessage] as string) ??
        TemplateDefaults.TrustedUserAwardSuccessMessage;

    const awardeePage = `https://old.reddit.com/r/${event.subreddit.name}/wiki/user/${awardee}`;
    const awarderPage = `https://old.reddit.com/r/${event.subreddit.name}/wiki/user/${awarder}`;
    const modSuccessMessage = formatMessage(event, modSuccessTemplate, {
        awardee,
        awarder,
        total: newScore.score.toString(),
        name: pointName,
        symbol: (settings[AppSetting.PointSymbol] as string) ?? "",
        leaderboard,
        awardeePage,
        awarderPage,
    });

    const trustedUserMessage = formatMessage(
        event,
        trustedUserSuccessTemplate,
        {
            awardee,
            awarder,
            total: newScore.score.toString(),
            name: pointName,
            symbol: (settings[AppSetting.PointSymbol] as string) ?? "",
            leaderboard,
            awardeePage,
            awarderPage,
        }
    );

    if (
        modNotifyMode !== NotifyOnModAwardSuccessReplyOptions.NoReply &&
        awarderIsModerator
    ) {
        if (
            modNotifyMode === NotifyOnModAwardSuccessReplyOptions.ReplyAsComment
        ) {
            const modAwardSuccessMessage = await context.reddit.submitComment({
                id: event.comment.id,
                text: modSuccessMessage,
            });
            await modAwardSuccessMessage.distinguish();
        } else if (
            modNotifyMode === NotifyOnModAwardSuccessReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                subject: "Mod Award Successful",
                text: modSuccessMessage,
            });
        }
        logger.info("🛡️ Mod award successful", {
            awarder,
            awardee,
            newScore,
        });
    } else if (
        trustedUserNotifyMode !==
            NotifyOnTrustedUserAwardSuccessReplyOptions.NoReply &&
        awarderIsSuperUser
    ) {
        if (
            trustedUserNotifyMode ===
            NotifyOnTrustedUserAwardSuccessReplyOptions.ReplyAsComment
        ) {
            const trustedUserSuccessComment =
                await context.reddit.submitComment({
                    id: event.comment.id,
                    text: trustedUserMessage,
                });
            await trustedUserSuccessComment.distinguish();
        } else if (
            modNotifyMode === NotifyOnModAwardSuccessReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                subject: "Superuser Award Successful",
                text: trustedUserMessage,
            });
        }
    }

    const subredditName = event.subreddit.name;
    // User wiki handling for MOD awarder + awardee
    try {
        const safeWiki = new SafeWikiClient(context.reddit);
        const awarderPage = await safeWiki.getWikiPage(
            subredditName,
            `user/${awarder.toLowerCase()}`
        );
        const recipientPage = await safeWiki.getWikiPage(
            subredditName,
            `user/${awardee}`
        );

        if (!awarderPage) {
            logger.info("📄 Creating missing awarder wiki", {
                awarder,
            });
            await InitialUserWikiOptions(context, awarder);
        }

        if (!recipientPage) {
            logger.info("📄 Creating missing recipient wiki", {
                awardee,
            });
            await InitialUserWikiOptions(context, awardee);
        }

        const givenData = {
            postTitle: event.post.title,
            postUrl: event.post.permalink,
            awardee,
            commentUrl: event.comment.permalink,
        };

        await updateUserWiki(context, awarder, awardee, givenData);
    } catch (err) {
        logger.error("❌ Failed to update user wiki (MOD award)", {
            awarder,
            awardee,
            err,
        });
    }

    let userObj: User | undefined;
    try {
        userObj = await context.reddit.getUserByUsername(awardee);
    } catch {}

    if (!userObj) {
        logger.error("Failed to fetch user for flair update after ALT award");
        return;
    }

    const flairHandlingDisabled = await flairToggleKeyExists(context, userObj);

    if (flairHandlingDisabled) {
        logger.info(
            "Flair handling is disabled for this user, skipping flair update"
        );
        return;
    }

    setUserScore(context, awardee, newScore, settings);
}

export async function setUserScore(
    context: TriggerContext,
    username: string,
    newScore: ScoreResult,
    appSettings: SettingsValues
) {
    // Queue user for cleanup checks in 24 hours, overwriting existing value.
    await setCleanupForUsers([username], context);

    // Queue a leaderboard update.
    await context.scheduler.runJob({
        name: "updateLeaderboard",
        runAt: new Date(),
        data: {
            reason: `Awarded a point to ${username}. New score: ${newScore.score}`,
        },
    });

    const existingFlairOverwriteHandling =
        (appSettings[AppSetting.ExistingFlairHandling] as
            | ExistingFlairOverwriteHandling
            | undefined) ?? ExistingFlairOverwriteHandling.OverwriteNumeric;

    let shouldSetUserFlair: boolean | undefined;
    if (
        existingFlairOverwriteHandling ===
            ExistingFlairOverwriteHandling.OverwriteNumericSymbol ||
        existingFlairOverwriteHandling ===
            ExistingFlairOverwriteHandling.OverwriteNumeric
    ) {
        shouldSetUserFlair = true;
    } else if (
        existingFlairOverwriteHandling ===
        ExistingFlairOverwriteHandling.NeverSet
    ) {
        shouldSetUserFlair = false;
    } else {
        shouldSetUserFlair = !newScore.userHasFlair || newScore.flairIsNumber;
    }

    if (shouldSetUserFlair) {
        console.log(
            `Setting points flair for ${username}. New score: ${newScore.score}`
        );

        let cssClass = appSettings[AppSetting.CSSClass] as string | undefined;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (!cssClass) {
            cssClass = undefined;
        }

        let flairTemplate = appSettings[AppSetting.FlairTemplate] as
            | string
            | undefined;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (!flairTemplate) {
            flairTemplate = undefined;
        }

        if (flairTemplate && cssClass) {
            // Prioritise flair templates over CSS classes.
            cssClass = undefined;
        }

        const flairTextTemplate = "{points}";

        if (!context.subredditName) {
            logger.error(
                "❌ No subreddit name found in context, cannot set user flair"
            );
            return;
        }

        const key = `flairToggle:${username}`;
        const exists = await context.redis.exists(key);

        if (exists) {
            logger.debug("❌ Flair should not be set, skipping", {
                username,
                newScore: newScore.score,
                cssClass,
                flairTemplate,
                flairTextTemplate,
                subreddit: context.subredditName,
            });
            return;
        }

        const flairFormatting =
            (appSettings[AppSetting.FlairFormatting] as string) ??
            TemplateDefaults.FlairFormatting;

        const redisKey = POINTS_STORE_KEY;
        const leaderboard = await context.redis.zRange(redisKey, 0, -1, {
            by: "rank",
            reverse: true,
        });

        const index = leaderboard.findIndex(
            (member) => member.member === username
        );

        const userRank = index >= 0 ? index + 1 : undefined;

        logger.debug("User leaderboard rank", {
            username,
            rank: userRank,
            totalUsers: leaderboard.length,
        });

        const userScore = userRank ?? 0;

        logger.debug("Checking values", {
            userRank,
            newScore: userScore,
        });

        const flairText = flairFormatting
            .replaceAll("{place}", userScore > 0 ? `${userScore}` : "0")
            .replaceAll("{total}", newScore.score.toString())
            .replaceAll(
                "{symbol}",
                appSettings[AppSetting.PointSymbol] as string
            );

        logger.info("Setting user flair", {
            username,
            newScore: userScore,
            cssClass,
            flairTemplate,
            flairText,
            subreddit: context.subredditName,
        });
        await context.reddit.setUserFlair({
            subredditName: context.subredditName,
            username,
            cssClass,
            flairTemplateId: flairTemplate,
            text: flairText,
        });
    } else {
        console.log(
            `${username}: Flair not set (option disabled or flair in wrong state)`
        );
    }
}

export async function getCurrentScore(
    user: User,
    context: TriggerContext,
): Promise<ScoreResult | undefined> {
    if (!context.subredditName) {
        logger.error("❌ Subreddit name is not available in context.");
        return;
    }

    const userFlair = await user.getUserFlairBySubreddit(context.subredditName);

    const scoreFromRedis = await context.redis.zScore(
        POINTS_STORE_KEY,
        user.username,
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

/**
 * Returns the mod award command defined in the app settings.
 */
export async function modCommandValue(context: TriggerContext) {
    const settings = await context.settings.getAll();
    const modCommand = ((settings[AppSetting.ModAwardCommand] as string) ?? "")
        .toLowerCase()
        .trim();
    return modCommand;
}

/**
 * Returns all trigger words (both mod/normal) defined in the app settings.
 */
export async function getTriggers(context: TriggerContext) {
    const settings = await context.settings.getAll();
    const userCommands = (
        (settings[AppSetting.PointTriggerWords] as string) ?? "!award\n.award"
    )
        .split(/\r?\n/)
        .map((w) => w.trim())
        .filter(Boolean);

    // Superuser/Mod award command
    const modCommand = (
        (settings[AppSetting.ModAwardCommand] as string) ?? "!modaward"
    )
        .toLowerCase()
        .trim();

    const allTriggers = Array.from(
        new Set([...userCommands, modCommand].filter((t) => t && t.length > 0)),
    );
    return allTriggers;
}

/**
 * Returns all point trigger words defined in the app settings.
 */
export async function userCommandValues(context: TriggerContext) {
    const settings = await context.settings.getAll();
    const userCommands = (
        (settings[AppSetting.PointTriggerWords] as string) ?? "!award\n.award"
    )
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => c.toLowerCase());
    return userCommands;
}

/**
 * Checks if a comment contains any user command keywords.
 */
export async function commentContainsUserCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<boolean> {
    if (!event.comment) return false;

    const userCommands = await userCommandValues(context);
    const body = event.comment.body;

    logger.info("🔍 Checking comment for user commands", {
        commentId: event.comment.id,
        body,
        userCommands,
    });

    return userCommands.some((command) =>
        new RegExp(`${command}`, "i").test(body),
    );
}

/**
 * Checks if a comment contains any moderator command keywords.
 */
export async function commentContainsModCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<boolean> {
    if (!event.comment) return false;

    const allTriggers = await getTriggers(context);
    const commentBody = event.comment.body ?? "";
    const modCommand = await modCommandValue(context);

    const triggerUsed = allTriggers.find((t) =>
        new RegExp(`${t}`, "i").test(commentBody),
    );
    if (!triggerUsed) return false;
    const usedCommand = triggerUsed;

    const isModCommand = usedCommand === modCommand;

    logger.info("🛡️ Mod command probe", {
        usedCommand,
        modCommand,
        isModCommand,
    });

    return isModCommand;
}
