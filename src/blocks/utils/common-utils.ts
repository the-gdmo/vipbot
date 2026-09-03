import { logger } from "./logger";
import {
    AccessControlOptions,
    AppSetting,
    ExistingFlairOverwriteHandling,
    NotifyOnDisallowedFlairReplyOptions,
    NotifyOnSelfAwardReplyOptions,
    NotifyOnSuccessReplyOptions,
    NotifyOnUnflairedPostReplyOptions,
    TemplateDefaults,
} from "../config/settings";
import {
    SettingsValues,
    TriggerContext,
    User,
    Comment,
} from "@devvit/public-api";
import { POINTS_STORE_KEY } from "../config/constants";
import { CommentSubmit, CommentUpdate, PostSubmit } from "@devvit/protos";
import { setCleanupForUsers } from "../jobs/cleanup";
import { flairToggleKeyExists } from "../database/redis";
import { formatFlair, formatMessage } from "./formatting";
import { buildInitialUserWiki, SafeWikiClient } from "../jobs/leaderboard";
import { getLevelFromScore, getRankFromScore } from "../database/levels";
import {
    getUserIsSuperuser,
    isModerator,
} from "../config/commentTriggerContext";

export interface ScoreResult {
    score: number;
    place?: number;
    userHasFlair: boolean;
    flairIsNumber: boolean;
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
    context: TriggerContext,
    settings: SettingsValues,
): Promise<boolean> {
    if (!event.post || !event.comment || !context.subredditName) return false;

    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    const isMod = await isModerator(context, context.subredditName, awarderID);
    const isSuperUser = await getUserIsSuperuser(context, awarderID);
    const isOP = awarderID === event.post.authorId;

    const accessControl = ((settings[AppSetting.AccessControl] as string[]) ?? [
        "everyone",
    ])[0];

    const hasPermission =
        accessControl === AccessControlOptions.Everyone ||
        (accessControl === AccessControlOptions.ModsOnly && isMod) ||
        (accessControl === AccessControlOptions.ModsAndVIPS &&
            (isMod || isSuperUser)) ||
        (accessControl === AccessControlOptions.ModsVIPSAndPostAuthor &&
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

            case AccessControlOptions.ModsAndVIPS:
                msgKey = AppSetting.ApprovedOnlyDisallowedMessage;
                notifyKey = AppSetting.NotifyOnApprovedOnlyDisallowed;
                break;

            case AccessControlOptions.ModsVIPSAndPostAuthor:
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
    settings: SettingsValues,
    triggerUsed?: string,
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
    ] as string[]) ?? [NotifyOnDisallowedFlairReplyOptions.NoReply])[0];

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
export async function awardPointToUserNormalCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    awarder: string,
    recipient: User | undefined,
    increment: number,
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
        score: existingScore.score + increment,
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

    setUserScoreOnCommentSubmit(event, context, awardee, newScore, settings);
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

