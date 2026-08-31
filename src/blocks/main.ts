import { Devvit, User } from "@devvit/public-api";
import { logger } from "./utils/logger";
import {
    getCurrentScore,
    ScoreResult,
} from "./utils/common-utils";
import { userPointsKeyExists } from "./database/redis";
import {
    CLEANUP_JOB,
    CLEANUP_JOB_CRON,
    MODINFO_CRON,
    UPDATE_LEADERBOARD_JOB,
    UPDATE_MODINFO_JOB,
} from "./config/constants";
import { populateCleanupLogAndScheduleCleanup } from "./jobs/cleanup";

/**
 * VIPBot2
 *
 * Main Devvit Blocks entry point.
 *
 * All triggers are registered here. The actual functionality will be
 * implemented in separate files as we build the bot.
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
            // Basic comment information
            // ─────────────────────────────────────────────────────────

            const subredditName = event.subreddit.name;
            const authorName = event.author.name;
            const commentId = event.comment.id;
            const commentBody = event.comment.body ?? "";

            logger.info("📨 Processing new comment", {
                subreddit: subredditName,
                author: authorName,
                commentId,
                body: commentBody,
            });

            // ─────────────────────────────────────────────────────────
            // Ignore VIPBot2 and AutoModerator comments
            // ─────────────────────────────────────────────────────────

            if (
                authorName === context.appSlug ||
                authorName.toLowerCase() === "automoderator"
            ) {
                logger.debug("⏭️ Ignoring comment created by VIPBot2", {
                    commentId,
                    author: authorName,
                });

                return;
            }

            // ─────────────────────────────────────────────────────────
            // Post URL
            // ─────────────────────────────────────────────────────────

            const postUrl = event.comment.permalink
                ? `https://www.reddit.com${event.comment.permalink}`
                : undefined;

            logger.debug("🔎 Post information collected", {
                subreddit: subredditName,
                author: authorName,
                commentId,
                body: commentBody,
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

            //process event
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
                commentId,
            });
        } catch (error) {
            logger.error("❌ Error processing comment submission", {
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
