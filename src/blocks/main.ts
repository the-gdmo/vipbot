import { Devvit, User } from "@devvit/public-api";
import { logger } from "./utils/logger";
import { getCurrentScore, ScoreResult } from "./utils/common-utils";
import { userPointsKeyExists } from "./database/redis";
import {
    CLEANUP_JOB,
    CLEANUP_JOB_CRON,
    MODINFO_CRON,
    UPDATE_LEADERBOARD_JOB,
    UPDATE_MODINFO_JOB,
} from "./config/constants";
import { populateCleanupLogAndScheduleCleanup } from "./jobs/cleanup";
import { AppSetting, NotifyOnBlockedUserReplyOptions, TemplateDefaults } from "./config/settings";
import { capitalize } from "./utils/formatting";

/**
 *
 * Main Devvit Blocks entry point.
 *
 * All triggers/functionality are registered here.
 */

// ─────────────────────────────────────────────────────────────
// App configuration
// ─────────────────────────────────────────────────────────────

Devvit.configure({
    redditAPI: true,
    redis: true,
});

// ─────────────────────────────────────────────────────────────
// Post Submit
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    event: "PostSubmit",
    async onEvent(event, context) {
        try {
            // ─────────────────────────────────────────────────────────
            // Validate event data
            // ─────────────────────────────────────────────────────────

            if (!event.subreddit || !event.author || !event.post) {
                logger.warn("❌ Missing required event data", {
                    event,
                });

                return;
            }

            // ─────────────────────────────────────────────────────────
            // Basic post information
            // ─────────────────────────────────────────────────────────

            const subredditName = event.subreddit.name;
            const authorName = event.author.name;
            const postId = event.post.id;
            const postTitle = event.post.title ?? "";

            logger.info("📨 Processing new post", {
                subreddit: subredditName,
                author: authorName,
                postId,
                title: postTitle,
            });

            // ─────────────────────────────────────────────────────────
            // Ignore VIPBot2 and AutoModerator posts
            // ─────────────────────────────────────────────────────────

            if (
                authorName === context.appSlug ||
                authorName.toLowerCase() === "automoderator"
            ) {
                logger.debug(
                    "⏭️ Ignoring post created by VIPBot2 or AutoModerator",
                    {
                        postId,
                        author: authorName,
                    },
                );

                return;
            }

            // ─────────────────────────────────────────────────────────
            // Post URL
            // ─────────────────────────────────────────────────────────

            const postUrl = event.post.permalink
                ? `https://www.reddit.com${event.post.permalink}`
                : undefined;

            logger.debug("🔎 Post information collected", {
                subreddit: subredditName,
                author: authorName,
                postId,
                title: postTitle,
                permalink: postUrl,
            });

            let user: User | undefined;
            try {
                user = await context.reddit.getUserByUsername(authorName);
            } catch {
                //
            }

            if (!user) {
                logger.error(
                    "❌ Unable to retrieve user information onPostSubmit",
                    {
                        subreddit: subredditName,
                    },
                );
                return;
            }

            const USER_POINTS_KEY_EXISTS = await userPointsKeyExists(
                context,
                subredditName,
                authorName,
            );

            if (!USER_POINTS_KEY_EXISTS) {
                logger.info("❌ User points key not found. Setting to 0.", {
                    subreddit: subredditName,
                    author: authorName,
                });
                const existingScore = await getCurrentScore(user, context);
                if (!existingScore) {
                    logger.error(
                        "❌ Unable to retrieve existing score for user",
                        {
                            subreddit: subredditName,
                        },
                    );
                    const newScore: ScoreResult = {
                        score: 0,
                    };
                    logger.info(`✅ User points initialized`, {
                        subreddit: subredditName,
                        author: authorName,
                        newScore: newScore.score,
                    });
                    return;
                }
            } else {
                const existingScore = await getCurrentScore(user, context);
                if (!existingScore) {
                    logger.error(
                        "❌ Unable to retrieve existing score for user",
                        {
                            subreddit: subredditName,
                        },
                    );
                    return;
                }

                const newScore: ScoreResult = {
                    score: existingScore.score + 1,
                    userHasFlair: existingScore.userHasFlair,
                    flairIsNumber: existingScore.flairIsNumber,
                };
                logger.info(`✅ User points incremented by 1`, {
                    subreddit: subredditName,
                    author: authorName,
                    newScore: newScore.score,
                });
            }

            // ─────────────────────────────────────────────────────────
            logger.info("✅ Post processed successfully", {
                subreddit: subredditName,
                author: authorName,
                postId,
            });
        } catch (error) {
            logger.error("❌ Error processing post submission", {
                error,
            });
        }
    },
});

