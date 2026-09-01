import {
    AccessControlOptions,
    AppSetting,
    NotifyOnBlockedUserReplyOptions,
    NotifyOnDisallowedFlairReplyOptions,
    NotifyOnModAwardFailReplyOptions,
    NotifyOnModAwardSuccessReplyOptions,
    NotifyOnPointAlreadyAwardedToUserReplyOptions,
    NotifyOnSelfAwardReplyOptions,
    NotifyOnSuccessReplyOptions,
    NotifyOnTrustedUserAwardSuccessReplyOptions,
    NotifyOnUnflairedPostReplyOptions,
    TemplateDefaults,
} from "../config/settings";
import { formatMessage } from "../utils/formatting";
import {
    commentContainsUserCommand,
    getCurrentScore,
    getTriggers,
    modCommandValue,
    ScoreResult,
    setUserScore,
} from "../utils/common-utils";

import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import {
    TriggerContext,
    User,
    Comment,
    SettingsValues,
} from "@devvit/public-api";
import { logger } from "../utils/logger";
import {
    flairToggleKeyExists,
    getModDupKey,
    POINTS_STORE_KEY,
    setModDupKey,
} from "../database/redis";
import {
    CommentTriggerContext,
    getUserIsSuperuser,
    handleAutoSuperuserPromotion,
    isModerator,
} from "../config/commentTriggerContext";
import {
    buildInitialUserWiki,
    SafeWikiClient,
    updateUserWiki,
} from "../jobs/leaderboard";

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
        logger.warn("❌ Parent comment not found.");
        return undefined;
    }
}

export async function isSelfAwardModCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<boolean> {
    if (!event.author) return true;

    const parent = await getParentComment(event, context);
    if (!parent) return true;

    return parent.authorName === event.author.name;
}

async function handleSelfAwardModCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
) {
    const parentComment = await getParentComment(event, context);
    if (!event.author || !event.comment || !parentComment) return;
    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    const selfMsgTemplate =
        (settings[AppSetting.SelfAwardMessage] as string) ??
        TemplateDefaults.SelfAwardTemplate;
    const notifySelf = ((settings[
        AppSetting.NotifyOnSelfAward
    ] as string[]) ?? [NotifyOnSelfAwardReplyOptions.ReplyAsComment])[0];
    const awarder = event.author.name;
    const recipient = parentComment.authorName;
    if (awarder === recipient) {
        const selfText = formatMessage(event, selfMsgTemplate, {
            awarder,
            name: pointName,
        });
        if (notifySelf === NotifyOnSelfAwardReplyOptions.ReplyAsComment) {
            const selfAwardMessage = await context.reddit.submitComment({
                id: event.comment.id,
                text: selfText,
            });
            await selfAwardMessage.distinguish();
        } else if (notifySelf === NotifyOnSelfAwardReplyOptions.ReplyByPM) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                subject: `You tried to award yourself a ${pointName}`,
                text: selfText,
            });
        }
        logger.debug("❌ User tried to award themselves.");
        return;
    }

    logger.warn("❌ Mod attempted self-award", { awarder });
}

export async function isDuplicateModAward(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<boolean> {
    const key = await getModDupKey(event, context);
    const exists = await context.redis.exists(key);
    return exists === 1;
}

export async function handleDuplicateModAward(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
) {
    const parentComment = await getParentComment(event, context);
    if (!parentComment || !event.author || !event.comment) return;
    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    const awarder = event.author.name;
    const awardee = parentComment.authorName;

    const modAwardAlreadyGivenMessage = formatMessage(
        event,
        (settings[AppSetting.ModAwardAlreadyGivenMessage] as string) ??
            TemplateDefaults.ModAwardAlreadyGivenMessage,
        { awarder, awardee, name: pointName },
    );

    const notify = ((settings[AppSetting.NotifyOnModAwardFail] as string[]) ?? [
        "none",
    ])[0];

    if (notify === NotifyOnModAwardFailReplyOptions.ReplyAsComment) {
        const modAwardDupeMessage = await context.reddit.submitComment({
            id: event.comment!.id,
            text: modAwardAlreadyGivenMessage,
        });
        await modAwardDupeMessage.distinguish();
    } else if (notify === NotifyOnModAwardFailReplyOptions.ReplyByPM) {
        await context.reddit.sendPrivateMessage({
            to: awarder,
            subject: "Mod award already given",
            text: modAwardAlreadyGivenMessage,
        });
    }

    logger.info("❌ Duplicate mod award blocked", { awarder });
}

export async function handleUnauthorizedModCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    trigger: string,
) {
    const ctx = new CommentTriggerContext();
    await ctx.init(event, context);

    if (ctx.isMod || ctx.isSuperUser) return;

    const settings = await context.settings.getAll();
    const awarder = event.author!.name;
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    const failMsg = formatMessage(
        event,
        (settings[AppSetting.ModAwardCommandFailMessage] as string) ??
            TemplateDefaults.ModAwardCommandFailMessage,
        {
            command: trigger,
            name: pointName,
            awarder,
        },
    );

    const notify = ((settings[AppSetting.NotifyOnModAwardFail] as string[]) ?? [
        "none",
    ])[0];

    if (notify === NotifyOnModAwardFailReplyOptions.ReplyAsComment) {
        const modAwardFailMessage = await context.reddit.submitComment({
            id: event.comment!.id,
            text: failMsg,
        });
        await modAwardFailMessage.distinguish();
    } else if (notify === NotifyOnModAwardFailReplyOptions.ReplyByPM) {
        await context.reddit.sendPrivateMessage({
            to: awarder,
            subject: "Mod Award Command Not Allowed",
            text: failMsg,
        });
    }

    logger.warn("🚫 Unauthorized mod command", { awarder });
}