export async function setUserScoreOnPostSubmit(
    event: PostSubmit,
    context: TriggerContext,
    username: string,
    newScore: ScoreResult,
    appSettings: SettingsValues,
) {
    if (!event.author || !event.post) return;
    // Queue user for cleanup checks in 24 hours, overwriting existing value.
    await setCleanupForUsers([username], context);
    const settings = await context.settings.getAll();
    const OP = event.author.name;

    const existingFlairOverwriteHandling =
        (appSettings[AppSetting.ExistingFlairHandling] as
            | ExistingFlairOverwriteHandling
            | undefined) ?? ExistingFlairOverwriteHandling.OverwriteNumeric;

    let shouldSetUserFlair: boolean | undefined;
    if (
        existingFlairOverwriteHandling ===
            ExistingFlairOverwriteHandling.OverwriteNumericSymbol ||
        existingFlairOverwriteHandling ===
            ExistingFlairOverwriteHandling.OverwriteNumeric
    ) {
        shouldSetUserFlair = true;
    } else if (
        existingFlairOverwriteHandling ===
        ExistingFlairOverwriteHandling.NeverSet
    ) {
        shouldSetUserFlair = false;
    } else {
        shouldSetUserFlair = !newScore.userHasFlair || newScore.flairIsNumber;
    }

    if (shouldSetUserFlair) {
        console.log(
            `Setting points flair for ${username}. New score: ${newScore.score}`,
        );

        let cssClass = appSettings[AppSetting.CSSClass] as string | undefined;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (!cssClass) {
            cssClass = undefined;
        }

        let flairTemplate = appSettings[AppSetting.FlairTemplate] as
            | string
            | undefined;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (!flairTemplate) {
            flairTemplate = undefined;
        }

        if (flairTemplate && cssClass) {
            // Prioritise flair templates over CSS classes.
            cssClass = undefined;
        }

        const flairTextTemplate = "{points}";

        if (!context.subredditName) {
            logger.error(
                "❌ No subreddit name found in context, cannot set user flair",
            );
            return;
        }

        const key = `flairToggle:${username}`;
        const exists = await context.redis.exists(key);

        const flairFormatting =
            (appSettings[AppSetting.FlairFormatting] as string) ??
            TemplateDefaults.FlairFormatting;

        const redisKey = POINTS_STORE_KEY;
        const leaderboard = await context.redis.zRange(redisKey, 0, -1, {
            by: "rank",
            reverse: true,
        });

        const index = leaderboard.findIndex(
            (member) => member.member === username,
        );

        const userRank = index >= 0 ? index + 1 : undefined;
        if (!userRank) {
            logger.error(`Couldn't find user's rank`, {
                authorId: event.post.authorId,
            });
            return;
        }
        const flairText = formatFlair(flairFormatting, {
            place: userRank > 0 ? `${userRank}` : "0",
            total: newScore.score.toString(),
            symbol: appSettings[AppSetting.PointSymbol] as string,
            level: (
                await getLevelFromScore(context, username, newScore.score)
            ).toString(),
            rank: await getRankFromScore(context, username, newScore.score),
        });

        const shouldIncrementOnCommentSubmit =
            (settings[AppSetting.CommentIncrement] as number) ?? 0;
        if (shouldIncrementOnCommentSubmit < 0) {
            logger.info("Setting user flair", {
                username,
                newScore: newScore.score,
                cssClass,
                flairTemplate,
                flairText,
                subreddit: context.subredditName,
            });

            await context.reddit.setUserFlair({
                subredditName: context.subredditName,
                username,
                cssClass,
                flairTemplateId: flairTemplate,
                text: flairText,
            });
            logger.info(`Updating user's flair`, { flairText });
            return;
        }

        if (exists) {
            logger.debug("❌ Flair should not be set, skipping", {
                username,
                newScore: newScore.score,
                cssClass,
                flairTemplate,
                flairTextTemplate,
                subreddit: context.subredditName,
            });
            return;
        }

        logger.debug("User leaderboard rank", {
            username,
            rank: userRank,
            totalUsers: leaderboard.length,
        });

        logger.debug("Checking values", {
            userRank,
            newScore: newScore.score,
        });

        if (!userRank) {
            logger.error(`userRank not found, returning.`);
            return;
        }

        let user: User | undefined;

        try {
            user = await context.reddit.getUserByUsername(username);
        } catch {
            //
        }

        if (!user) {
            logger.error(`No user found, returning.`);
            return;
        }

        const currentScore = await getCurrentScore(user, context);

        if (!currentScore) {
            logger.error(`No current score found for user, returning.`, {
                user,
            });
            return;
        }

        await recipientIsBot(event, context, OP, OP, settings);

        logger.info("Setting user flair", {
            username,
            newScore: newScore.score,
            cssClass,
            flairTemplate,
            flairText,
            subreddit: context.subredditName,
        });

        await context.reddit.setUserFlair({
            subredditName: context.subredditName,
            username,
            cssClass,
            flairTemplateId: flairTemplate,
            text: flairText,
        });
    } else {
        console.log(
            `${username}: Flair not set (option disabled or flair in wrong state)`,
        );
    }
}