// ─────────────────────────────────────────────────────────────
// Comment Submit/Update
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    events: ["CommentSubmit", "CommentUpdate"],
    async onEvent(event, context) {
        try {
            // ─────────────────────────────────────────────────────────
            // Validate event data
            // ─────────────────────────────────────────────────────────

            if (!event.subreddit || !event.author || !event.comment) {
                logger.warn("❌ Missing required event data", {
                    event,
                });

                return;
            }

            // ─────────────────────────────────────────────────────────
            // Basic post information
            // ─────────────────────────────────────────────────────────

            const settings = await context.settings.getAll();
            const subreddit = event.subreddit;
            const subredditName = subreddit.name;
            const authorName = event.author.name;
            const postId = event.comment.id;
            const commentBody = event.comment.body ?? "";

            logger.info("📨 Processing new comment", {
                subreddit: subredditName,
                author: authorName,
                postId,
                body: commentBody,
            });

            // ─────────────────────────────────────────────────────────
            // Ignore VIPBot2 and AutoModerator posts
            // ─────────────────────────────────────────────────────────

            if (
                authorName === context.appSlug ||
                authorName.toLowerCase() === "automoderator"
            ) {
                logger.debug(
                    "⏭️ Ignoring post created by VIPBot2 or AutoModerator",
                    {
                        postId,
                        author: authorName,
                    },
                );

                return;
            }

            // ─────────────────────────────────────────────────────────
            // Post URL
            // ─────────────────────────────────────────────────────────

            const commentUrl = event.comment.permalink
                ? `https://www.reddit.com${event.comment.permalink}`
                : undefined;

            logger.debug("🔎 Comment information collected", {
                subreddit: subredditName,
                author: authorName,
                postId,
                body: commentBody,
                permalink: commentUrl,
            });

            let user: User | undefined;
            try {
                user = await context.reddit.getUserByUsername(authorName);
            } catch {
                //
            }

            if (!user) {
                logger.error(
                    "❌ Unable to retrieve user information onPostSubmit",
                    {
                        subreddit: subredditName,
                    },
                );
                return;
            }

            //process event

            const pointName =
                (settings[AppSetting.PointName] as string) ?? "trophy";
            const usersWhoCannotAwardPoints = settings[
                AppSetting.UsersWhoCannotAwardPoints
            ] as string[] | undefined;
            if (usersWhoCannotAwardPoints?.includes(authorName)) {
                logger.info(
                    "⏭️ Ignoring point given by user who cannot give points",
                    {
                        subreddit: subredditName,
                        author: authorName,
                    },
                );

                const userWhoCannotAwardPointsMessage =
                    (settings[
                        AppSetting.UsersWhoCannotAwardPointsMessage
                    ] as string) ??
                    `You do not have permission to award VIP points to users. [Message the mods]({modmailLink}) if you have any questions.`;
                let result = userWhoCannotAwardPointsMessage;
                const singlePointName = new RegExp(`{name}`, "gi");
                const doublePointName = new RegExp(`{{name}}`, "gi");
                if (doublePointName.test(result)) {
                    logger.debug(`Replacing {{name}} with ${pointName}`);
                    result = result.replaceAll(doublePointName, pointName);
                } else if (singlePointName.test(result)) {
                    logger.debug(`Replacing {{name}} with ${pointName}`);
                    result = result.replaceAll(singlePointName, pointName);
                }

                const footer = `\n\n---\n\n^(I am a bot — [contact the mods of r/${event.subreddit.name}](https://reddit.com/message/compose?to=r/${event.subreddit.name}) with any questions or [r/TheRepBot](https://www.reddit.com/message/compose?to=r/TheRepBot) to talk directly with my developer)`;
                if (!result.trim().endsWith(footer)) {
                    result = result.trim() + footer;
                }

                const notifyUsersWhoCannotAwardPoints = ((settings[
                    AppSetting.NotifyOnNormalAwardFail
                ] as string[] | undefined) ?? [
                    NotifyOnBlockedUserReplyOptions.NoReply,
                ])[0] as NotifyOnBlockedUserReplyOptions;

                if (
                    notifyUsersWhoCannotAwardPoints ===
                    NotifyOnBlockedUserReplyOptions.ReplyAsComment
                ) {
                    const userWhoCannotAwardPointsMessageReply =
                        await context.reddit.submitComment({
                            id: event.comment.id,
                            text: result,
                        });

                    await userWhoCannotAwardPointsMessageReply.distinguish();
                    logger.info(
                        "✅ User who cannot award points message submitted",
                        {
                            subreddit: subredditName,
                            authorName,
                            commentId: userWhoCannotAwardPointsMessageReply.id,
                        },
                    );
                    return;
                } else if (
                    notifyUsersWhoCannotAwardPoints ===
                    NotifyOnBlockedUserReplyOptions.ReplyByPM
                ) {
                    await context.reddit.sendPrivateMessage({
                        to: authorName,
                        text: result,
                        subject: `You do not have permission to award ${pointName}s to users`,
                    });
                }
            }

            const USER_POINTS_KEY_EXISTS = await userPointsKeyExists(
                context,
                subredditName,
                authorName,
            );
            if (!USER_POINTS_KEY_EXISTS) {
                logger.info("❌ User points key not found. Setting to 0.", {
                    subreddit: subredditName,
                    author: authorName,
                });
                const existingScore = await getCurrentScore(user, context);
                if (!existingScore) {
                    logger.error(
                        "❌ Unable to retrieve existing score for user",
                        {
                            subreddit: subredditName,
                        },
                    );
                    const newScore: ScoreResult = {
                        score: 1,
                    };
                    logger.info(`✅ User points initialized`, {
                        subreddit: subredditName,
                        author: authorName,
                        newScore: newScore.score,
                    });
                    const userPointsInitializedMessage = settings[AppSetting.UserPointsInitializedMessage] as string ?? TemplateDefaults.UserPointsInitializedMessage;
                    let result = userPointsInitializedMessage;
                    const singlePointName = new RegExp(`{name}`, "gi");
                    const doublePointName = new RegExp(`{{name}}`, "gi");
                    if (doublePointName.test(result)) {
                        logger.debug(
                            `Replacing {{name}} with ${pointName}`,
                        );
                        result = result.replaceAll(doublePointName, pointName);
                    } else if (singlePointName.test(result)) {
                        logger.debug(
                            `Replacing {{name}} with ${pointName}`,
                        );
                        result = result.replaceAll(singlePointName, pointName);
                    }

                    const footer = `\n\n---\n\n^(I am a bot — [contact the mods of r/${event.subreddit.name}](https://reddit.com/message/compose?to=r/${event.subreddit.name}) with any questions or [r/TheRepBot](https://www.reddit.com/message/compose?to=r/TheRepBot) to talk directly with my developer)`;
                    if (!result.trim().endsWith(footer)) {
                        result = result.trim() + footer;
                    }

                    await context.reddit.sendPrivateMessage({
                        to: authorName,
                        subject: `${capitalize(pointName)}s Initialized`,
                        text: userPointsInitializedMessage,
                    });
                    logger.info(
                        "✅ User points initialized message submitted",
                        {
                            subreddit: subredditName,
                            authorName,
                        },
                    );

                    return;
                }
            } else {
                const existingScore = await getCurrentScore(user, context);
                if (!existingScore) {
                    logger.error(
                        "❌ Unable to retrieve existing score for user",
                        {
                            subreddit: subredditName,
                        },
                    );
                    return;
                }

                const newScore: ScoreResult = {
                    score: existingScore.score + 1,
                    userHasFlair: existingScore.userHasFlair,
                    flairIsNumber: existingScore.flairIsNumber,
                };
                logger.info(`✅ User points incremented by 1`, {
                    subreddit: subredditName,
                    author: authorName,
                    newScore: newScore.score,
                });
            }

            // ─────────────────────────────────────────────────────────
            logger.info("✅ Post processed successfully", {
                subreddit: subredditName,
                author: authorName,
                postId,
            });
        } catch (error) {
            logger.error("❌ Error processing post submission", {
                error,
            });
        }
    },
});