export async function InitialUserWikiOptions(
    context: TriggerContext,
    username: string,
) {
    logger.info("📂 InitialUserWikiOptions invoked", { username });

    const subredditName =
        context.subredditName ??
        (await context.reddit.getCurrentSubreddit()).name;

    const safeWiki = new SafeWikiClient(context.reddit);
    const wikiPath = `user/${username}`;

    logger.debug("📄 Checking existing user wiki page", {
        subredditName,
        wikiPath,
    });

    let existingPage = undefined;
    try {
        existingPage = await safeWiki.getWikiPage(subredditName, wikiPath);

        if (existingPage) {
            logger.info("ℹ️ Existing user wiki page found", { username });
        } else {
            logger.info("📘 No existing wiki page found — creating fresh", {
                username,
            });
        }
    } catch (err) {
        logger.error("❌ Error retrieving user wiki page", {
            username,
            error: String(err),
        });
    }

    // Build the initial page markdown
    const initialContent = await buildInitialUserWiki(context, username);

    logger.debug("📝 Built initial user wiki content", {
        username,
        length: initialContent.length,
    });

    // If exists, update; otherwise create
    try {
        if (!existingPage) {
            logger.info("📘 Creating new user wiki page", {
                username,
            });

            await safeWiki.createWikiPage({
                subredditName,
                page: wikiPath,
                content: initialContent,
                reason: "Initial user wiki page setup via menu option",
            });

            logger.info("✅ Successfully created user wiki page", {
                username,
            });
        } else {
            logger.info("✏️ Updating existing user wiki page", {
                username,
            });

            await context.reddit.updateWikiPage({
                subredditName,
                page: wikiPath,
                content: initialContent,
                reason: "Reset user wiki page to initial state",
            });

            logger.info("✅ User wiki page updated successfully", {
                username,
            });
        }
    } catch (err) {
        logger.error("❌ Failed to create/update user wiki page", {
            username,
            error: String(err),
        });
    }
}

export async function awardPointToUserModCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
) {
    if (!event.comment || !event.subreddit || !event.author || !event.post) {
        logger.warn("❌ Missing required event data", { event });
        return;
    }
    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    const awarder = event.author.name;

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(awarder);
    } catch {
        user = undefined;
    }

    if (!user) return;

    const commentorsCanReceivePointsOnCommenting = settings[
        AppSetting.AllowUsersToReceivePointsOnCommentSubmit
    ] as boolean | undefined;
    if (!commentorsCanReceivePointsOnCommenting) {
        logger.info("❌ Commentors cannot receive points on commenting", {
            OP: user.username,
            postId: event.post.id,
        });
        return;
    }

    const awardersScore = await getCurrentScore(user, context);

    if (!awardersScore) {
        logger.warn("❌ Could not retrieve awarder's score", {
            awarder: user.username,
        });
        return;
    }

    const awarderScore: ScoreResult = {
        score: awardersScore.score + 1,
    };

    setUserScore(context, user.username, awarderScore, settings);

    const parentComment = await getParentComment(event, context);
    if (!parentComment || !parentComment.authorId) {
        logger.warn("❌ Parent comment missing for mod award");
        return;
    }

    const awardee = parentComment.authorName;

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

    const recipientScore: ScoreResult = {
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
        recipientScore.score,
        modCommand,
    );
    await handleAutoSuperuserPromotion(
        event,
        context,
        awarderScore.score,
        modCommand,
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
        awarder,
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
        total: recipientScore.score.toString(),
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
            total: recipientScore.score.toString(),
            name: pointName,
            symbol: (settings[AppSetting.PointSymbol] as string) ?? "",
            leaderboard,
            awardeePage,
            awarderPage,
        },
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
            newScore: recipientScore.score,
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
            `user/${awarder.toLowerCase()}`,
        );
        const recipientPage = await safeWiki.getWikiPage(
            subredditName,
            `user/${awardee}`,
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
            "Flair handling is disabled for this user, skipping flair update",
        );
        return;
    }

    setUserScore(context, awardee, recipientScore, settings);
}

