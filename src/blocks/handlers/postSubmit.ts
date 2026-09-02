import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { PostSubmit } from "@devvit/protos";
import {
    getCurrentScore,
    ScoreResult,
    setUserScoreOnPostSubmit,
} from "../utils/common-utils";
import { AppSetting } from "../config/settings";
import { CommentTriggerContext } from "../config/commentTriggerContext";

/**
 * Handles newly submitted posts.
 *
 * This is the main entry point for VIPBot post processing.
 */
export async function onPostSubmit(event: PostSubmit, context: TriggerContext) {
    if (!event.post || !event.author) {
        logger.warn("❌ Missing required event data", { event });
        return;
    }

    const settings = await context.settings.getAll();
    const increment = (settings[AppSetting.PostIncrement] as number) ?? 0;
    const awarder = event.author.name;
    let originalPoster: User | undefined;
    try {
        originalPoster = await context.reddit.getUserByUsername(awarder);
    } catch {
        originalPoster = undefined;
    }

    if (!originalPoster) {
        logger.error(`User object couldn't be found`, { user: awarder });
        return;
    }

    const postersCanReceivePointsOnPosting =
        (settings[AppSetting.PostIncrement] as number) ?? 0;
    if (postersCanReceivePointsOnPosting !== 0) {
        const awardersScore = await getCurrentScore(originalPoster, context);

        if (!awardersScore) {
            logger.warn("❌ Could not retrieve awarder's score", {
                awarder: originalPoster.username,
            });
            return;
        }

        const awarderScore: ScoreResult = {
            score: awardersScore.score + increment,
            userHasFlair: awardersScore.userHasFlair,
            flairIsNumber: awardersScore.flairIsNumber,
        };

        logger.info(`Setting user score on making a post`);
        await setUserScoreOnPostSubmit(
            event,
            context,
            originalPoster.username,
            awarderScore,
            settings,
        );

        logger.info(`Completed running setUserScoreOnPostSubmit()`);
        return;
    }

    // ─────────────────────────────────────────────
    // Initialize context
    // ─────────────────────────────────────────────
    const commentTriggerContext = new CommentTriggerContext();
    await commentTriggerContext.init(event, context);

    const OP = event.author.name;

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(OP);
    } catch {
        user = undefined;
    }
    if (!user) {
        logger.warn("❌ Could not fetch user object for OP", { OP });
        return;
    }
    const existingScore = await getCurrentScore(user, context);
    if (!existingScore) {
        logger.warn("❌ Could not fetch existing score for OP", {
            OP: user.username,
            postId: event.post.id,
        });
        return;
    }

    const posterCanReceivePointsOnPosting =
        (settings[AppSetting.PostIncrement] as number) ?? 0;
    if (posterCanReceivePointsOnPosting === 0) {
        logger.info("❌ Poster cannot receive points on posting", {
            OP: user.username,
            postId: event.post.id,
        });
        return;
    }

    const newScore: ScoreResult = {
        score: existingScore.score + increment,
        userHasFlair: existingScore.userHasFlair,
        flairIsNumber: existingScore.flairIsNumber,
    };

    await setUserScoreOnPostSubmit(event, context, user.username, newScore, settings);
}
