import {
    AppSetting,
    AutoSuperuserReplyOptions,
    NotifyOnBlockedUserReplyOptions,
    NotifyOnPointAlreadyAwardedToUserReplyOptions,
    NotifyOnSelfAwardReplyOptions,
    TemplateDefaults,
} from "../config/settings";
import { formatMessage } from "../utils/formatting";
import {
    getCurrentScore,
    getParentComment,
    ScoreResult,
    setUserScoreOnCommentSubmit,
    userHasPermission,
} from "../utils/common-utils";

import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import {
    getUserIsSuperuser,
    isModerator,
} from "../config/commentTriggerContext";
import {
    executeAchievementCommand,
    executeBalanceCommand,
    executeCoinLeaderboardCommand,
    executeGiftPointsCommand,
    executeHelpCommand,
    executeInfoCommand,
    executeLeaderboardCommand,
    executeNominateCommand,
    executeProfileCommand,
    executeRankCommand,
    executeRepLeaderboardCommand,
    executeStreakCommand,
    executeUserProfileCommand,
    executeUserRankCommand,
    executeVIPCommand,
    executeXPLeaderboardCommand,
} from "../config/commandExecutors";

/**
 * Handles newly submitted comments.
 *
 * This is the main entry point for VIPBot comment processing.
 */