export async function executeModCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<boolean> {
    if (!event.comment || !event.author || !event.post) {
        return false;
    }

    const awarder = event.author.name;

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(awarder);
    } catch {
        user = undefined;
    }

    if (!user) {
        return false;
    }

    const body = (event.comment.body ?? "").toLowerCase();

    const triggers = await getTriggers(context);

    for (const trigger of triggers) {
        if (!new RegExp(trigger, "i").test(body)) {
            continue;
        }

        // if (await handleModIgnoredContextIfNeeded(event, context, trigger)) {
        //     return false;
        // }

        await handleUnauthorizedModCommand(event, context, trigger);

        if (await isSelfAwardModCommand(event, context)) {
            await handleSelfAwardModCommand(event, context);

            return false;
        }

        if (await isDuplicateModAward(event, context)) {
            await handleDuplicateModAward(event, context);

            return false;
        }

        await awardPointToUserModCommand(event, context);

        return true;
    }

    return false;
}

export async function handleIgnoredContext(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    trigger: string,
): Promise<void> {
    if (!event.comment || !event.author || !event.subreddit) return;

    const body = (event.comment.body ?? "").toLowerCase();
    const ignoredType = getIgnoredContextType(body, trigger);
    if (!ignoredType) return;

    const ignoreKey = `normalCommandIgnoreDM:${event.author.name.toLowerCase()}:${ignoredType}`;
    const alreadyConfirmed = await context.redis.exists(ignoreKey);

    if (alreadyConfirmed) return;

    const contextLabel =
        ignoredType === "quote"
            ? "a quote block (`> text`)"
            : ignoredType === "alt"
              ? "`alt text` (text surrounded by backticks (`))"
              : "a spoiler block (`>!text!<`)";

    const initialTriggerInContextLabelNotification = `Hey u/${event.author.name}, I noticed you used the command **${trigger}** inside ${contextLabel}.\n\n`;
    const confirmInfo = `Edit [this comment](${event.comment.permalink}) with **CONFIRM** if you intended to use the command this way and don't wish to be warned about this in the future.`;

    const dmText = formatMessage(
        event,
        initialTriggerInContextLabelNotification + confirmInfo,
        {},
    );

    await context.reddit.sendPrivateMessage({
        to: event.author.name,
        subject: `Your ${trigger} command was ignored`,
        text: dmText,
    });

    await context.redis.set(
        `pendingConfirm:${event.author.name.toLowerCase()}`,
        ignoredType,
    );

    logger.info("⚠️ Normal command ignored due to context", {
        user: event.author.name,
        trigger,
        ignoredType,
    });

    return;
}

export async function ignoredContextNeedsHandling(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    trigger: string,
): Promise<boolean> {
    if (!event.comment || !event.author || !event.subreddit) return false;

    const body = (event.comment.body ?? "").toLowerCase();
    const ignoredType = getIgnoredContextType(body, trigger);
    if (!ignoredType) return false;

    const ignoreKey = `normalCommandIgnoreDM:${event.author.name.toLowerCase()}:${ignoredType}`;
    const alreadyConfirmed = await context.redis.exists(ignoreKey);

    if (alreadyConfirmed) return true;

    return false;
}

export function getIgnoredContextType(
    commentBody: string,
    command: string,
): "quote" | "alt" | "spoiler" | "code_block" | undefined {
    const quoteBlock = `> .*${command}.*`;
    const altText = `\`.*${command}.*\``;
    const spoilerText = `>!.*${command}.*!<`;

    const patterns: { type: "quote" | "alt" | "spoiler"; regex: RegExp }[] = [
        { type: "quote", regex: new RegExp(`${quoteBlock}`, "i") },
        { type: "alt", regex: new RegExp(`${altText}`, "i") },
        { type: "spoiler", regex: new RegExp(`${spoilerText}`, "i") },
    ];

    for (const { type, regex } of patterns) {
        if (regex.test(commentBody)) return type;
    }
    return undefined;
}

