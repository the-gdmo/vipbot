import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { PostSubmit } from "@devvit/protos";
import {
    getCurrentScore,
    ScoreResult,
    setUserScore,
} from "../utils/common-utils";
import { AppSetting } from "../config/settings";
import { CommentTriggerContext } from "../config/commentTriggerContext";

/**
 * Handles newly submitted posts.
 *
 * This is the main entry point for VIPBot post processing.
 */
export async function onPostSubmit(event: PostSubmit, context: TriggerContext) {
    if (!event.post || !event.author || !context.subredditName) {
        logger.warn("❌ Missing required event data", { event });
        return;
    }

    // ─────────────────────────────────────────────
    // Initialize context
    // ─────────────────────────────────────────────
    const commentTriggerContext = new CommentTriggerContext();
    await commentTriggerContext.init(event, context);

    const settings = await context.settings.getAll();
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

    const increment = (settings[AppSetting.PostIncrement] as number) ?? 0;

    const newScore: ScoreResult = {
        score: existingScore.score + increment,
        userHasFlair: existingScore.userHasFlair,
        flairIsNumber: existingScore.flairIsNumber,
    };

    setUserScore(context, user.username, newScore, settings);
}