// ─────────────────────────────────────────────────────────────
// App Install
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    event: "AppInstall",
    async onEvent(_, context) {
        await context.redis.set("InstallDate", new Date().getTime().toString());
        const currentJobs = await context.scheduler.listJobs();
        await Promise.all(
            currentJobs.map((job) => context.scheduler.cancelJob(job.id)),
        );

        await context.scheduler.runJob({
            name: CLEANUP_JOB,
            cron: CLEANUP_JOB_CRON,
        });
        await context.scheduler.runJob({
            name: UPDATE_MODINFO_JOB,
            cron: MODINFO_CRON,
        });
        // await context.scheduler.runJob({
        //     name: UPGRADE_NOTIFIER_JOB,
        //     cron: UPGRADE_NOTIFIER_CRON,
        // });

        await populateCleanupLogAndScheduleCleanup(context);

        await context.scheduler.runJob({
            name: UPDATE_LEADERBOARD_JOB,
            runAt: new Date(),
            data: { reason: "VIPBot2 has been installed or upgraded." },
        });
    },
});

// ─────────────────────────────────────────────────────────────
// App Upgrade
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    event: "AppUpgrade",
    async onEvent(_, context) {
        const currentJobs = await context.scheduler.listJobs();
        await Promise.all(
            currentJobs.map((job) => context.scheduler.cancelJob(job.id)),
        );

        await context.scheduler.runJob({
            name: CLEANUP_JOB,
            cron: CLEANUP_JOB_CRON,
        });
        await context.scheduler.runJob({
            name: UPDATE_MODINFO_JOB,
            cron: MODINFO_CRON,
        });
        // await context.scheduler.runJob({
        //     name: UPGRADE_NOTIFIER_JOB,
        //     cron: UPGRADE_NOTIFIER_CRON,
        // });

        await populateCleanupLogAndScheduleCleanup(context);

        await context.scheduler.runJob({
            name: UPDATE_LEADERBOARD_JOB,
            runAt: new Date(),
            data: { reason: "VIPBot2 has been installed or upgraded." },
        });
    },
});

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────

export default Devvit;