export async function replyToUser(
    context: TriggerContext,
    notifyMode: string,
    recipient: string,
    message: string,
    commentId: string,
) {
    if (!notifyMode || notifyMode === "none") {
        logger.debug("ℹ️ replyToUser: notifyMode is none — skipping reply");
        return;
    }

    // 🚫 Prevent bot loops
    if (
        recipient.toLowerCase() === context.appSlug.toLowerCase() ||
        recipient.toLowerCase() === "automoderator"
    ) {
        logger.debug("🤖 replyToUser: recipient is bot/system — skipping");
        return;
    }

    // 🔑 One reply per comment + notify type
    const responseKey = `replyToUser:${notifyMode}:${commentId}`;
    if (await context.redis.exists(responseKey)) {
        logger.debug("♻️ replyToUser: response already sent", {
            commentId,
            notifyMode,
        });
        return;
    }

    try {
        if (notifyMode === "replybypm") {
            await context.reddit.sendPrivateMessage({
                to: recipient,
                subject: "Award not allowed",
                text: message,
            });

            logger.info("📬 replyToUser: sent PM", {
                recipient,
                commentId,
            });
        } else if (notifyMode === "replybycomment") {
            const reply = await context.reddit.submitComment({
                id: commentId,
                text: message,
            });
            await reply.distinguish();

            logger.info("💬 replyToUser: posted comment reply", {
                commentId,
            });
        } else {
            logger.warn("⚠️ replyToUser: unknown notifyMode", {
                notifyMode,
            });
            return;
        }

        // ✅ Mark handled AFTER success
        await context.redis.set(responseKey, "1");
    } catch (err) {
        logger.error("❌ replyToUser failed", {
            recipient,
            commentId,
            notifyMode,
            err,
        });
    }
}

export async function userHasPermission(
    event: CommentSubmit | CommentUpdate,
    awarderID: string,
    commentTriggerContext: CommentTriggerContext,
    context: TriggerContext,
    settings: SettingsValues,
): Promise<boolean> {
    if (!event.post || !event.comment) return false;

    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    const isMod = commentTriggerContext.isMod;
    const isSuperUser = commentTriggerContext.isSuperUser;
    const isOP = awarderID === event.post.authorId;

    const accessControl = ((settings[AppSetting.AccessControl] as string[]) ?? [
        "everyone",
    ])[0];

    const hasPermission =
        accessControl === AccessControlOptions.Everyone ||
        (accessControl === AccessControlOptions.ModsOnly && isMod) ||
        (accessControl === AccessControlOptions.ModsAndSuperusers &&
            (isMod || isSuperUser)) ||
        (accessControl === AccessControlOptions.ModsSuperusersAndPostAuthor &&
            (isMod || isSuperUser || isOP)) ||
        (accessControl === AccessControlOptions.ModsAndPostAuthor &&
            (isMod || isOP));

    logger.debug("Permission check", {
        accessControl,
        isMod,
        isSuperUser,
        isOP,
        hasPermission,
    });

    if (!hasPermission) {
        let msgKey: AppSetting;
        let notifyKey: AppSetting;

        switch (accessControl) {
            case AccessControlOptions.ModsOnly:
                msgKey = AppSetting.ModOnlyDisallowedMessage;
                notifyKey = AppSetting.NotifyOnModOnlyDisallowed;
                break;

            case AccessControlOptions.ModsAndSuperusers:
                msgKey = AppSetting.ApprovedOnlyDisallowedMessage;
                notifyKey = AppSetting.NotifyOnApprovedOnlyDisallowed;
                break;

            case AccessControlOptions.ModsSuperusersAndPostAuthor:
                msgKey = AppSetting.OPOnlyDisallowedMessage;
                notifyKey = AppSetting.NotifyOnOPOnlyDisallowed;
                break;

            case AccessControlOptions.ModsAndPostAuthor:
                msgKey = AppSetting.ModsAndPostAuthorDisallowedMessage;
                notifyKey = AppSetting.NotifyOnModsAndPostAuthorDisallowed;
                break;

            default:
                logger.warn("⚠️ Unknown accessControl value", {
                    accessControl,
                });
                return false;
        }

        const denyMsg = formatMessage(
            event,
            (settings[msgKey] as string) ??
                TemplateDefaults.ModOnlyDisallowedMessage,
            {
                awarder: awarderID,
                name: pointName,
            },
        );

        const notifyMode = ((settings[notifyKey] as string[]) ?? ["none"])[0];

        await replyToUser(
            context,
            notifyMode ?? "none",
            awarderID,
            denyMsg,
            event.comment.id,
        );

        return false;
    }

    return true;
}