export async function setUserScoreOnCommentSubmit(
    event: CommentSubmit,
    context: TriggerContext,
    username: string,
    newScore: ScoreResult,
    appSettings: SettingsValues,
) {
    const parentComment = await getParentComment(event, context);
    if (!event.comment || !event.author || !parentComment) return;
    // Queue user for cleanup checks in 24 hours, overwriting existing value.
    await setCleanupForUsers([username], context);
    const settings = await context.settings.getAll();
    const awarder = event.author.name;
    const commentBody = event.comment.body.toLowerCase();
    const triggers = await getTriggers(context);
    const triggerUsed = triggers.find((t) => commentBody.includes(t));
    const awardee = parentComment.authorName;
    if (!awardee) {
        logger.warn("❌ No recipient found", { parentComment });
        return;
    }

    const existingFlairOverwriteHandling =
        (appSettings[AppSetting.ExistingFlairHandling] as
            | ExistingFlairOverwriteHandling
            | undefined) ?? ExistingFlairOverwriteHandling.OverwriteNumeric;

    let shouldSetUserFlair: boolean | undefined;
    if (
        existingFlairOverwriteHandling ===
            ExistingFlairOverwriteHandling.OverwriteNumericSymbol ||
        existingFlairOverwriteHandling ===
            ExistingFlairOverwriteHandling.OverwriteNumeric
    ) {
        shouldSetUserFlair = true;
    } else if (
        existingFlairOverwriteHandling ===
        ExistingFlairOverwriteHandling.NeverSet
    ) {
        shouldSetUserFlair = false;
    } else {
        shouldSetUserFlair = !newScore.userHasFlair || newScore.flairIsNumber;
    }

    if (shouldSetUserFlair) {
        console.log(
            `Setting points flair for ${username}. New score: ${newScore.score}`,
        );

        let cssClass = appSettings[AppSetting.CSSClass] as string | undefined;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (!cssClass) {
            cssClass = undefined;
        }

        let flairTemplate = appSettings[AppSetting.FlairTemplate] as
            | string
            | undefined;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (!flairTemplate) {
            flairTemplate = undefined;
        }

        if (flairTemplate && cssClass) {
            // Prioritise flair templates over CSS classes.
            cssClass = undefined;
        }

        const flairTextTemplate = "{points}";

        if (!context.subredditName) {
            logger.error(
                "❌ No subreddit name found in context, cannot set user flair",
            );
            return;
        }

        const key = `flairToggle:${username}`;
        const exists = await context.redis.exists(key);

        const flairFormatting =
            (appSettings[AppSetting.FlairFormatting] as string) ??
            TemplateDefaults.FlairFormatting;

        const redisKey = POINTS_STORE_KEY;
        const leaderboard = await context.redis.zRange(redisKey, 0, -1, {
            by: "rank",
            reverse: true,
        });

        const index = leaderboard.findIndex(
            (member) => member.member === username,
        );

        const userRank = index >= 0 ? index + 1 : undefined;
        if (!userRank) {
            logger.error(`Couldn't find user's rank`, {
                author: event.comment.author,
            });
            return;
        }
        const flairText = formatFlair(flairFormatting, {
            place: userRank > 0 ? `${userRank}` : "0",
            total: newScore.score.toString(),
            symbol: appSettings[AppSetting.PointSymbol] as string,
            level: (
                await getLevelFromScore(context, username, newScore.score)
            ).toString(),
            rank: await getRankFromScore(context, username, newScore.score),
        });

        const shouldIncrementOnCommentSubmit =
            (settings[AppSetting.CommentIncrement] as number) ?? 0;
        if (shouldIncrementOnCommentSubmit < 0) {
            logger.info("Setting user flair", {
                username,
                newScore: newScore.score,
                cssClass,
                flairTemplate,
                flairText,
                subreddit: context.subredditName,
            });

            await context.reddit.setUserFlair({
                subredditName: context.subredditName,
                username,
                cssClass,
                flairTemplateId: flairTemplate,
                text: flairText,
            });
            logger.info(`Updating user's flair`, { flairText });
            return;
        }

        if (exists) {
            logger.debug("❌ Flair should not be set, skipping", {
                username,
                newScore: newScore.score,
                cssClass,
                flairTemplate,
                flairTextTemplate,
                subreddit: context.subredditName,
            });
            return;
        }

        logger.debug("User leaderboard rank", {
            username,
            rank: userRank,
            totalUsers: leaderboard.length,
        });

        logger.debug("Checking values", {
            userRank,
            newScore: newScore.score,
        });

        if (!userRank) {
            logger.error(`userRank not found, returning.`);
            return;
        }

        let user: User | undefined;

        try {
            user = await context.reddit.getUserByUsername(username);
        } catch {
            //
        }

        if (!user) {
            logger.error(`No user found, returning.`);
            return;
        }

        const currentScore = await getCurrentScore(user, context);

        if (!currentScore) {
            logger.error(`No current score found for user, returning.`, {
                user,
            });
            return;
        }

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

        logger.info("Setting user flair", {
            username,
            newScore: newScore.score,
            cssClass,
            flairTemplate,
            flairText,
            subreddit: context.subredditName,
        });

        await context.reddit.setUserFlair({
            subredditName: context.subredditName,
            username,
            cssClass,
            flairTemplateId: flairTemplate,
            text: flairText,
        });
    } else {
        console.log(
            `${username}: Flair not set (option disabled or flair in wrong state)`,
        );
    }
}

