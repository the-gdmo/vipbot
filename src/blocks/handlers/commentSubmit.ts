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
    getManagedFlairScore,
    getParentComment,
    ScoreResult,
    setManagedFlairScoreOnCommentSubmit,
    userHasPermission,
} from "../utils/common-utils";
import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { TriggerContext, User } from "@devvit/public-api";
import { logger } from "../utils/logger";
import { UserProfile } from "../config/userProfile";
import {
    getUserIsSuperuser,
    isModerator,
} from "../config/commentTriggerContext";
import {
    executeAchievementCommand,
    executeBalanceCommand,
    executeCoinLeaderboardCommand,
    executeGiveCoinsCommand,
    executeHelpCommand,
    executeInfoCommand,
    executeLeaderboardCommand,
    executeLevelLeaderboardCommand,
    executeMonthlyXPLeaderboardCommand,
    executeNominateCommand,
    executeProfileCommand,
    executeRankCommand,
    executeRepLeaderboardCommand,
    executeStreakCommand,
    executeStreakLeaderboardCommand,
    executeStoreCommand,
    executeUserProfileCommand,
    executeUserRankCommand,
    executeVIPCommand,
    executeWeeklyXPLeaderboardCommand,
    executeXPLeaderboardCommand,
} from "../config/commandExecutors";

async function replyToVIPBotCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    text: string
): Promise<void> {
    if (!event.comment) return;

    const reply = await context.reddit.submitComment({
        id: event.comment.id,
        text: formatMessage(event, text, {}),
    });

    await reply.distinguish();
}

