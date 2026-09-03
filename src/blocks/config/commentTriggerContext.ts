import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { Comment, TriggerContext, User } from "@devvit/public-api";
import {
    AppSetting,
    AutoSuperuserReplyOptions,
    TemplateDefaults,
} from "./settings";
import { formatMessage } from "../utils/formatting";
import { logger } from "../utils/logger";
import { getCurrentScore } from "../utils/common-utils";

export async function handleAutoSuperuserPromotion(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    newScore: number,
) {
    const parentComment = await getParentComment(event, context);
    if (!event.author || !parentComment || !event.subreddit) return;
    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    const awarder = event.author.name;
    const awardee = parentComment.authorName;
    const threshold =
        (settings[AppSetting.AutoSuperuserThreshold] as number) ?? 0;

    if (threshold <= 0 || newScore < threshold) return;

    if (await context.redis.exists(`superUserHandled:${awardee}`)) {
        logger.info(`User has already been notified they are a superuser`, {
            awardee,
            threshold,
        });
        return;
    }

    await context.redis.set(`superUserHandled:${awardee}`, "1");

    const notifyMode =
        (settings[AppSetting.NotifyOnAutoSuperuser] as string[])?.[0] ??
        AutoSuperuserReplyOptions.NoReply;

    if (notifyMode === AutoSuperuserReplyOptions.NoReply) return;

    const superUserNotification = formatMessage(
        event,
        (settings[AppSetting.AutoSuperuserTemplate] as string) ??
            TemplateDefaults.NotifyOnSuperuserTemplate,
        {
            awardee,
            awarder,
            name: pointName,
            threshold: threshold.toString(),
            command: (settings[AppSetting.ModAwardCommand] as string) ?? "",
        },
    );

    try {
        // if (notifyMode === AutoSuperuserReplyOptions.ReplyByPM) {
        await context.reddit.sendPrivateMessage({
            to: awardee,
            subject: `You are now a trusted user in r/${event.subreddit.name}`,
            text: superUserNotification,
        });
        // } else if (notifyMode === AutoSuperuserReplyOptions.ReplyAsComment) {
        //     const superUserNotificationMessage = await context.reddit.submitComment({
        //         id: commentId,
        //         text: superUserNotification,
        //     });
        //     await superUserNotificationMessage.distinguish();
        // }

        logger.info("⭐ Auto-superuser notification sent", {
            awardee,
            newScore,
        });
    } catch (err) {
        logger.error("❌ Failed auto-superuser notification", {
            awardee,
            err,
        });
    }
}

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

export async function userBecomesSuperUser(
    event: CommentSubmit | CommentUpdate,
    userScore: number,
    context: TriggerContext,
) {
    if (!event.comment) return;
    if (!event.author) return;

    const parentComment = await getParentComment(event, context);
    if (!parentComment) return;

    const recipient = parentComment.authorName;
    const recipientUser = await context.reddit.getUserByUsername(recipient);
    if (!recipientUser) return;

    const settings = await context.settings.getAll();

    const autoSuperuserThreshold =
        (settings[AppSetting.AutoSuperuserThreshold] as number | undefined) ??
        0;
    const superUserCommand =
        (settings[AppSetting.ModAwardCommand] as string) ?? "";
    const notifyOnAutoSuperuserMode = ((settings[
        AppSetting.NotifyOnAutoSuperuser
    ] as string[] | undefined) ?? [
        AutoSuperuserReplyOptions.NoReply,
    ])[0] as AutoSuperuserReplyOptions;
    if (
        autoSuperuserThreshold &&
        userScore === autoSuperuserThreshold &&
        notifyOnAutoSuperuserMode !== AutoSuperuserReplyOptions.NoReply
    ) {
        console.log(
            `${event.comment.id}: ${recipientUser.username} has reached the auto superuser threshold. Notifying.`,
        );
        (settings[AppSetting.AutoSuperuserTemplate] as string | undefined) ??
            TemplateDefaults.NotifyOnSuperuserTemplate;
        const autoSuperUserMessage = formatMessage(
            event,
            (settings[AppSetting.AutoSuperuserTemplate] as string) ??
                TemplateDefaults.NotifyOnSuperuserTemplate,
            {
                awarder: event.author.name,
                awardee: recipient,
                threshold: autoSuperuserThreshold.toString(),
                command: superUserCommand,
            },
        );

        await _replyToUser(
            context,
            recipient,
            autoSuperUserMessage,
            parentComment.id,
            notifyOnAutoSuperuserMode,
        );
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