export async function getCurrentScore(
    user: User,
    context: TriggerContext,
): Promise<ScoreResult | undefined> {
    if (!context.subredditName) {
        logger.error("❌ Subreddit name is not available in context.");
        return;
    }

    const settings = await context.settings.getAll();

    const userFlair = await user.getUserFlairBySubreddit(context.subredditName);

    const scoreFromRedis = await context.redis.zScore(
        POINTS_STORE_KEY,
        user.username,
    );

    const rank = await context.redis.zRank(POINTS_STORE_KEY, user.username);

    const place = rank !== undefined && rank ? rank + 1 : undefined;

    logger.info("🔢 Values", {
        place,
        rank,
        scoreFromRedis,
        userHasFlair: userFlair?.flairText !== undefined,
    });

    let scoreFromFlair: number | undefined;
    let flairIsNumber = false;

    if (userFlair?.flairText) {
        const flairTextTemplate =
            (settings[AppSetting.FlairFormatting] as string | undefined) ??
            "{total}{symbol} | #{place}";

        /*
         * Escape all regex special characters in normal text.
         */
        const escapeRegex = (text: string): string =>
            text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        /*
         * Escape the template first.
         */
        let pattern = escapeRegex(flairTextTemplate);

        /*
         * Match placeholders regardless of where they appear.
         *
         * IMPORTANT:
         * Only {total} uses a capturing group because that is
         * the user's score. Everything else is non-capturing.
         *
         * This allows:
         *
         * {total}{symbol} | #{place}
         * #{place} | {total}{symbol}
         * {rank} | LVL {level} | {total}{symbol}
         * {symbol} {total} | #{place} | {rank}
         * etc.
         */

        const totalPlaceholder = "(\\d+)";

        const placePlaceholder = "\\d+";

        const symbolPlaceholder = ".*?";

        const levelPlaceholder = "\\d+";

        const rankPlaceholder = ".*?";

        /*
         * Replace double-curly placeholders first.
         */
        pattern = pattern.replace(escapeRegex("{{total}}"), totalPlaceholder);

        pattern = pattern.replace(escapeRegex("{{place}}"), placePlaceholder);

        pattern = pattern.replace(escapeRegex("{{symbol}}"), symbolPlaceholder);

        pattern = pattern.replace(escapeRegex("{{level}}"), levelPlaceholder);

        pattern = pattern.replace(escapeRegex("{{rank}}"), rankPlaceholder);

        /*
         * Replace single-curly placeholders.
         */
        pattern = pattern.replace(escapeRegex("{total}"), totalPlaceholder);

        pattern = pattern.replace(escapeRegex("{place}"), placePlaceholder);

        pattern = pattern.replace(escapeRegex("{symbol}"), symbolPlaceholder);

        pattern = pattern.replace(escapeRegex("{level}"), levelPlaceholder);

        pattern = pattern.replace(escapeRegex("{rank}"), rankPlaceholder);

        const regex = new RegExp(`^${pattern}$`);

        const matches = regex.exec(userFlair.flairText);

        /*
         * Because {total} is the ONLY capturing group,
         * matches[1] will always contain the score regardless
         * of where {total} appears in the flair.
         */
        const matchedPoints = matches?.[1];

        scoreFromFlair = matchedPoints
            ? parseInt(matchedPoints, 10)
            : undefined;

        logger.debug("Checking flair values", {
            place,
            flairText: userFlair.flairText,
            flairTemplate: flairTextTemplate,
            regex: regex.toString(),
            matches,
            matchedPoints,
            scoreFromFlair,
        });

        /*
         * Fallback:
         * If the configured template could not be matched,
         * extract the first number found anywhere in the flair.
         */
        if (scoreFromFlair === undefined) {
            const fallbackRegex = /(\d+)/;

            const fallbackMatches = fallbackRegex.exec(userFlair.flairText);

            scoreFromFlair = fallbackMatches?.[1]
                ? parseInt(fallbackMatches[1], 10)
                : undefined;

            logger.debug("Fallback flair parsing", {
                fallbackMatches,
                scoreFromFlair,
            });
        }

        flairIsNumber = scoreFromFlair !== undefined;
    }

    /*
     * Redis should be the source of truth when a Redis score exists.
     *
     * Only fall back to the flair if Redis does not have a score.
     */
    const finalScore = scoreFromFlair ?? scoreFromRedis ?? 0;

    /*
     * Make sure the user exists in the leaderboard.
     *
     * Only initialize Redis from the flair when Redis did not
     * already contain a score.
     */
    if (scoreFromRedis === undefined && scoreFromFlair !== undefined) {
        await context.redis.zAdd(POINTS_STORE_KEY, {
            member: user.username,
            score: scoreFromFlair,
        });
    } else if (scoreFromRedis === undefined) {
        await context.redis.zAdd(POINTS_STORE_KEY, {
            member: user.username,
            score: 0,
        });
    }

    logger.info("🔢 Values", {
        place,
        score: finalScore,
        scoreFromRedis,
        scoreFromFlair,
        userHasFlair: userFlair?.flairText !== undefined,
        flairIsNumber,
    });

    return {
        score: finalScore,
        userHasFlair: userFlair?.flairText !== undefined,
        flairIsNumber,
    };
}