export async function unflairedPostLogic(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    awarder: string,
    settings: SettingsValues,
) {
    if (!event.post || !event.comment || !event.author || !event.subreddit)
        return;

    const allowUnflairedPosts =
        (settings[AppSetting.AllowUnflairedPosts] as boolean) ?? true;

    const unflairedMessage =
        (settings[AppSetting.UnflairedPostMessage] as string) ??
        TemplateDefaults.UnflairedPostMessage;

    const notifyUnflaired = ((settings[
        AppSetting.NotifyOnUnflairedPost
    ] as string[]) ?? [NotifyOnUnflairedPostReplyOptions.ReplyAsComment])[0];

    if (!event.post.linkFlair) {
        logger.error(`linkFlair doesn't exist`, {
            linkFlair: event.post.linkFlair,
        });
        return;
    }

    const postFlairText = event.post.linkFlair?.text?.trim();

    // 🚫 Unflaired posts not allowed
    if (!allowUnflairedPosts && postFlairText === "") {
        // 🚫 Ignore bot’s own comments to prevent loops
        if (event.author.name === context.appSlug) {
            logger.debug(
                "🤖 Bot-authored comment detected; skipping unflaired-post response",
            );
            return;
        }

        // 🔑 One response per award attempt (per comment)
        const responseKey = `unflairedResponse:${event.comment.id}`;

        if (await context.redis.exists(responseKey)) {
            logger.debug("ℹ️ Unflaired post response already sent — skipping", {
                commentId: event.comment.id,
            });
            return;
        }

        logger.info("🚫 Award blocked — post is unflaired", {
            awarder,
            postId: event.post.id,
            commentId: event.comment.id,
            notifyUnflaired,
        });

        try {
            if (
                notifyUnflaired === NotifyOnUnflairedPostReplyOptions.ReplyByPM
            ) {
                await context.reddit.sendPrivateMessage({
                    to: awarder,
                    subject: `Awards disabled for unflaired posts`,
                    text: unflairedMessage,
                });
            } else if (
                notifyUnflaired ===
                NotifyOnUnflairedPostReplyOptions.ReplyAsComment
            ) {
                const unflairedPostMessage = await context.reddit.submitComment(
                    {
                        id: event.comment.id,
                        text: unflairedMessage,
                    },
                );
                await unflairedPostMessage.distinguish();
            }
        } catch (err) {
            logger.error(
                "❌ Failed to notify user about unflaired post restriction",
                { awarder, commentId: event.comment.id, err },
            );
        }

        await context.redis.set(responseKey, "1");
        return; // ⛔ Stop award flow ONLY for unflaired posts
    }
}

export async function flairTextNotAllowedLogic(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    awarder: string,
    commentBody: string,
    triggerUsed: string,
    settings: SettingsValues,
) {
    if (!event.post || !event.comment || !event.author) return;
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    const flairTextDisallowedMessage = formatMessage(
        event,
        (settings[AppSetting.DisallowedFlairMessage] as string) ??
            TemplateDefaults.DisallowedFlairMessage,
        { name: pointName },
    );
    const postFlairText = event.post.linkFlair?.text?.trim();

    const notifyFlairIgnored = ((settings[
        AppSetting.NotifyOnDisallowedFlair
    ] as string[]) ?? [NotifyOnDisallowedFlairReplyOptions.ReplyAsComment])[0];

    // ─────────────────────────────────────────────
    // Disallowed flair guard (non-terminating)
    // ─────────────────────────────────────────────

    if (
        (settings[AppSetting.DisallowedFlairs] as string).includes(
            postFlairText ?? "",
        )
    ) {
        logger.error(
            `User attempted to award points on flair-disallowed post, but it's not allowed`,
            { linkFlair: event.post.linkFlair },
        );
        return;
    }

    if (!postFlairText) return;

    const rawDisallowedFlairs =
        (settings[AppSetting.DisallowedFlairs] as string | undefined) ?? "";

    const disallowedFlairs = rawDisallowedFlairs
        .split(/\r?\n/) // newline-only entries
        .map((flair) => flair.trim())
        .filter(Boolean);

    if (
        disallowedFlairs.length !== 0 &&
        disallowedFlairs.includes(postFlairText)
    ) {
        logger.debug("🔍 Disallowed flair check", {
            postFlair: postFlairText,
            disallowedFlairs,
        });

        if (!triggerUsed || !commentBody.includes(triggerUsed)) {
            logger.info(`Comment in disallowed flair, but not a command`);
            return;
        }

        if (event.author.name === context.appSlug) {
            // 🚫 Ignore bot’s own comments to prevent loops
            logger.debug(
                "🤖 Bot-authored comment detected; skipping disallowed flair response",
            );
            return;
        }

        const responseKey = `disallowedFlairResponse:${event.comment.id}`;

        if (await context.redis.exists(responseKey)) {
            logger.debug(
                "♻️ Disallowed flair already handled for this comment",
                {
                    commentId: event.comment.id,
                },
            );
            return;
        }

        // Mark handled BEFORE replying
        await context.redis.set(responseKey, "1");

        logger.info("🚫 Award blocked due to disallowed flair", {
            postFlair: postFlairText,
        });

        if (
            notifyFlairIgnored === NotifyOnDisallowedFlairReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                subject: `${pointName}s cannot be awarded on ${event.post.title}`,
                text: flairTextDisallowedMessage,
            });
        } else if (
            notifyFlairIgnored ===
            NotifyOnDisallowedFlairReplyOptions.ReplyAsComment
        ) {
            const disallowedFlairMessage = await context.reddit.submitComment({
                id: event.comment.id,
                text: flairTextDisallowedMessage,
            });
            await disallowedFlairMessage.distinguish();
        }
        return; // ⛔ block award
    }
}