/**
 * Handles newly submitted comments and comment updates.
 *
 * Managed flair score is intentionally separate from UserProfile reputation,
 * XP, and coins. This handler only touches the managed flair score for the
 * configured automatic comment increment. UserProfile-backed commands are
 * delegated to commandExecutors.ts.
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

    if (!event.author || !event.comment || !event.post || !event.subreddit) {
        logger.warn("❌ Missing required event data", {
            hasAuthor: !!event.author,
            hasComment: !!event.comment,
            hasPost: !!event.post,
            hasSubreddit: !!event.subreddit,
        });
        return;
    }

    // ============================================================
    // SETTINGS / BASIC CONTEXT
    // ============================================================

    const settings = await context.settings.getAll();
    const increment = (settings[AppSetting.CommentIncrement] as number) ?? 0;
    const prefix = (settings[AppSetting.CommandPrefix] as string) ?? "/";
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    const pointCommandName = (
        (settings[AppSetting.PointCommand] as string | undefined) ??
        TemplateDefaults.PointCommand
    ).trim();
    const configuredVipPointAwardAmount =
        (settings[AppSetting.PointCommandVIPPointAmount] as
            | number
            | undefined) ?? 1;
    const configuredCoinAwardAmount =
        (settings[AppSetting.PointCommandCoinAmount] as number | undefined) ??
        1;
    const vipPointAwardAmount =
        Number.isSafeInteger(configuredVipPointAwardAmount) &&
        configuredVipPointAwardAmount > 0
            ? configuredVipPointAwardAmount
            : 1;
    const coinAwardAmount =
        Number.isSafeInteger(configuredCoinAwardAmount) &&
        configuredCoinAwardAmount > 0
            ? configuredCoinAwardAmount
            : 1;

    const commentBody = event.comment.body.trim();
    const commentAuthor = event.author.name;

    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;

    const normalizedCommentAuthor = commentAuthor.trim().toLowerCase();
    const excludedAccounts = botsThatWillNotBeManaged
        .split(/\r?\n|,/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    const isBotUser = excludedAccounts.includes(normalizedCommentAuthor);

    if (isBotUser) {
        logger.debug("🤖 Bot comment ignored", {
            commentAuthor,
        });
        return;
    }

    // ============================================================
    // RESOLVE COMMENT AUTHOR
    // ============================================================

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(commentAuthor);
    } catch (error) {
        logger.warn("⚠️ Failed to look up comment author", {
            username: commentAuthor,
            error,
        });
    }

    if (!user) {
        logger.warn("❌ Comment author could not be resolved", {
            commentAuthor,
        });
        return;
    }

    const isMod = await isModerator(
        context,
        context.subredditName,
        user.username
    );

    const bodySplit = commentBody
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

    logger.debug("🧩 Comment context initialized", {
        bodySplit,
        isMod,
        isBotUser,
        increment,
    });

    // ============================================================
    // COMMAND DETECTION
    //
    // Commands are deliberately handled BEFORE any managed-flair score,
    // self-award, duplicate-award, or blocked-awarder logic. A command must
    // never accidentally receive the normal comment increment.
    // ============================================================

    const normalizedPrefix = prefix.toLowerCase();

    const isCommand = (name: string): boolean => {
        const escapedPrefix = normalizedPrefix.replaceAll(/[.*]/gi, "\\$&");
        const escapedName = name.toLowerCase().replaceAll(/[.*]/gi, "\\$&");

        logger.info(`isCommand() values`, { escapedPrefix, escapedName });

        const commandRegex = new RegExp(`${escapedPrefix}${escapedName}`, "i");

        return commandRegex.test(commentBody);
    };
    const isUserToken = (value: string | undefined): boolean =>
        !!value && /u\/[0-9a-z_-]{3,21}.*/i.test(value);

    const infoCommand = isCommand("info") && bodySplit.length === 1;
    const helpCommand = isCommand("help") && bodySplit.length === 1;
    const profileCommand = isCommand("profile") && bodySplit.length === 1;
    const userProfileCommand =
        isCommand("profile") &&
        bodySplit.length === 2 &&
        isUserToken(bodySplit[1]);
    const rankCommand = isCommand("rank") && bodySplit.length === 1;
    const userRankCommand =
        isCommand("rank") &&
        bodySplit.length === 2 &&
        isUserToken(bodySplit[1]);
    const balanceCommand = isCommand("balance") && bodySplit.length === 1;
    const achievementsCommand =
        isCommand("achievements") && bodySplit.length === 1;
    const streakCommand = isCommand("streak") && bodySplit.length === 1;
    const vipsCommand = isCommand("vips") && bodySplit.length === 1;
    const storeCommand = isCommand("store");
    const pointReplyAwardCommand = isCommand(pointCommandName);
    const nominateCommand =
        isCommand("nominate") &&
        bodySplit.length === 2 &&
        isUserToken(bodySplit[1]);

    const leaderboardType =
        isCommand("leaderboard") && bodySplit.length === 2
            ? (bodySplit[1] ?? "").toLowerCase()
            : undefined;
    const xpLeaderboardCommand = leaderboardType === "xp";
    const weeklyXPLeaderboardCommand = leaderboardType === "weeklyxp";
    const monthlyXPLeaderboardCommand = leaderboardType === "monthlyxp";
    const coinLeaderboardCommand = leaderboardType === "coins";
    const repLeaderboardCommand = /^rep(utation)?$/i.test(
        leaderboardType ?? ""
    );
    const levelLeaderboardCommand = leaderboardType === "level";
    const streakLeaderboardCommand = leaderboardType === "streak";
    const leaderboardCommand =
        isCommand("leaderboard") && bodySplit.length === 1;

    const giveCoinsCommand =
        isCommand("givecoins") &&
        bodySplit.length === 3 &&
        isUserToken(bodySplit[1]) &&
        !!bodySplit[2];

    const isBotCommand =
        infoCommand ||
        helpCommand ||
        profileCommand ||
        userProfileCommand ||
        rankCommand ||
        userRankCommand ||
        balanceCommand ||
        achievementsCommand ||
        leaderboardCommand ||
        xpLeaderboardCommand ||
        weeklyXPLeaderboardCommand ||
        monthlyXPLeaderboardCommand ||
        coinLeaderboardCommand ||
        repLeaderboardCommand ||
        levelLeaderboardCommand ||
        streakLeaderboardCommand ||
        streakCommand ||
        vipsCommand ||
        storeCommand ||
        nominateCommand ||
        giveCoinsCommand;

    if (isBotCommand) {
        logger.info("🤖 Valid VIPBot command detected", {
            commandBody: commentBody,
            user: user.username,
            isMod,
        });

        if (infoCommand) {
            await executeInfoCommand(event, context, user, prefix);
        } else if (helpCommand) {
            await executeHelpCommand(event, user, isMod, prefix, context);
        } else if (profileCommand) {
            await executeProfileCommand(event, context, user);
        } else if (userProfileCommand) {
            await executeUserProfileCommand(event, context, bodySplit[1]!);
        } else if (rankCommand) {
            await executeRankCommand(event, context, user);
        } else if (userRankCommand) {
            const targetUsername = bodySplit[1]!.replace(/^u\//i, "");
            let target: User | undefined;

            try {
                target = await context.reddit.getUserByUsername(targetUsername);
            } catch (error) {
                logger.warn("⚠️ Rank target could not be resolved", {
                    targetUsername,
                    error,
                });
            }

            if (target) {
                await executeUserRankCommand(event, context, target);
            }
        } else if (balanceCommand) {
            await executeBalanceCommand(event, context, user);
        } else if (achievementsCommand) {
            await executeAchievementCommand(event, context, user);
        } else if (xpLeaderboardCommand) {
            await executeXPLeaderboardCommand(event, context, user);
        } else if (weeklyXPLeaderboardCommand) {
            await executeWeeklyXPLeaderboardCommand(event, context, user);
        } else if (monthlyXPLeaderboardCommand) {
            await executeMonthlyXPLeaderboardCommand(event, context, user);
        } else if (coinLeaderboardCommand) {
            await executeCoinLeaderboardCommand(event, context, user);
        } else if (repLeaderboardCommand) {
            await executeRepLeaderboardCommand(event, context, user);
        } else if (levelLeaderboardCommand) {
            await executeLevelLeaderboardCommand(event, context, user);
        } else if (streakLeaderboardCommand) {
            await executeStreakLeaderboardCommand(event, context, user);
        } else if (leaderboardCommand) {
            await executeLeaderboardCommand(event, context, user);
        } else if (streakCommand) {
            await executeStreakCommand(event, context, user);
        } else if (vipsCommand) {
            await executeVIPCommand(event, context, user);
        } else if (storeCommand) {
            await executeStoreCommand(event, context, user, bodySplit);
        } else if (nominateCommand) {
            await executeNominateCommand(event, context, user, isMod);
        } else if (giveCoinsCommand) {
            await executeGiveCoinsCommand(event, context, user, bodySplit);
        }

        return;
    }

    if (!("previousBody" in event)) {
        try {
            await new UserProfile(user, context).recordActivity("comment");
        } catch (error) {
            logger.error("❌ Failed to record VIPBot comment activity", {
                user: user.username,
                error,
            });
        }
    }

    // ============================================================
    // LEGACY MANAGED-FLAIR / AWARD CONTEXT
    //
    // Everything above this point is independent of the legacy point-award
    // system. Resolve the parent only when entering that legacy path.
    // ============================================================

    const parentComment = await getParentComment(event, context);

    if (!parentComment) {
        logger.warn(
            "❌ Parent comment could not be resolved for award processing",
            {
                commentId: event.comment.id,
                postId: event.post.id,
            }
        );
        return;
    }

    const recipient = parentComment.authorName;

    // ============================================================
    // AWARD / POINT PERMISSION
    // ============================================================

    const hasPermission = await userHasPermission(
        event,
        user.id,
        user.username,
        context,
        settings
    );

    if (!hasPermission) {
        logger.debug("❌ User does not have permission for award processing", {
            commentAuthor,
            commentId: event.comment.id,
        });
        return;
    }

    const recipientIsBot = excludedAccounts.includes(
        recipient.trim().toLowerCase()
    );

    // ============================================================
    // BOT USERS
    // ============================================================

    if (recipientIsBot) {
        await replyToVIPBotCommand(
            event,
            context,
            `You do not have permission to award a(n) ${pointName} to u/${recipient}.`
        );
        return;
    }

    // ============================================================
    // BLOCKED USERS
    // ============================================================

    const blockedUsers = (
        (settings[AppSetting.UsersWhoCannotAwardPoints] as string) ?? ""
    )
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);

    const isBlocked = blockedUsers.some(
        (blocked) => blocked.toLowerCase() === normalizedCommentAuthor
    );

    if (isBlocked) {
        logger.warn("🚫 User is blocked from awarding points", {
            commentAuthor,
            recipient,
            subreddit: event.subreddit.name,
        });

        const blockedTemplate =
            (settings[AppSetting.UsersWhoCannotAwardPointsMessage] as string) ??
            TemplateDefaults.UsersWhoCannotAwardPointsMessage;
        const notifyMode = (
            settings[AppSetting.NotifyOnBlockedUser] as string[]
        )?.[0];
        const blockedMessage = formatMessage(event, blockedTemplate, {
            name: pointName,
            commentAuthor,
            subreddit: event.subreddit.name,
        });

        if (notifyMode === NotifyOnBlockedUserReplyOptions.ReplyAsComment) {
            const message = await context.reddit.submitComment({
                id: event.comment.id,
                text: blockedMessage,
            });
            await message.distinguish();
        } else if (notifyMode === NotifyOnBlockedUserReplyOptions.ReplyByPM) {
            await context.reddit.sendPrivateMessage({
                to: commentAuthor,
                text: blockedMessage,
                subject:
                    `You do not have permission to award ${pointName}s ` +
                    `in r/${event.subreddit.name}`,
            });
        }

        return;
    }

    // ============================================================
    // CONFIGURABLE POINT-COMMAND REPLY AWARD — VIP POINTS + COINS
    // ============================================================

    if (pointReplyAwardCommand) {
        if (bodySplit.length !== 1) {
            await replyToVIPBotCommand(
                event,
                context,
                `Usage: \`${prefix}${pointCommandName}\`.`
            );
            return;
        }

        if ("previousBody" in event) {
            logger.debug(
                "Ignoring pointCommand reply award on edited comment",
                {
                    commentId: event.comment.id,
                    user: user.username,
                }
            );
            return;
        }

        if (normalizedCommentAuthor === recipient.trim().toLowerCase()) {
            await replyToVIPBotCommand(
                event,
                context,
                `You do not have permission to award yourself a(n) ${pointName}.`
            );
            return;
        }

        const coinsEnabled =
            (settings[AppSetting.CoinsEnabled] as boolean | undefined) ?? true;
        if (!coinsEnabled) {
            await replyToVIPBotCommand(
                event,
                context,
                "VIP Coins are disabled here, so the combined point reply award cannot be applied."
            );
            return;
        }

        let recipientUser: User | undefined;
        try {
            recipientUser = await context.reddit.getUserByUsername(recipient);
        } catch (error) {
            logger.warn("⚠️ Point-command recipient could not be resolved", {
                recipient,
                error,
            });
        }

        if (!recipientUser) {
            await replyToVIPBotCommand(
                event,
                context,
                "I couldn't resolve the author of the comment you replied to."
            );
            return;
        }

        const rewardKey =
            `vipbot:replyReward:point:${parentComment.id}:` +
            normalizedCommentAuthor;
        const legacyCoinRewardKey =
            `vipbot:replyReward:coin:${parentComment.id}:` +
            normalizedCommentAuthor;
        const legacyVipPointRewardKey =
            `vipbot:replyReward:vip-point:${parentComment.id}:` +
            normalizedCommentAuthor;

        const [alreadyRewarded, legacyCoinRewarded, legacyVipPointRewarded] =
            await Promise.all([
                context.redis.exists(rewardKey),
                context.redis.exists(legacyCoinRewardKey),
                context.redis.exists(legacyVipPointRewardKey),
            ]);

        if (alreadyRewarded || legacyCoinRewarded || legacyVipPointRewarded) {
            await replyToVIPBotCommand(
                event,
                context,
                "You already used your reply award on this comment."
            );
            return;
        }

        const awarderProfile = new UserProfile(user, context);
        const recipientProfile = new UserProfile(recipientUser, context);
        let coinAdded = false;
        let vipPointAdded = false;
        let receivedAdded = false;
        let givenAdded = false;
        let newCoinBalance = 0;
        let totalVipPoints = 0;

        try {
            newCoinBalance = await recipientProfile.adjustCoins(
                coinAwardAmount
            );
            coinAdded = true;
            totalVipPoints = await recipientProfile.adjustVipPoints(
                vipPointAwardAmount
            );
            vipPointAdded = true;
            await recipientProfile.adjustVipPointsReceived(vipPointAwardAmount);
            receivedAdded = true;
            await awarderProfile.adjustVipPointsGiven(vipPointAwardAmount);
            givenAdded = true;
        } catch (error) {
            try {
                if (givenAdded)
                    await awarderProfile.adjustVipPointsGiven(
                        -vipPointAwardAmount
                    );
                if (receivedAdded)
                    await recipientProfile.adjustVipPointsReceived(
                        -vipPointAwardAmount
                    );
                if (vipPointAdded)
                    await recipientProfile.adjustVipPoints(
                        -vipPointAwardAmount
                    );
                if (coinAdded)
                    await recipientProfile.adjustCoins(-coinAwardAmount);
            } catch (rollbackError) {
                logger.error("🚨 pointCommand reply award rollback failed", {
                    awarder: user.username,
                    recipient: recipientUser.username,
                    parentCommentId: parentComment.id,
                    rollbackError,
                });
            }

            logger.error("❌ pointCommand reply award failed", {
                awarder: user.username,
                recipient: recipientUser.username,
                parentCommentId: parentComment.id,
                vipPointAwardAmount,
                coinAwardAmount,
                error,
            });
            await replyToVIPBotCommand(
                event,
                context,
                "The combined VIP-point and coin reply award could not be applied."
            );
            return;
        }

        await context.redis.set(rewardKey, "1");
        await Promise.all([
            awarderProfile.recordPointCommandAwardGiven(),
            recipientProfile.recordPointCommandAwardReceived(),
        ]);
        await Promise.all([
            awarderProfile.evaluateAchievements(),
            recipientProfile.evaluateAchievements(),
        ]);
        await recipientProfile.addRecentAward({
            date: new Date().toISOString(),
            awardedBy: user.username,
            points: vipPointAwardAmount,
        });
        await recipientProfile.writeAudit(
            "point_command_reply_award",
            {
                vipPointAmount: vipPointAwardAmount,
                coinAmount: coinAwardAmount,
                sourceCommentId: parentComment.id,
                vipPoints: totalVipPoints,
                coinBalance: newCoinBalance,
            },
            user.username
        );

        const vipPointLabel = `VIP point${
            vipPointAwardAmount === 1 ? "" : "s"
        }`;
        const coinLabel = `coin${coinAwardAmount === 1 ? "" : "s"}`;
        await replyToVIPBotCommand(
            event,
            context,
            `⭐🪙 **u/${
                recipientUser.username
            }** received **${new Intl.NumberFormat("en").format(
                vipPointAwardAmount
            )} ${vipPointLabel}** and **${new Intl.NumberFormat("en").format(
                coinAwardAmount
            )} ${coinLabel}** from **u/${user.username}**.`
        );
        return;
    }

    // ============================================================
    // AUTOMATIC COMMENT INCREMENT — MANAGED FLAIR SCORE ONLY
    // ============================================================

    const incrementedKey = `incremented:${user.username}:${event.comment.id}`;
    const isCommentUpdate = "previousBody" in event;

    if (increment !== 0 && !isCommentUpdate) {
        const alreadyIncremented = await context.redis.exists(incrementedKey);

        if (!alreadyIncremented) {
            await context.redis.set(incrementedKey, "1");

            const currentScore = await getManagedFlairScore(user, context);

            if (!currentScore) {
                logger.error("Managed flair score could not be found", {
                    user: user.username,
                });
                return;
            }

            const newScore: ScoreResult = {
                score: currentScore.score + increment,
                userHasFlair: currentScore.userHasFlair,
                flairIsNumber: currentScore.flairIsNumber,
            };

            await setManagedFlairScoreOnCommentSubmit(
                event,
                context,
                user.username,
                newScore,
                settings
            );

            await context.redis.set(incrementedKey, "1");

            const userIsSuperUser = await getUserIsSuperuser(
                event,
                context,
                user.username
            );

            if (userIsSuperUser) {
                const superUserKey = `superUserMessageSent:${user.username}`;
                const messageAlreadySent = await context.redis.exists(
                    superUserKey
                );

                if (!messageAlreadySent) {
                    await context.redis.set(superUserKey, "1");

                    const threshold =
                        (settings[
                            AppSetting.AutoSuperuserThreshold
                        ] as number) ?? 0;
                    const superUserTemplate = formatMessage(
                        event,
                        (settings[
                            AppSetting.AutoSuperuserTemplate
                        ] as string) ?? TemplateDefaults.AutoSuperuserTemplate,
                        {
                            awardee: user.username,
                            threshold: new Intl.NumberFormat("en").format(
                                threshold
                            ),
                        }
                    );
                    const notifyOnSuperuser = ((settings[
                        AppSetting.NotifyOnAutoSuperuser
                    ] as string[]) ?? [AutoSuperuserReplyOptions.NoReply])[0];

                    if (
                        notifyOnSuperuser ===
                        AutoSuperuserReplyOptions.ReplyAsComment
                    ) {
                        const superUserMessage =
                            await context.reddit.submitComment({
                                id: event.comment.id,
                                text: superUserTemplate,
                            });
                        await superUserMessage.distinguish();
                    } else if (
                        notifyOnSuperuser ===
                        AutoSuperuserReplyOptions.ReplyByPM
                    ) {
                        await context.reddit.sendPrivateMessage({
                            to: user.username,
                            subject: `You are now a superuser in r/${await context.reddit.getCurrentSubredditName()}`,
                            text: superUserTemplate,
                        });
                    }
                }
            }
        }
    } else if (isCommentUpdate) {
        await context.redis.set(incrementedKey, "1");
    }

    // ============================================================
    // SELF AWARD
    // ============================================================

    const incrementedKeyExists = await context.redis.exists(incrementedKey);

    logger.info(`Should self award?`, {
        shouldSelfAward: !incrementedKeyExists ? "Yes" : "No",
    });

    if (
        normalizedCommentAuthor === recipient.trim().toLowerCase() &&
        !incrementedKeyExists
    ) {
        logger.warn("🛑 Self-award attempt detected", {
            commentAuthor,
            recipient,
            commentId: event.comment.id,
        });

        const selfAwardTemplate = formatMessage(
            event,
            TemplateDefaults.SelfAwardMessage,
            {
                awarder: commentAuthor,
                name: pointName,
            }
        );
        const notifyMode = (
            settings[AppSetting.NotifyOnSelfAward] as string[]
        )?.[0];

        if (notifyMode === NotifyOnSelfAwardReplyOptions.ReplyAsComment) {
            const selfAwardComment = await context.reddit.submitComment({
                id: event.comment.id,
                text: selfAwardTemplate,
            });
            await selfAwardComment.distinguish();
        } else if (notifyMode === NotifyOnSelfAwardReplyOptions.ReplyByPM) {
            await context.reddit.sendPrivateMessage({
                to: commentAuthor,
                text: selfAwardTemplate,
                subject: `You tried to award yourself a ${pointName}`,
            });
        }

        return;
    }

    // ============================================================
    // DUPLICATE AWARD
    // ============================================================

    const awardKey =
        `userAwardGiven:${parentComment.id}:` +
        `${event.post.id}:${event.subreddit.name}`;
    const alreadyAwarded = await context.redis.exists(awardKey);

    if (alreadyAwarded) {
        logger.warn("⚠️ Point already awarded", {
            commentAuthor,
            recipient,
            key: awardKey,
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
        }

        return;
    }
}