/**
 * Returns the mod award command defined in the app settings.
 */
export async function modCommandValue(context: TriggerContext) {
    const settings = await context.settings.getAll();
    const modCommand = ((settings[AppSetting.ModAwardCommand] as string) ?? "")
        .toLowerCase()
        .trim();
    return modCommand;
}

/**
 * Returns all trigger words (both mod/normal) defined in the app settings.
 */
export async function getTriggers(context: TriggerContext) {
    const settings = await context.settings.getAll();
    const userCommands = (
        (settings[AppSetting.PointTriggerWords] as string) ?? "!award\n.award"
    )
        .split(/\r?\n/)
        .map((w) => w.trim())
        .filter(Boolean);

    // Superuser/Mod award command
    const modCommand = (
        (settings[AppSetting.ModAwardCommand] as string) ?? "!modaward"
    )
        .toLowerCase()
        .trim();

    const allTriggers = Array.from(
        new Set([...userCommands, modCommand].filter((t) => t && t.length > 0)),
    );
    return allTriggers;
}

/**
 * Returns all point trigger words defined in the app settings.
 */
export async function userCommandValues(context: TriggerContext) {
    const settings = await context.settings.getAll();
    const userCommands = (
        (settings[AppSetting.PointTriggerWords] as string) ?? "!award\n.award"
    )
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => c.toLowerCase());
    return userCommands;
}

/**
 * Checks if a comment contains any user command keywords.
 */
export async function commentContainsUserCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
): Promise<boolean> {
    if (!event.comment) return false;

    const userCommands = await userCommandValues(context);
    const body = event.comment.body;

    logger.info("🔍 Checking comment for user commands", {
        commentId: event.comment.id,
        body,
        userCommands,
    });

    return userCommands.some((command) =>
        new RegExp(`${command}`, "i").test(body),
    );
}

/**
 * Checks if a comment contains any moderator command keywords.
 */
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