export async function onCommentSubmit(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext
) {
    if (!context.subredditName) return;

    logger.info("🚀 Comment handler started", {
        eventType: event.comment ? "CommentSubmit/CommentUpdate" : "Unknown",
        commentId: event.comment?.id,
        postId: event.post?.id,
        subreddit: event.subreddit?.name,
        author: event.author?.name,
        commentUpdate: "previousBody" in event,
    });

    // ============================================================
    // REQUIRED EVENT DATA
    // ============================================================

    logger.debug("🔍 Getting parent comment", {
        commentId: event.comment?.id,
        postId: event.post?.id,
    });

    const parentComment = await getParentComment(event, context);

    if (
        !event.author ||
        !event.comment ||
        !event.post ||
        !event.subreddit ||
        !parentComment
    ) {
        logger.warn("❌ Missing required event data", {
            hasAuthor: !!event.author,
            hasComment: !!event.comment,
            hasPost: !!event.post,
            hasSubreddit: !!event.subreddit,
            hasParentComment: !!parentComment,
        });

        return;
    }

    logger.debug("✅ Required event data available", {
        author: event.author.name,
        commentId: event.comment.id,
        postId: event.post.id,
        subreddit: event.subreddit.name,
        parentCommentId: parentComment.id,
        parentAuthor: parentComment.authorName,
    });

    // ============================================================
    // SETTINGS
    // ============================================================

    const settings = await context.settings.getAll();

    const increment = (settings[AppSetting.CommentIncrement] as number) ?? 0;

    const prefix = (settings[AppSetting.CommandPrefix] as string) ?? "/";

    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    const commentBody = event.comment.body.trim();
    const commentAuthor = event.author.name;
    const recipient = parentComment.authorName;

    // The bot should be able to run through the normal comment handler,
    // including command processing, but it must never receive the automatic
    // comment-increment points.
    const normalizedCommentAuthor = commentAuthor.trim().toLowerCase();
    const normalizedBotName = context.appSlug.trim().toLowerCase();

    const isBotUser =
        normalizedCommentAuthor === normalizedBotName ||
        normalizedCommentAuthor === "automoderator";

    if (isBotUser) {
        logger.debug("🤖 Comment author is bot, returning.", {
            commentAuthor,
            botName: context.appSlug,
        });
        return;
    }

    // ============================================================
    // COMMENTOR
    // ============================================================

    let commentor: User | undefined;
    try {
        logger.debug("👤 Looking up awarder", {
            username: event.author.name,
        });

        commentor = await context.reddit.getUserByUsername(event.author.name);
    } catch (err) {
        logger.warn("⚠️ Failed to look up author", {
            username: commentAuthor,
            error: err,
        });

        commentor = undefined;
    }

    if (!commentor) {
        logger.warn("❌ Awarder could not be resolved");
        return;
    }

    // ============================================================
    // USER
    // ============================================================

    let user: User | undefined;

    try {
        logger.debug("👤 Looking up author", {
            username: commentAuthor,
        });

        user = await context.reddit.getUserByUsername(commentAuthor);

        logger.debug("✅ Author lookup successful", {
            username: user?.username,
        });
    } catch (err) {
        logger.warn("⚠️ Failed to look up author", {
            username: commentAuthor,
            err,
        });

        user = undefined;
    }

    if (!user) {
        logger.warn("❌ Author could not be resolved", {
            commentAuthor,
        });

        return;
    }

    logger.debug("⚙️ Loaded command settings", {
        prefix,
        increment,
        pointName,
        commentAuthor,
        recipient,
        commentBody,
    });

    // ============================================================
    // GET USER STATUS
    // ============================================================
    const isMod = await isModerator(
        context,
        context.subredditName,
        user.username
    );

    await userHasPermission(event, user.id, user.username, context, settings);

    // ============================================================
    // CONTEXT
    // ============================================================

    const bodySplit = commentBody
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

    logger.debug("🧩 Comment context initialized", {
        bodySplit,
        bodySplitLength: bodySplit.length,
        isMod,
    });

    // ============================================================
    // BLOCKED USERS
    // ============================================================

    const blockedUsers = (
        (settings[AppSetting.UsersWhoCannotAwardPoints] as string) ?? ""
    )
        .split(/\r?\n/)
        .map((w) => w.trim())
        .filter(Boolean);

    logger.debug("🚫 Checking blocked-user list", {
        commentAuthor,
        blockedUsers,
        isBlocked: blockedUsers.includes(commentAuthor),
    });

    if (blockedUsers.includes(commentAuthor)) {
        logger.warn("🚫 User is blocked from awarding points", {
            commentAuthor,
            recipient,
            subreddit: event.subreddit.name,
        });

        const blockedTemplate =
            (settings[AppSetting.UsersWhoCannotAwardPointsMessage] as string) ??
            TemplateDefaults.UsersWhoCannotAwardPointsMessage;

        const notifyBlockedUserMode = (
            settings[AppSetting.NotifyOnBlockedUser] as string[]
        )?.[0];

        const blockedMessage = formatMessage(event, blockedTemplate, {
            name: pointName,
            commentAuthor,
            subreddit: event.subreddit.name,
        });

        logger.debug("📨 Sending blocked-user notification", {
            commentAuthor,
            mode: notifyBlockedUserMode,
        });

        if (
            notifyBlockedUserMode ===
            NotifyOnBlockedUserReplyOptions.ReplyAsComment
        ) {
            const message = await context.reddit.submitComment({
                id: event.comment.id,
                text: blockedMessage,
            });

            await message.distinguish();

            logger.info("💬 Posted blocked-user response", {
                commentAuthor,
            });
        } else if (
            notifyBlockedUserMode === NotifyOnBlockedUserReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: commentAuthor,
                text: blockedMessage,
                subject:
                    `You do not have permission to award ${pointName}s ` +
                    `in r/${event.subreddit.name}`,
            });

            logger.info("📨 Sent blocked-user PM", {
                commentAuthor,
            });
        }

        return;
    }

    // ============================================================
    // COMMENT INCREMENT COMMAND REQUIREMENT
    // ============================================================

    const incrementedKey = `incremented:${user.username}:${parentComment.id}`;

    if (increment !== 0 && !isBotUser && !("previousBody" in event)) {
        await context.redis.set(incrementedKey, "1");

        logger.debug("🔢 Comment increment is enabled", {
            increment,
            incrementedKey,
        });

        const currentScore = await getCurrentScore(user, context);

        if (!currentScore) {
            logger.error(`currentScore couldn't be found, returning.`);
            return;
        }
        const newScore: ScoreResult = {
            score: currentScore.score + increment,
            userHasFlair: currentScore.userHasFlair,
            flairIsNumber: currentScore.flairIsNumber,
        };

        setUserScoreOnCommentSubmit(
            event,
            context,
            user.username,
            newScore,
            settings
        );

        const userIsSuperUser = await getUserIsSuperuser(
            event,
            context,
            user.username
        );
        if (userIsSuperUser) {
            const threshold =
                (settings[AppSetting.AutoSuperuserThreshold] as number) ?? 0;
            const superUserTemplate = formatMessage(
                event,
                (settings[AppSetting.AutoSuperuserTemplate] as string) ??
                    TemplateDefaults.AutoSuperuserTemplate,
                { awardee: commentor.username, threshold: new Intl.NumberFormat("en").format(threshold) }
            );
            const superUserKey = `superUserMessageSent:${commentor.username}`;
            await context.redis.del(superUserKey);

            const superUserKeyExists = await context.redis.exists(superUserKey);
            if (superUserKeyExists) {
                logger.info(`User is already superuser, returning.`, {
                    user: commentor.username,
                });
                return;
            }

            await context.redis.set(superUserKey, "1");

            logger.info(`Made user a superuser`, { user: commentor.username });
            const notifyOnSuperuser = ((settings[
                AppSetting.NotifyOnAutoSuperuser
            ] as string[]) ?? [AutoSuperuserReplyOptions.NoReply])[0];
            //comment
            if (
                notifyOnSuperuser === AutoSuperuserReplyOptions.ReplyAsComment
            ) {
                const superUserMessage = await context.reddit.submitComment({
                    id: event.comment.id,
                    text: superUserTemplate,
                });
                superUserMessage.distinguish();
                logger.info(
                    `Let user know via comment that they are now a superuser`,
                    { awarder: user.username }
                );
                //dm
            } else if (
                notifyOnSuperuser === AutoSuperuserReplyOptions.ReplyByPM
            ) {
                await context.reddit.sendPrivateMessage({
                    to: commentor.username,
                    subject: `You are now a superuser in r/${await context.reddit.getCurrentSubredditName()}`,
                    text: superUserTemplate,
                });
                logger.info(
                    `Let user know via dm that they are now a superuser`,
                    {
                        user: user.username,
                    }
                );
            } else if (
                notifyOnSuperuser === AutoSuperuserReplyOptions.NoReply
            ) {
                logger.info(
                    `User has been made a superuser, but was not notified`,
                    { user: user.username }
                );
            }
        }
    } else if (isBotUser) {
        logger.debug("🤖 Automatic comment-increment skipped for bot.", {
            commentAuthor,
            increment,
        });
    }

    // ============================================================
    // SELF AWARD
    // ============================================================
    const shouldSelfAward = await context.redis.exists(incrementedKey);

    logger.info(`Should self award?`, {
        shouldSelfAward: shouldSelfAward === 0 ? "yes" : "no",
    });
    if (commentAuthor === recipient && !shouldSelfAward) {
        logger.warn("🛑 Self-award attempt detected", {
            commentAuthor,
            recipient,
            commentId: event.comment.id,
        });

        const selfAwardTemplate = formatMessage(
            event,
            (settings[AppSetting.SelfAwardMessage] as string) ??
                TemplateDefaults.SelfAwardMessage,
            {
                awarder: commentAuthor,
                name: pointName,
            }
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

            logger.info("💬 Posted self-award warning", {
                commentAuthor,
            });
        } else if (
            notifyNormalSelfAwardMode ===
            NotifyOnSelfAwardReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: commentAuthor,
                text: selfAwardTemplate,
                subject: `You tried to award yourself a ${pointName}`,
            });

            logger.info("📨 Sent self-award warning via PM", {
                commentAuthor,
            });
        }

        return;
    }

    // ============================================================
    // DUPLICATE AWARD
    // ============================================================

    const key =
        `userAwardGiven:${parentComment.id}:` +
        `${event.post.id}:${event.subreddit.name}`;

    logger.debug("🔑 Checking duplicate-award key", {
        key,
    });

    const alreadyAwarded = await context.redis.exists(key);

    logger.debug("🔍 Duplicate-award check complete", {
        key,
        alreadyAwarded,
    });

    if (alreadyAwarded) {
        logger.warn("⚠️ Point already awarded", {
            commentAuthor,
            recipient,
            key,
        });

        const alreadyAwardedTemplate = formatMessage(
            event,
            (settings[AppSetting.PointAlreadyAwardedToUserMessage] as string) ??
                TemplateDefaults.PointAlreadyAwardedToUserMessage,
            {
                commentAuthor,
                awardee: recipient,
                name: pointName,
            }
        );

        const notifyMode = (
            settings[AppSetting.NotifyOnPointAlreadyAwardedToUser] as string[]
        )?.[0];

        if (
            notifyMode ===
            NotifyOnPointAlreadyAwardedToUserReplyOptions.ReplyAsComment
        ) {
            const message = await context.reddit.submitComment({
                id: event.comment.id,
                text: alreadyAwardedTemplate,
            });

            await message.distinguish();

            logger.info("💬 Posted duplicate-award response", {
                commentAuthor,
                recipient,
            });
        } else if (
            notifyMode ===
            NotifyOnPointAlreadyAwardedToUserReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: commentAuthor,
                subject:
                    `[This comment](${parentComment.permalink}) ` +
                    `has already received a ${pointName}`,
                text: alreadyAwardedTemplate,
            });

            logger.info("📨 Sent duplicate-award PM", {
                commentAuthor,
                recipient,
            });
        }

        return;
    }

    // ============================================================
    // GET AWARDEE
    // ============================================================

    let awardee: User | undefined;

    try {
        logger.debug("👤 Looking up awardee", {
            recipient,
        });

        awardee = await context.reddit.getUserByUsername(recipient);

        logger.debug("✅ Awardee lookup successful", {
            recipient: awardee?.username,
        });
    } catch (err) {
        logger.warn("⚠️ Failed to look up awardee", {
            recipient,
            err,
        });

        awardee = undefined;
    }

    if (!awardee) {
        logger.error("❌ Awardee could not be resolved", {
            recipient,
        });

        return;
    }

    // ============================================================
    // COMMAND DETECTION
    // ============================================================

    // Parse the command from the first token instead of requiring an
    // exact bodySplit.length. This allows commands with 1, 2, 3, or
    // more arguments to be detected correctly.
    const commandToken = (bodySplit[0] ?? "")
        .replace(/[.!?]+$/, "")
        .toLowerCase();

    const normalizedPrefix = prefix.toLowerCase();

    const isCommand = (command: string): boolean =>
        commandToken === `${normalizedPrefix}${command.toLowerCase()}`;

    const secondToken = bodySplit[1] ?? "";
    const isTargetUser = (target: string): boolean =>
        target.toLowerCase() === `u/${user.username.toLowerCase()}`;

    const infoCommand = isCommand("info");
    const helpCommand = isCommand("help");
    const profileCommand = isCommand("profile") && bodySplit.length === 1;
    const rankCommand = isCommand("rank") && bodySplit.length === 1;
    const balanceCommand = isCommand("balance");
    const achievementsCommand = isCommand("achievements");
    const streakCommand = isCommand("streak");
    const vipsCommand = isCommand("vips");

    // Commands that specifically target the current user.
    // /profile u/example
    // /rank u/example
    // /nominate u/example
    const userProfileCommand =
        isCommand("profile") && isTargetUser(secondToken);
    const userRankCommand = isCommand("rank") && isTargetUser(secondToken);
    const nominateCommand = isCommand("nominate") && isTargetUser(secondToken);

    // More specific leaderboard commands are checked before the generic
    // leaderboard command so /leaderboard xp does not also run the generic
    // leaderboard handler.
    const xpLeaderboardCommand =
        isCommand("leaderboard") && (bodySplit[1] ?? "").toLowerCase() === "xp";

    const coinLeaderboardCommand =
        isCommand("leaderboard") &&
        (bodySplit[1] ?? "").toLowerCase() === "coins";

    const repLeaderboardCommand =
        isCommand("leaderboard") && /^rep(utation)?$/i.test(bodySplit[1] ?? "");

    const leaderboardCommand =
        isCommand("leaderboard") &&
        !xpLeaderboardCommand &&
        !coinLeaderboardCommand &&
        !repLeaderboardCommand;

    logger.debug("🧪 Command detection results", {
        commandToken,
        bodySplit,
        infoCommand,
        helpCommand,
        profileCommand,
        userProfileCommand,
        rankCommand,
        userRankCommand,
        balanceCommand,
        achievementsCommand,
        leaderboardCommand,
        xpLeaderboardCommand,
        coinLeaderboardCommand,
        repLeaderboardCommand,
        streakCommand,
        vipsCommand,
        nominateCommand,
    });

    // ============================================================
    // MULTI-ARGUMENT COMMANDS
    // ============================================================

    let giftPointsCommand = false;

    if (bodySplit.length >= 3) {
        const target = bodySplit[1] ?? "";
        const amount = bodySplit[2] ?? "";

        // /gift u/example 10
        // Additional tokens are allowed and passed to the executor in
        // bodySplit, rather than causing the command to be ignored.
        giftPointsCommand =
            isCommand("gift") &&
            /u\/[0-9a-z]{3,21}/i.test(target) &&
            amount.length > 0;

        logger.debug("🧪 Multi-argument command results", {
            commandToken,
            target,
            thirdArg: amount,
            bodySplit,
            bodySplitLength: bodySplit.length,
            giftPointsCommand,
        });
    }

    // ============================================================
    // DETERMINE WHETHER THIS IS A BOT COMMAND
    // ============================================================

    const isBotCommand =
        infoCommand ||
        helpCommand ||
        profileCommand ||
        rankCommand ||
        userRankCommand ||
        balanceCommand ||
        achievementsCommand ||
        leaderboardCommand ||
        xpLeaderboardCommand ||
        coinLeaderboardCommand ||
        repLeaderboardCommand ||
        streakCommand ||
        vipsCommand ||
        nominateCommand ||
        giftPointsCommand;
    logger.debug("📋 Command classification", {
        isBotCommand,
        commentBody,
    });

    // ============================================================
    // IMPORTANT:
    // COMMANDS ARE PROCESSED BEFORE POINT-AWARD LOGIC.
    //
    // This is the critical fix.
    // ============================================================

    if (isBotCommand) {
        logger.info("🤖 Valid VIP Bot command detected", {
            commandBody: commentBody,
            user: user.username,
            subreddit: event.subreddit.name,
            commentId: event.comment.id,
        });

        // --------------------------------------------------------
        // INFO
        // --------------------------------------------------------

        if (infoCommand) {
            await executeInfoCommand(event, context, user, prefix);
        }

        // --------------------------------------------------------
        // HELP
        // --------------------------------------------------------

        if (helpCommand) {
            await executeHelpCommand(event, user, isMod, prefix, context);
        }

        // --------------------------------------------------------
        // PROFILE
        // --------------------------------------------------------

        if (profileCommand) {
            await executeProfileCommand(event, context, user);
        }

        // --------------------------------------------------------
        // USER RANK
        // --------------------------------------------------------

        if (userRankCommand) {
            await executeUserRankCommand(event, context, user);
        }

        // --------------------------------------------------------
        // RANK
        // --------------------------------------------------------

        if (rankCommand) {
            await executeRankCommand(event, context, user);
        }

        // --------------------------------------------------------
        // BALANCE
        // --------------------------------------------------------

        if (balanceCommand) {
            await executeBalanceCommand(event, context, user);
        }

        // --------------------------------------------------------
        // ACHIEVEMENTS
        // --------------------------------------------------------

        if (achievementsCommand) {
            executeAchievementCommand(event, context, user);
        }

        // --------------------------------------------------------
        // XP LEADERBOARD
        // --------------------------------------------------------

        if (xpLeaderboardCommand) {
            await executeXPLeaderboardCommand(event, context, user);
        }

        // --------------------------------------------------------
        // COINS LEADERBOARD
        // --------------------------------------------------------

        if (coinLeaderboardCommand) {
            await executeCoinLeaderboardCommand(event, context, user);
        }

        // --------------------------------------------------------
        // REP LEADERBOARD
        // --------------------------------------------------------

        if (repLeaderboardCommand) {
            await executeRepLeaderboardCommand(event, context, user);
        }

        // --------------------------------------------------------
        // LEADERBOARD
        // --------------------------------------------------------

        if (leaderboardCommand) {
            await executeLeaderboardCommand(event, context, user);
        }

        // --------------------------------------------------------
        // STREAK
        // --------------------------------------------------------

        if (streakCommand) {
            await executeStreakCommand(event, context, user);
        }

        // --------------------------------------------------------
        // VIPS
        // --------------------------------------------------------

        if (vipsCommand) {
            await executeVIPCommand(event, context, user);
        }

        // --------------------------------------------------------
        // NOMINATE
        // --------------------------------------------------------

        if (nominateCommand) {
            await executeNominateCommand(event, context, user, isMod);
        }

        // --------------------------------------------------------
        // TWO-ARGUMENT COMMANDS
        // --------------------------------------------------------
        if (bodySplit.length >= 2) {
            const target = bodySplit[1];

            if (!target) {
                logger.error(`Target object not found, returning.`, { target });
                return;
            }
            // --------------------------------------------------------
            // USER PROFILE
            // --------------------------------------------------------
            if (userProfileCommand) {
                await executeUserProfileCommand(event, context, target);
            }

            // --------------------------------------------------------
            // THREE-ARGUMENT COMMANDS
            // --------------------------------------------------------

            if (giftPointsCommand) {
                await executeGiftPointsCommand(event, context, user, bodySplit);
            }
        } else {
            logger.warn("⚠️ Comment was detected but no handler matched", {
                commentBody,
                bodySplit,
            });
        }
    }
}
