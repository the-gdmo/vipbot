import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { userPointsKeyExists } from "../database/redis";
import { getCurrentScore, ScoreResult } from "../utils/common-utils";
import { PostSubmit } from "@devvit/protos";

/**
 * Handles newly submitted posts.
 *
 * This is the main entry point for VIPBot post processing.
 */
export async function onPostSubmit(event: PostSubmit, context: TriggerContext) {
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
        // Ignore VIPBot and AutoModerator posts
        // ─────────────────────────────────────────────────────────

        if (
            authorName === context.appSlug ||
            authorName.toLowerCase() === "automoderator"
        ) {
            logger.debug(
                "⏭️ Ignoring post created by VIPBot or AutoModerator",
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
                logger.error("❌ Unable to retrieve existing score for user", {
                    subreddit: subredditName,
                });
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
                logger.error("❌ Unable to retrieve existing score for user", {
                    subreddit: subredditName,
                });
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
}