export async function selfAwardAttemptLogic(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    awarder: string,
    recipient: string,
    settings: SettingsValues,
) {
    if (!event.comment || !event.author) return;
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    const selfMsgTemplate =
        (settings[AppSetting.SelfAwardMessage] as string) ??
        TemplateDefaults.SelfAwardTemplate;
    const notifySelf = ((settings[
        AppSetting.NotifyOnSelfAward
    ] as string[]) ?? [NotifyOnSelfAwardReplyOptions.ReplyAsComment])[0];
    if (awarder === recipient) {
        const selfText = formatMessage(event, selfMsgTemplate, {
            awarder,
            name: pointName,
        });
        if (notifySelf === NotifyOnSelfAwardReplyOptions.ReplyAsComment) {
            const selfAwardMessage = await context.reddit.submitComment({
                id: event.comment.id,
                text: selfText,
            });
            await selfAwardMessage.distinguish();
        } else if (notifySelf === NotifyOnSelfAwardReplyOptions.ReplyByPM) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                subject: `You tried to award yourself a ${pointName}`,
                text: selfText,
            });
        }
        logger.debug("❌ User tried to award themselves.");
        return;
    }
}

/**
 * Awards a point to a normal user and performs all success side-effects.
 */
async function awardPointToUserNormalCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    awarder: string,
    recipient: User | undefined,
) {
    const parentComment = await getParentComment(event, context);
    if (!parentComment || !event.subreddit || !event.comment || !event.post)
        return;

    const awardee = parentComment.authorName;
    const settings = await context.settings.getAll();
    const awardKey = `userCommand:${recipient?.username}-${event.comment.id}`;

    // Mark as awarded
    await context.redis.set(awardKey, "1");

    if (!recipient) {
        logger.warn("❌ Recipient user not found", {
            awardee,
            awarder,
        });
        return;
    }

    const existingScore = await getCurrentScore(recipient, context);

    if (!existingScore) {
        logger.warn("❌ Could not retrieve existing score for user", {
            awardee,
            awarder,
        });
        return;
    }

    const newScore: ScoreResult = {
        score: existingScore.score + 1,
        userHasFlair: existingScore.userHasFlair,
        flairIsNumber: existingScore.flairIsNumber,
    };

    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    const pointSymbol = (settings[AppSetting.PointSymbol] as string) ?? "";
    const notifySuccess =
        (settings[AppSetting.NotifyOnSuccess] as string[])?.[0] ??
        NotifyOnSuccessReplyOptions.NoReply;

    const leaderboard = `https://old.reddit.com/r/${
        event.subreddit.name
    }/wiki/${settings[AppSetting.LeaderboardName] ?? "leaderboard"}`;

    const awardeePage = `https://old.reddit.com/r/${event.subreddit.name}/wiki/user/${recipient.username}`;
    const awarderPage = `https://old.reddit.com/r/${event.subreddit.name}/wiki/user/${awarder}`;

    const successMessage = formatMessage(
        event,
        (settings[AppSetting.SuccessMessage] as string) ??
            TemplateDefaults.NotifyOnNormalAwardSuccessTemplate,
        {
            awardee,
            awarder,
            total: newScore.score.toString(),
            name: pointName,
            symbol: pointSymbol,
            leaderboard,
            awardeePage,
            awarderPage,
        },
    );

    if (notifySuccess === NotifyOnSuccessReplyOptions.ReplyByPM) {
        await Promise.all([
            context.reddit.sendPrivateMessage({
                to: awarder,
                subject: `You awarded a ${pointName}`,
                text: successMessage,
            }),
            context.reddit.sendPrivateMessage({
                to: awardee,
                subject: `You were awarded a ${pointName}`,
                text: successMessage,
            }),
        ]);
    } else if (notifySuccess === NotifyOnSuccessReplyOptions.ReplyAsComment) {
        const commandSuccessMessage = await context.reddit.submitComment({
            id: event.comment.id,
            text: successMessage,
        });
        await commandSuccessMessage.distinguish();
    }

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(awarder);
    } catch {
        user = undefined;
    }
    if (!user) return;

    logger.info(`✅ Awarded 1 point to ${recipient.username} from ${awarder}`, {
        newScore,
    });

    let userObj: User | undefined;

    try {
        userObj = await context.reddit.getUserByUsername(awardee);
    } catch {}

    if (!userObj) {
        logger.error(
            "Failed to fetch user for flair update after normal award",
        );
        return;
    }

    const flairHandlingDisabled = await flairToggleKeyExists(context, userObj);

    if (flairHandlingDisabled) {
        logger.info(
            "Flair handling is disabled for this user, skipping flair update",
        );
        return;
    }

    setUserScore(context, awardee, newScore, settings);
}

