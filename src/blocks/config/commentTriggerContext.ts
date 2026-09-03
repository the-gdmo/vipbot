import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { Comment, TriggerContext, User } from "@devvit/public-api";
import { AppSetting } from "./settings";
import { logger } from "../utils/logger";
import { getCurrentScore } from "../utils/common-utils";

export const isModerator = async (
    context: TriggerContext,
    subName: string,
    awarder: string,
) => {
    const filteredModeratorList = await context.reddit
        .getModerators({ subredditName: subName, username: awarder })
        .all();
    return filteredModeratorList.length > 0;
};

export async function getUserIsSuperuser(
    context: TriggerContext,
    awarder: string,
) {
    const settings = await context.settings.getAll();

    const VIPUserSetting =
        (settings[AppSetting.VIPUsers] as string | undefined) ?? "";
    const superUsers = VIPUserSetting.split(",").map((user) =>
        user.trim().toLowerCase(),
    );

    if (superUsers.includes(awarder.toLowerCase())) {
        return true;
    }

    const autoSuperuserThreshold =
        (settings[AppSetting.AutoSuperuserThreshold] as number | undefined) ??
        0;

    if (autoSuperuserThreshold) {
        let user: User | undefined;
        try {
            user = await context.reddit.getUserByUsername(awarder);
        } catch {
            return false;
        }
        if (!user) {
            return false;
        }
        const currentScore = await getCurrentScore(user, context);
        if (!currentScore) {
            return false;
        }
        return currentScore.score >= autoSuperuserThreshold;
    } else {
        return false;
    }
}

export async function _replyToUser(
    context: TriggerContext,
    toUserName: string,
    messageBody: string,
    commentId: string,
    replyMode: string,
) {
    if (replyMode === "none") return;

    if (replyMode === "replybypm") {
        const subredditName =
            context.subredditName ??
            (await context.reddit.getCurrentSubredditName());
        try {
            await context.reddit.sendPrivateMessage({
                subject: `Message from r/${subredditName}`,
                text: messageBody,
                to: toUserName,
            });
            console.log(`${commentId}: PM sent to ${toUserName}.`);
        } catch {
            console.log(
                `${commentId}: Error sending PM to ${toUserName}. User may only allow PMs from whitelisted users.`,
            );
        }
    } else if (replyMode === "replybycomment") {
        const redisKey = `shouldComment:${commentId}`;
        const parentCommentRespondedTo = await context.redis.exists(redisKey);

        if (parentCommentRespondedTo) {
            logger.info(`Response sent, returning.`);
            return;
        }

        await context.redis.set(redisKey, "1");

        const newComment = await context.reddit.submitComment({
            id: commentId,
            text: messageBody,
        });
        await Promise.all([newComment.distinguish()]);
        console.log(
            `${commentId}: Public comment reply left for ${toUserName}`,
        );
    } else {
        console.warn(`${commentId}: Unknown replyMode "${replyMode}"`);
    }
}

export async function getParentComment(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<Comment | undefined> {
    let parentComment: Comment | undefined;
    if (!event.comment) return undefined;
    try {
        parentComment = await context.reddit.getCommentById(
            event.comment.parentId,
        );
        return parentComment;
    } catch {
        parentComment = undefined;
    }
    if (!parentComment) {
        return undefined;
    }
}
