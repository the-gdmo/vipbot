import {
    AppSetting,
    NotifyOnModAwardFailReplyOptions,
    TemplateDefaults,
} from "../config/settings";
import { formatMessage } from "../utils/formatting";
import {
    commentContainsModCommand,
    commentContainsUserCommand,
    executeModCommand,
    executeUserCommand,
    flairTextNotAllowedLogic,
    getCurrentScore,
    getIgnoredContextType,
    getParentComment,
    getTriggers,
    handleIgnoredContext,
    ignoredContextNeedsHandling,
    modCommandValue,
    recipientIsBot,
    ScoreResult,
    selfAwardAttemptLogic,
    setUserScoreOnCommentSubmit,
    unflairedPostLogic,
    userHasPermission,
} from "../utils/common-utils";

import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { TriggerContext, User, Comment } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { CommentTriggerContext } from "../config/commentTriggerContext";

/**
 * Handles newly submitted comments.
 *
 * This is the main entry point for VIPBot comment processing.
 */

export async function onCommentSubmit(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
) {
    if (!event.post || !event.author || !event.comment) {
        logger.warn("❌ Missing required event data", { event });
        return;
    }

    // ─────────────────────────────────────────────
    // Initialize context
    // ─────────────────────────────────────────────
    const commentTriggerContext = new CommentTriggerContext();
    await commentTriggerContext.init(event, context);
    const settings = await context.settings.getAll();
    const increment = (settings[AppSetting.CommentIncrement] as number) ?? 0;
    const awarder = event.author.name;
    const commentBody = event.comment.body.toLowerCase();
    const triggers = await getTriggers(context);
    const triggerUsed = triggers.find((t) => commentBody.includes(t));
    const parentComment: Comment | undefined = await getParentComment(
        event,
        context,
    );

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(awarder);
    } catch {
        user = undefined;
    }

    if (!user) return;

    const commentorsCanReceivePointsOnCommenting =
        (settings[AppSetting.CommentIncrement] as number) ?? 0;
    if (commentorsCanReceivePointsOnCommenting !== 0) {
        const awardersScore = await getCurrentScore(user, context);

        if (!awardersScore) {
            logger.warn("❌ Could not retrieve awarder's score", {
                awarder: user.username,
            });
            return;
        }

        const awarderScore: ScoreResult = {
            score: awardersScore.score + increment,
            userHasFlair: awardersScore.userHasFlair,
            flairIsNumber: awardersScore.flairIsNumber,
        };

        setUserScoreOnCommentSubmit(
            event,
            context,
            user.username,
            awarderScore,
            settings,
        );
        return;
    }

    if (!triggerUsed) {
        logger.debug("❌ No valid award command found.");
        return;
    }

    const ignoredType = getIgnoredContextType(event.comment.body, triggerUsed);

    const IgnoredContextNeedsHandling = await ignoredContextNeedsHandling(
        event,
        context,
        triggerUsed,
    );
    if (ignoredType) {
        logger.info(`ignoredType exists in comment`, { ignoredType });
        if (IgnoredContextNeedsHandling) {
            logger.info(`Running handleIgnoredContext()`, {
                IgnoredContextNeedsHandling,
            });
            await handleIgnoredContext(event, context, triggerUsed);
            return;
        } else {
            logger.info(`Ignored context doesn't need handling`);
            return;
        }
    }

    if (!parentComment) {
        logger.warn("❌ Parent comment not found", {
            commentId: event.comment.id,
        });
        return;
    }

    const awardee = parentComment.authorName;
    if (!awardee) {
        logger.warn("❌ No recipient found", { parentComment });
        return;
    }

    let recipient: User | undefined;

    try {
        recipient = await context.reddit.getUserByUsername(awardee);
    } catch {
        recipient = undefined;
    }
    if (!recipient) {
        logger.warn("❌ Could not fetch user object for recipient", {
            recipient: awardee,
        });
        return;
    }

    const existingScore = await getCurrentScore(recipient, context);
    if (!existingScore) {
        logger.warn("❌ Could not fetch existing score for recipient", {
            recipient: awardee,
        });
        return;
    }

    const isMod = commentTriggerContext.isMod;
    const isSuperUser = commentTriggerContext.isSuperUser;
    const userCanAward = commentTriggerContext.userCanAward;

    // ─────────────────────────────────────────────
    // Access control enforcement
    // ─────────────────────────────────────────────
    let awarderObj: User | undefined;

    try {
        awarderObj = await context.reddit.getUserByUsername(awarder);
    } catch {
        awarderObj = undefined;
    }
    if (!awarderObj) {
        logger.warn("❌ Could not fetch user object for awarder", { awarder });
        return;
    }

    const hasPermission = await userHasPermission(
        event,
        awarderObj.id,
        commentTriggerContext,
        context,
        settings,
    );

    if (!hasPermission) {
        logger.debug("❌ User does not have permission", {
            awarder,
            commentId: event.comment.id,
        });

        return;
    }

    // ─────────────────────────────────────────────
    // Detect which command type exists
    // ─────────────────────────────────────────────

    const containsMod = await commentContainsModCommand(event, context);
    const containsUser = await commentContainsUserCommand(event, context);

    logger.debug("Checking values", {
        trigger: triggerUsed,
        containsMod,
        containsUser,
    });

    await unflairedPostLogic(event, context, awarder, settings);

    await flairTextNotAllowedLogic(
        event,
        context,
        awarder,
        commentBody,
        settings,
        triggerUsed,
    );

    await selfAwardAttemptLogic(event, context, awarder, awardee, settings);

    await recipientIsBot(event, context, awarder, awardee, settings);

    // ─────────────────────────────────────────────
    // Normal user command logic
    // ─────────────────────────────────────────────

    if (containsUser && !containsMod) {
        if (!userCanAward) {
            logger.debug("❌ User blocked from awarding points", { awarder });
            return;
        }
        const handled = await executeUserCommand(event, context);
        // Trigger leaderboard update
        if (handled) {
            await context.scheduler.runJob({
                name: "updateLeaderboard",
                runAt: new Date(),
                data: {
                    reason: `Updated score for ${user.username}. Triggered by user command.`,
                },
            });
            logger.info("✅ User command executed successfully");
            return;
        } else {
            logger.debug("❌ User command detected but not handled");
        }
        return;
    }

    // ─────────────────────────────────────────────
    // Mod command logic
    // ─────────────────────────────────────────────
    if (containsMod && !containsUser) {
        if (isMod || isSuperUser) {
            const handled = await executeModCommand(event, context);
            // Trigger leaderboard update
            if (handled) {
                await context.scheduler.runJob({
                    name: "updateLeaderboard",
                    runAt: new Date(),
                    data: {
                        reason: `Updated score for ${user.username}. Triggered by mod command.`,
                    },
                });
                logger.info("✅ Mod command executed successfully");
                return;
            }
        } else {
            const command = await modCommandValue(context);
            //send message saying no perms
            // ModAwardCommandFailMessage
            const modAwardFailMsg = formatMessage(
                event,
                (settings[AppSetting.ModAwardCommandFailMessage] as string) ??
                    TemplateDefaults.ModAwardCommandFailMessage,
                {
                    awarder,
                    awardee,
                    command,
                },
            );

            const notify = ((settings[
                AppSetting.NotifyOnModAwardFail
            ] as string[]) ?? ["none"])[0];

            if (notify === NotifyOnModAwardFailReplyOptions.ReplyByPM) {
                await context.reddit.sendPrivateMessage({
                    to: awarder,
                    text: modAwardFailMsg,
                    subject: "Unsuccessful Award",
                });
            } else if (
                notify === NotifyOnModAwardFailReplyOptions.ReplyAsComment
            ) {
                const modAwardFailComment = await context.reddit.submitComment({
                    id: event.comment.id,
                    text: modAwardFailMsg,
                });

                await modAwardFailComment.distinguish();
            }
        }
    } else if (!containsUser && !containsMod) {
        const commentorsCanReceivePointsOnCommenting =
            (settings[AppSetting.CommentIncrement] as number) ?? 0;
        if (commentorsCanReceivePointsOnCommenting !== 0) {
            const awardersScore = await getCurrentScore(user, context);

            if (!awardersScore) {
                logger.warn("❌ Could not retrieve awarder's score", {
                    awarder: user.username,
                });
                return;
            }

            const awarderScore: ScoreResult = {
                score: awardersScore.score + increment,
                userHasFlair: awardersScore.userHasFlair,
                flairIsNumber: awardersScore.flairIsNumber,
            };

            setUserScoreOnCommentSubmit(
                event,
                context,
                user.username,
                awarderScore,
                settings,
            );
            return;
        }
    }

    // ─────────────────────────────────────────────
    // Fallback unexpected flow
    // ─────────────────────────────────────────────
    logger.error("Unexpected command flow detected", {
        containsMod,
        containsUser,
        awarder,
        commentId: event.comment.id,
    });
}