/**
 * Executes the user command workflow.
 */
export async function executeUserCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<boolean> {
    const parentComment = await getParentComment(event, context);

    if (
        !event.author ||
        !event.comment ||
        !event.post ||
        !event.subreddit ||
        !parentComment
    ) {
        logger.warn("❌ Missing required event data", { event });
        return false;
    }

    const commentBody = event.comment.body;
    const awarder = event.author.name;
    const recipient = parentComment.authorName;
    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(awarder);
    } catch {
        user = undefined;
    }

    if (!user) return false;

    const allTriggers = await getTriggers(context);

    const triggerUsed = allTriggers.find((t) =>
        new RegExp(`^${t}`, "i").test(commentBody),
    );

    if (!triggerUsed) return false;

    // 🚫 Blocked users
    const blockedUsers = (
        (settings[AppSetting.UsersWhoCannotAwardPoints] as string) ?? ""
    )
        .split(/\r?\n/)
        .map((w) => w.trim())
        .filter(Boolean);

    if (blockedUsers.includes(awarder)) {
        const blockedTemplate =
            (settings[AppSetting.UsersWhoCannotAwardPointsMessage] as string) ??
            TemplateDefaults.UsersWhoCannotAwardPointsMessage;

        const notifyBlockedUserMode = (
            settings[AppSetting.NotifyOnBlockedUser] as string[]
        )?.[0];

        const blockedMessage = formatMessage(event, blockedTemplate, {
            name: pointName,
            awarder,
            subreddit: event.subreddit.name,
        });

        if (
            notifyBlockedUserMode ===
            NotifyOnBlockedUserReplyOptions.ReplyAsComment
        ) {
            const userIsBlockedFromAwardingPointsMessage =
                await context.reddit.submitComment({
                    id: event.comment.id,
                    text: blockedMessage,
                });

            await userIsBlockedFromAwardingPointsMessage.distinguish();
        } else if (
            notifyBlockedUserMode === NotifyOnBlockedUserReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                text: blockedMessage,
                subject:
                    `You do not have permission to award ${pointName}s ` +
                    `in r/${event.subreddit.name}`,
            });
        }

        return false;
    }

    // 🛑 Self award check
    if (awarder === recipient) {
        const selfAwardTemplate = formatMessage(
            event,
            (settings[AppSetting.SelfAwardMessage] as string) ??
                TemplateDefaults.SelfAwardMessage,
            {
                awarder,
                name: pointName,
            },
        );

        const notifyNormalSelfAwardMode = (
            settings[AppSetting.NotifyOnSelfAward] as string[]
        )?.[0];

        if (
            notifyNormalSelfAwardMode ===
            NotifyOnSelfAwardReplyOptions.ReplyAsComment
        ) {
            const selfAwardComment = await context.reddit.submitComment({
                id: event.comment.id,
                text: selfAwardTemplate,
            });

            await selfAwardComment.distinguish();
        } else if (
            notifyNormalSelfAwardMode ===
            NotifyOnSelfAwardReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                text: selfAwardTemplate,
                subject: `You tried to award yourself a ${pointName}`,
            });
        }

        return false;
    }

    // 🛑 Duplicate award check
    const key = `userAwardGiven:${parentComment.id}:${event.post.id}:${event.subreddit.name}`;

    const alreadyAwarded = await context.redis.exists(key);

    if (alreadyAwarded) {
        const alreadyAwardedTemplate = formatMessage(
            event,
            (settings[AppSetting.PointAlreadyAwardedToUserMessage] as string) ??
                TemplateDefaults.PointAlreadyAwardedToUserMessage,
            {
                awarder,
                awardee: recipient,
                name: pointName,
            },
        );

        const notifyMode = (
            settings[AppSetting.NotifyOnPointAlreadyAwardedToUser] as string[]
        )?.[0];

        if (
            notifyMode ===
            NotifyOnPointAlreadyAwardedToUserReplyOptions.ReplyAsComment
        ) {
            const alreadyAwardedMessage = await context.reddit.submitComment({
                id: event.comment.id,
                text: alreadyAwardedTemplate,
            });

            await alreadyAwardedMessage.distinguish();
        } else if (
            notifyMode ===
            NotifyOnPointAlreadyAwardedToUserReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                subject:
                    `[This comment](${parentComment.permalink}) ` +
                    `has already received a ${pointName}`,
                text: alreadyAwardedTemplate,
            });
        }

        logger.info("⚠️ Point already awarded for this command", {
            awarder,
            recipient,
        });

        return false;
    }

    logger.info(`Point not awarded yet for this command`);

    await context.redis.set(key, "1");

    // 📘 Always update both user wiki pages on successful award
    try {
        const subredditName = event.subreddit.name;

        const safeWiki = new SafeWikiClient(context.reddit);

        const awarderWiki = await safeWiki.getWikiPage(
            subredditName,
            `user/${awarder.toLowerCase()}`,
        );

        const recipientWiki = await safeWiki.getWikiPage(
            subredditName,
            `user/${recipient}`,
        );

        if (!awarderWiki) {
            await InitialUserWikiOptions(context, awarder);
        }

        if (!recipientWiki) {
            await InitialUserWikiOptions(context, recipient);
        }

        const givenData = {
            postTitle: event.post.title,
            postUrl: event.post.permalink,
            recipient,
            commentUrl: event.comment.permalink,
        };

        await updateUserWiki(context, awarder, recipient, givenData);
    } catch (err) {
        logger.error("❌ Failed to update user wiki (Normal award)", {
            awarder,
            recipient,
            err,
        });
    }

    let awardee: User | undefined;

    try {
        awardee = await context.reddit.getUserByUsername(recipient);
    } catch {
        awardee = undefined;
    }

    if (!awardee) return false;

    // 🏆 Award point + side effects
    await awardPointToUserNormalCommand(event, context, awarder, awardee);

    // Auto Superuser logic
    const commandUsed =
        (settings[AppSetting.PointTriggerWords] as string) ?? "!award\n.award";

    const currentScore =
        ((await context.redis.zScore(POINTS_STORE_KEY, recipient)) as number) ??
        0;

    await handleAutoSuperuserPromotion(
        event,
        context,
        currentScore,
        commandUsed,
    );

    return true;
}

