import {
    AppSetting,
    NotifyOnBlockedUserReplyOptions,
    NotifyOnPointAlreadyAwardedToUserReplyOptions,
    NotifyOnSelfAwardReplyOptions,
    TemplateDefaults,
} from "../config/settings";
import { formatMessage } from "../utils/formatting";
import {
    getCurrentScore,
    getParentComment,
    InitialUserWikiOptions,
    ScoreResult,
    setUserScoreOnCommentSubmit,
    userHasPermission,
} from "../utils/common-utils";

import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { isModerator } from "../config/commentTriggerContext";
import { SafeWikiClient, updateUserWiki } from "../jobs/leaderboard";

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
    const awarder = event.author.name;
    const recipient = parentComment.authorName;

    // ============================================================
    // USER
    // ============================================================

    let user: User | undefined;

    try {
        logger.debug("👤 Looking up author", {
            username: awarder,
        });

        user = await context.reddit.getUserByUsername(awarder);

        logger.debug("✅ Author lookup successful", {
            username: user?.username,
        });
    } catch (err) {
        logger.warn("⚠️ Failed to look up author", {
            username: awarder,
            err,
        });

        user = undefined;
    }

    if (!user) {
        logger.warn("❌ Author could not be resolved", {
            awarder,
        });

        return;
    }

    logger.debug("⚙️ Loaded command settings", {
        prefix,
        increment,
        pointName,
        awarder,
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
    const hasPermission = await userHasPermission(
        event,
        user.id,
        user.username,
        context,
        settings
    );
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
    // REGEX HELPERS
    // ============================================================

    const commandRegex = (command: string): RegExp =>
        new RegExp(`${prefix}${command}`, "i");

    /*
     * Commands that specifically target the current user.
     *
     * /rank u/example
     * /nominate u/example
     */

    const userCommandRegex = (command: string): RegExp =>
        new RegExp(
            `^${prefix}${command}\\s+u/
                ${user.username}`,
            "i"
        );

    // ============================================================
    // COMMAND DETECTION
    // ============================================================

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
        awarder,
        blockedUsers,
        isBlocked: blockedUsers.includes(awarder),
    });

    if (blockedUsers.includes(awarder)) {
        logger.warn("🚫 User is blocked from awarding points", {
            awarder,
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
            awarder,
            subreddit: event.subreddit.name,
        });

        logger.debug("📨 Sending blocked-user notification", {
            awarder,
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
                awarder,
            });
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

            logger.info("📨 Sent blocked-user PM", {
                awarder,
            });
        }

        return;
    }

    // ============================================================
    // COMMENT INCREMENT COMMAND REQUIREMENT
    // ============================================================

    if (increment !== 0) {
        logger.debug("🔢 Comment increment is enabled", {
            increment,
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
    }

    // ============================================================
    // SELF AWARD
    // ============================================================

    if (awarder === recipient) {
        logger.warn("🛑 Self-award attempt detected", {
            awarder,
            recipient,
            commentId: event.comment.id,
        });

        const selfAwardTemplate = formatMessage(
            event,
            (settings[AppSetting.SelfAwardMessage] as string) ??
                TemplateDefaults.SelfAwardMessage,
            {
                awarder,
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
                awarder,
            });
        } else if (
            notifyNormalSelfAwardMode ===
            NotifyOnSelfAwardReplyOptions.ReplyByPM
        ) {
            await context.reddit.sendPrivateMessage({
                to: awarder,
                text: selfAwardTemplate,
                subject: `You tried to award yourself a ${pointName}`,
            });

            logger.info("📨 Sent self-award warning via PM", {
                awarder,
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
            awarder,
            recipient,
            key,
        });

        const alreadyAwardedTemplate = formatMessage(
            event,
            (settings[AppSetting.PointAlreadyAwardedToUserMessage] as string) ??
                TemplateDefaults.PointAlreadyAwardedToUserMessage,
            {
                awarder,
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
                awarder,
                recipient,
            });
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

            logger.info("📨 Sent duplicate-award PM", {
                awarder,
                recipient,
            });
        }

        return;
    }

    // ============================================================
    // AWARD POINT
    // ============================================================

    logger.info("🎁 Point award beginning", {
        awarder,
        recipient,
        increment,
        pointName,
        key,
    });

    await context.redis.set(key, "1");

    logger.debug("🔐 Duplicate-award key created", {
        key,
    });

    // ============================================================
    // USER WIKI
    // ============================================================

    try {
        logger.info("📘 Updating user wiki pages", {
            awarder,
            recipient,
            subreddit: event.subreddit.name,
        });

        const subredditName = event.subreddit.name;

        const safeWiki = new SafeWikiClient(context.reddit);

        const awarderWiki = await safeWiki.getWikiPage(
            subredditName,
            `user/${awarder.toLowerCase()}`
        );

        const recipientWiki = await safeWiki.getWikiPage(
            subredditName,
            `user/${recipient}`
        );

        logger.debug("📄 User wiki lookup results", {
            awarderWikiExists: !!awarderWiki,
            recipientWikiExists: !!recipientWiki,
        });

        if (!awarderWiki) {
            logger.info("📝 Creating awarder wiki page", {
                awarder,
            });

            await InitialUserWikiOptions(context, awarder);
        }

        if (!recipientWiki) {
            logger.info("📝 Creating recipient wiki page", {
                recipient,
            });

            await InitialUserWikiOptions(context, recipient);
        }

        const givenData = {
            postTitle: event.post.title,
            postUrl: event.post.permalink,
            recipient,
            commentUrl: event.comment.permalink,
        };

        logger.debug("📝 Updating award history", {
            awarder,
            recipient,
            givenData,
        });

        await updateUserWiki(context, awarder, recipient, givenData);

        logger.info("✅ User wiki updated successfully", {
            awarder,
            recipient,
        });
    } catch (err) {
        logger.error("❌ Failed to update user wiki (Normal award)", {
            awarder,
            recipient,
            err,
        });
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

    const infoCommand = commandRegex("info").test(commentBody);
    const helpCommand = commandRegex("help").test(commentBody);
    const profileCommand = commandRegex("profile").test(commentBody);
    const rankCommand = commandRegex("rank").test(commentBody);
    const balanceCommand = commandRegex("balance").test(commentBody);
    const achievementsCommand = commandRegex("achievements").test(commentBody);
    const leaderboardCommand = commandRegex("leaderboard").test(commentBody);
    const streakCommand = commandRegex("streak").test(commentBody);
    const vipsCommand = commandRegex("vips").test(commentBody);

    const userRankCommand = userCommandRegex("rank").test(commentBody);
    const nominateCommand = userCommandRegex("nominate").test(commentBody);

    /*
     * More specific leaderboard commands must be checked separately.
     */

    const xpLeaderboardCommand = new RegExp(
        `^${prefix}leaderboard\\s+xp(?:\\s|$)`,
        "i"
    ).test(commentBody);

    const coinLeaderboardCommand = new RegExp(
        `^${prefix}leaderboard\\s+coins(?:\\s|$)`,
        "i"
    ).test(commentBody);

    const repLeaderboardCommand = new RegExp(
        `^${prefix}leaderboard\\s+rep(?:\\s|$)`,
        "i"
    ).test(commentBody);

    logger.debug("🧪 Command detection results", {
        infoCommand,
        helpCommand,
        profileCommand,
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
    // THREE-ARGUMENT COMMANDS
    // ============================================================

    let giftPointsCommand = false;
    let vipAddDaysCommand = false;
    let addXpCommand = false;
    let addCoinsCommand = false;
    let addRepCommand = false;
    let setLevelCommand = false;

    if (!hasPermission) {
        logger.debug("❌ User does not have permission to use commands", {
            awarder,
            commentId: event.comment.id,
        });
        return;
    }

    if (bodySplit.length === 3) {
        const command = bodySplit[0];
        const target = bodySplit[1];
        const thirdArg = bodySplit[2];

        if (!thirdArg) {
            logger.info(`Third argument not detected, returning,`);
            return;
        }

        logger.debug("🧪 Testing three-argument command", {
            command,
            target,
            thirdArg,
            bodySplit,
        });

        const threeArgRegex = (commandName: string): RegExp =>
            new RegExp(
                `^${prefix}${commandName}\\s+u/${user.username}\\s+${thirdArg}$`,
                "i"
            );

        giftPointsCommand = threeArgRegex("gift").test(commentBody);
        vipAddDaysCommand = threeArgRegex("vipadd").test(commentBody);

        // FIXED: These previously all incorrectly tested "vipadd".
        addXpCommand = threeArgRegex("addxp").test(commentBody);
        addCoinsCommand = threeArgRegex("addcoins").test(commentBody);
        addRepCommand = threeArgRegex("addrep").test(commentBody);

        setLevelCommand = threeArgRegex("setlevel").test(commentBody);

        logger.debug("🧪 Three-argument command results", {
            giftPointsCommand,
            vipAddDaysCommand,
            addXpCommand,
            addCoinsCommand,
            addRepCommand,
            setLevelCommand,
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
        giftPointsCommand ||
        vipAddDaysCommand ||
        addXpCommand ||
        addCoinsCommand ||
        addRepCommand ||
        setLevelCommand;

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
            logger.info("ℹ️ Executing INFO command", {
                user: user.username,
            });

            const formattedDMInfoMessage = formatMessage(
                event,
                TemplateDefaults.DMInfoMessage,
                {
                    username: user.username,
                    subreddit: event.subreddit.name,
                    prefix,
                    permalink: event.comment.permalink,
                }
            );

            await context.reddit.sendPrivateMessage({
                to: user.username,
                subject: "VIP Bot Info",
                text: formattedDMInfoMessage,
            });

            logger.info("📨 Sent info message via DM", {
                user: user.username,
                subreddit: event.subreddit.name,
            });

            const formattedInfoMessageConfirmation = formatMessage(
                event,
                TemplateDefaults.InfoMessageConfirmation,
                {}
            );

            const formattedInfoMessage = await context.reddit.submitComment({
                id: event.comment.id,
                text: formattedInfoMessageConfirmation,
            });

            await formattedInfoMessage.distinguish();

            logger.info("💬 Posted info confirmation", {
                commentId: event.comment.id,
            });

            return;
        }

        // --------------------------------------------------------
        // HELP
        // --------------------------------------------------------

        if (helpCommand) {
            logger.info("❓ Executing HELP command", {
                user: user.username,
                isMod,
            });

            if (!isMod) {
                const formattedNormalDMHelpMessage = formatMessage(
                    event,
                    TemplateDefaults.NormalUserDMHelpMessage,
                    { prefix }
                );

                await context.reddit.sendPrivateMessage({
                    to: user.username,
                    subject: "VIP Bot Help",
                    text: formattedNormalDMHelpMessage,
                });

                logger.info("📨 Sent normal-user help DM", {
                    user: user.username,
                });
                return;
            } else if (isMod) {
                const formattedModDMHelpMessage = formatMessage(
                    event,
                    TemplateDefaults.ModDMHelpMessage,
                    { prefix }
                );

                await context.reddit.sendPrivateMessage({
                    to: user.username,
                    subject: "VIP Bot Help",
                    text: formattedModDMHelpMessage,
                });

                logger.info("📨 Sent moderator help DM", {
                    user: user.username,
                });
                return;
            }

            const helpMessageConfirmation = formatMessage(
                event,
                TemplateDefaults.HelpMessageConfirmation,
                {}
            );

            const publicHelpMessage = await context.reddit.submitComment({
                id: event.comment.id,
                text: helpMessageConfirmation,
            });

            await publicHelpMessage.distinguish();

            logger.info("💬 Posted help confirmation", {
                commentId: event.comment.id,
            });

            return;
        }

        // --------------------------------------------------------
        // PROFILE
        // --------------------------------------------------------

        if (profileCommand) {
            logger.info("👤 Executing PROFILE command", {
                user: user.username,
            });

            // Your profile command logic goes here.

            return;
        }

        // --------------------------------------------------------
        // USER RANK
        // --------------------------------------------------------

        if (userRankCommand) {
            logger.info("🏆 Executing USER RANK command", {
                requester: user.username,
                target: user.username,
            });

            // Your user-rank command logic goes here.

            return;
        }

        // --------------------------------------------------------
        // RANK
        // --------------------------------------------------------

        if (rankCommand) {
            logger.info("🏅 Executing RANK command", {
                user: user.username,
            });

            // Your rank command logic goes here.

            return;
        }

        // --------------------------------------------------------
        // BALANCE
        // --------------------------------------------------------

        if (balanceCommand) {
            logger.info("💰 Executing BALANCE command", {
                user: user.username,
            });

            // Your balance command logic goes here.

            return;
        }

        // --------------------------------------------------------
        // ACHIEVEMENTS
        // --------------------------------------------------------

        if (achievementsCommand) {
            logger.info("🏆 Executing ACHIEVEMENTS command", {
                user: user.username,
            });

            // Your achievements command logic goes here.

            return;
        }

        // --------------------------------------------------------
        // XP LEADERBOARD
        // --------------------------------------------------------

        if (xpLeaderboardCommand) {
            logger.info("📊 Executing XP LEADERBOARD command", {
                user: user.username,
            });

            // Your XP leaderboard logic goes here.

            return;
        }

        // --------------------------------------------------------
        // COINS LEADERBOARD
        // --------------------------------------------------------

        if (coinLeaderboardCommand) {
            logger.info("🪙 Executing COINS LEADERBOARD command", {
                user: user.username,
            });

            // Your coins leaderboard logic goes here.

            return;
        }

        // --------------------------------------------------------
        // REP LEADERBOARD
        // --------------------------------------------------------

        if (repLeaderboardCommand) {
            logger.info("⭐ Executing REP LEADERBOARD command", {
                user: user.username,
            });

            // Your rep leaderboard logic goes here.

            return;
        }

        // --------------------------------------------------------
        // LEADERBOARD
        // --------------------------------------------------------

        if (leaderboardCommand) {
            logger.info("📋 Executing LEADERBOARD command", {
                user: user.username,
            });

            // Your normal leaderboard logic goes here.

            return;
        }

        // --------------------------------------------------------
        // STREAK
        // --------------------------------------------------------

        if (streakCommand) {
            logger.info("🔥 Executing STREAK command", {
                user: user.username,
            });

            // Your streak logic goes here.

            return;
        }

        // --------------------------------------------------------
        // VIPS
        // --------------------------------------------------------

        if (vipsCommand) {
            logger.info("👑 Executing VIPS command", {
                user: user.username,
            });

            // Your VIP list logic goes here.

            return;
        }

        // --------------------------------------------------------
        // NOMINATE
        // --------------------------------------------------------

        if (nominateCommand) {
            logger.info("🗳️ Executing NOMINATE command", {
                requester: user.username,
                target: user.username,
                isMod,
            });

            // Your nominate logic goes here.

            return;
        }

        // --------------------------------------------------------
        // THREE-ARGUMENT COMMANDS
        // --------------------------------------------------------

        if (giftPointsCommand) {
            logger.info("🎁 Executing GIFT command", {
                user: user.username,
                argument: bodySplit[2],
            });

            // Your gift logic goes here.

            return;
        }

        if (vipAddDaysCommand) {
            logger.info("👑 Executing VIPADD command", {
                user: user.username,
                days: bodySplit[2],
            });

            // Your VIP add-days logic goes here.

            return;
        }

        if (addXpCommand) {
            logger.info("✨ Executing ADDXP command", {
                user: user.username,
                amount: bodySplit[2],
            });

            // Your XP logic goes here.

            return;
        }

        if (addCoinsCommand) {
            logger.info("🪙 Executing ADDCOINS command", {
                user: user.username,
                amount: bodySplit[2],
            });

            // Your coins logic goes here.

            return;
        }

        if (addRepCommand) {
            logger.info("⭐ Executing ADDREP command", {
                user: user.username,
                amount: bodySplit[2],
            });

            // Your reputation logic goes here.

            return;
        }

        if (setLevelCommand) {
            logger.info("📈 Executing SETLEVEL command", {
                user: user.username,
                level: bodySplit[2],
            });

            // Your set-level logic goes here.

            return;
        }

        logger.warn("⚠️ Comment was detected but no handler matched", {
            commentBody,
            bodySplit,
        });

        return;
    }
}
