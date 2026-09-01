import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { userPointsKeyExists } from "../database/redis";
import { getCurrentScore, ScoreResult } from "../utils/common-utils";
import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { AppSetting, NotifyOnBlockedUserReplyOptions } from "../config/settings";
import { capitalize, formatMessageInCommentContext } from "../utils/formatting";
/**
 * Handles newly submitted comments.
 *
 * This is the main entry point for VIPBot comment processing.
 */

export async function onCommentSubmit(event: CommentSubmit | CommentUpdate, context: TriggerContext) {
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
        const subredditName = event.subreddit.name;
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
        
        const pointName = settings[AppSetting.PointName] as string ?? "trophy";
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
            const userWhoCannotAwardPointsMessage = formatMessageInCommentContext(
                event,
                settings[AppSetting.UsersWhoCannotAwardPointsMessage] as string ?? `You do not have permission to award VIP points to users. [Message the mods]({modmailLink}) if you have any questions.`,
                {
                    name: pointName,
                },
            );
            const notifyUsersWhoCannotAwardPoints = ((settings[
        AppSetting.NotifyOnNormalAwardFail
    ] as string[] | undefined) ?? [
        NotifyOnBlockedUserReplyOptions.NoReply,
    ])[0] as NotifyOnBlockedUserReplyOptions;
            
    if (notifyUsersWhoCannotAwardPoints === NotifyOnBlockedUserReplyOptions.ReplyAsComment) {
        const userWhoCannotAwardPointsMessageReply = await context.reddit.submitComment({
                id: event.comment.id,
                text: userWhoCannotAwardPointsMessage,
            });

            await userWhoCannotAwardPointsMessageReply.distinguish();
            logger.info( "✅ User who cannot award points message submitted", {
                subreddit: subredditName,
                authorName,
                commentId: userWhoCannotAwardPointsMessageReply.id,
            });
            return;
        }else if (notifyUsersWhoCannotAwardPoints === NotifyOnBlockedUserReplyOptions.ReplyByPM) {
            await context.reddit.sendPrivateMessage({
                to: authorName,
                text: userWhoCannotAwardPointsMessage,
                subject: `You do not have permission to award ${pointName}s to users`,
            })

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
                logger.error("❌ Unable to retrieve existing score for user", {
                    subreddit: subredditName,
                });
                const newScore: ScoreResult = {
                    score: 1,
                };
                logger.info(`✅ User points initialized`, {
                    subreddit: subredditName,
                    author: authorName,
                    newScore: newScore.score,
                });
                const userPointsInitializedMessage = formatMessageInCommentContext(
                    event,
                    `Your ${pointName} points have been initialized to 1.`,
                    {
                        name: pointName,
                    },
                );
                await context.reddit.sendPrivateMessage({
                    to: authorName,
                    subject: `${capitalize(pointName)}s Initialized`,
                    text: userPointsInitializedMessage,
                });
                logger.info( "✅ User points initialized message submitted", {
                    subreddit: subredditName,
                    authorName,
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