export async function recipientIsBot(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    awarder: string,
    recipient: string,
    settings: SettingsValues,
) {
    if (!event.comment) return;
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    if (
        ["automoderator", context.appSlug.toLowerCase()].includes(
            awarder.toLowerCase(),
        )
    ) {
        logger.debug("❌ System user attempted a command");
        return;
    }

    if (
        ["automoderator", context.appSlug.toLowerCase()].includes(
            recipient.toLowerCase(),
        )
    ) {
        // Prevent bot account or Automod granting points
        const botAwardMessage = formatMessage(
            event,
            (settings[AppSetting.BotAwardMessage] as string) ??
                TemplateDefaults.BotAwardMessage,
            { name: pointName, awardee: recipient },
        );

        const awardGivenToBotMessage = await context.reddit.submitComment({
            id: event.comment.id,
            text: botAwardMessage,
        });
        await awardGivenToBotMessage.distinguish();
        logger.debug("❌ Bot cannot award itself points");
        return;
    }
}

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

    const commentorsCanReceivePointsOnCommenting = settings[
        AppSetting.AllowUsersToReceivePointsOnCommentSubmit
    ] as boolean | undefined;
    if (!commentorsCanReceivePointsOnCommenting) {
        logger.info("❌ Commentors cannot receive points on commenting", {
            OP: user.username,
            postId: event.post.id,
        });
        return;
    } else {
        logger.info("✅ Commentors can receive points on commenting", {
            OP: user.username,
            postId: event.post.id,
        });
    }

    const awardersScore = await getCurrentScore(user, context);

    if (!awardersScore) {
        logger.warn("❌ Could not retrieve awarder's score", {
            awarder: user.username,
        });
        return;
    }

    const awarderScore: ScoreResult = {
        score: awardersScore.score + 1,
    };

    setUserScore(context, user.username, awarderScore, settings);
    if (!parentComment) {
        logger.warn("❌ Parent comment not found", {
            commentId: event.comment.id,
        });
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
        triggerUsed,
        settings,
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
