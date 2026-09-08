import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { formatMessage } from "../utils/formatting";
import { logger } from "../utils/logger";
import { AppSetting, TemplateDefaults } from "./settings";
import { TriggerContext, User } from "@devvit/public-api";
import { UserProfile } from "./userProfile";

export async function executeInfoCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    prefix: string
) {
    if (!event.subreddit || !event.comment) return;
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

/**
 *
 * @param event CommentSubmit | CommentUpdate from \@devvit/protos
 * @param user User from \@devvit/public-api
 * @param isMod Gets if the user is a moderator or not
 * @param prefix Symbol(s) directly preceding all commands
 * @param context TriggerContext from \@devvit/public-api
 */
export async function executeHelpCommand(
    event: CommentSubmit | CommentUpdate,
    user: User,
    isMod: boolean,
    prefix: string,
    context: TriggerContext
) {
    logger.info("❓ Executing HELP command", {
        user: user.username,
        isMod,
    });

    if (!event.comment) return;

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

/**
 * @param event CommentSubmit | CommentUpdate from \@devvit/protos
 * @param context TriggerContext from \@devvit/public-api
 * @param user User from \@devvit/public-api
 */

export async function executeUserRankCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;
    logger.info("🏆 Executing USER RANK command", {
        target: user.username,
    });

    const userProfile = new UserProfile(user, context);
    const nextLevel = userProfile.getNextUserLevel();
    const xpToNextLevel = userProfile.getXpToNextLevel();
    //user specific
    let userRankMessage: string = `# u/${user.username}'s VIPBot Rank\n\n`;

    userRankMessage += `Next Level: ${nextLevel}\n\n`;
    userRankMessage += `Xp To Next Level: ${xpToNextLevel}`;

    const userRankComment = await context.reddit.submitComment({
        id: event.comment.id,
        text: userRankMessage,
    });

    userRankComment.distinguish();
    return;
}

export async function executeProfileCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("👤 Executing PROFILE command", {});

    if (!event.comment || !event.author) return;

    const settings = await context.settings.getAll();
    const symbol = (settings[AppSetting.PointSymbol] as string) ?? "";
    const userProfile = new UserProfile(user, context);
    let userProfileMessage: string = `# u/${user.username}'s VIPBot Profile\n\n`;
    const vipPoints = userProfile.getVipPoints();
    const subredditRank = userProfile.getSubRank();
    const pointsGiven = userProfile.getVipPointsGiven();
    const pointsReceived = userProfile.getVipPointsReceived();
    const currentLevel = userProfile.getCurrentUserLevel();
    const nextLevel = userProfile.getNextUserLevel();
    const xpToNextLevel = userProfile.getXpToNextLevel();

    if (symbol) {
        userProfileMessage += `## ${symbol} Reputation\n\n`;
        userProfileMessage +=
            userProfile.getReputation(
                vipPoints,
                subredditRank,
                pointsGiven,
                pointsReceived,
                currentLevel,
                nextLevel,
                xpToNextLevel
            ) + `\n\n`;
        userProfileMessage += `---\n\n\n`;
    } else {
        userProfileMessage += `## Reputation\n\n`;
        userProfileMessage +=
            userProfile.getReputation(
                vipPoints,
                subredditRank,
                pointsGiven,
                pointsReceived,
                currentLevel,
                nextLevel,
                xpToNextLevel
            ) + `\n\n`;

        userProfileMessage += `---\n\n\n`;
    }

    userProfileMessage += `## 📈 Progress\n\n`;
    userProfileMessage +=
        userProfile.getProgress(
            currentLevel,
            vipPoints,
            nextLevel,
            xpToNextLevel
        ) + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `## 🥇 Achievements\n\n`;
    userProfileMessage += userProfile.getAchievements() + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `## 📜 Recent Awards\n\n`;
    userProfileMessage += userProfile.getRecentAwards() + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `## 📊 Point History\n\n`;
    userProfileMessage += userProfile.getPointHistory + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `*Profile maintained automatically by VIPBot.*\n*Last updated: ${new Date()
        .getTime()
        .toString()}*`;

    await context.reddit.sendPrivateMessage({
        to: event.comment.author,
        subject: `${user.username}'s Profile Info`,
        text: userProfileMessage,
    });

    const userProfileSentMessage =
        (settings[AppSetting.UserProfileSentMessage] as string) ??
        TemplateDefaults.UserProfileSentMessage;
    const formattedUserProfileSentComment = formatMessage(
        event,
        userProfileSentMessage,
        { target: user.username }
    );

    const userProfileInfoSentComment = await context.reddit.submitComment({
        id: event.comment.id,
        text: formattedUserProfileSentComment,
    });

    userProfileInfoSentComment.distinguish();
    return;
}

export async function executeUserProfileCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    targetObj: string
) {
    let target: User | undefined;

    try {
        target = await context.reddit.getUserByUsername(targetObj);
    } catch {}

    if (!target) {
        logger.error(`Couldn't find target for executeUserProfileCommand()`);
        return;
    }

    logger.info("👤 Executing PROFILE command", {
        user: target.username,
    });

    if (!event.comment || !event.author) return;

    const settings = await context.settings.getAll();
    const symbol = (settings[AppSetting.PointSymbol] as string) ?? "";
    const targetProfile = new UserProfile(target, context);
    let userProfileMessage: string = `# u/${target.username}'s VIPBot Profile\n\n`;
    const vipPoints = targetProfile.getVipPoints();
    const subredditRank = targetProfile.getSubRank();
    const pointsGiven = targetProfile.getVipPointsGiven();
    const pointsReceived = targetProfile.getVipPointsReceived();
    const currentLevel = targetProfile.getCurrentUserLevel();
    const nextLevel = targetProfile.getNextUserLevel();
    const xpToNextLevel = targetProfile.getXpToNextLevel();

    if (symbol) {
        userProfileMessage += `## ${symbol} Reputation\n\n`;
        userProfileMessage +=
            targetProfile.getReputation(
                vipPoints,
                subredditRank,
                pointsGiven,
                pointsReceived,
                currentLevel,
                nextLevel,
                xpToNextLevel
            ) + `\n\n`;
        userProfileMessage += `---\n\n\n`;
    } else {
        userProfileMessage += `## Reputation\n\n`;
        userProfileMessage +=
            targetProfile.getReputation(
                vipPoints,
                subredditRank,
                pointsGiven,
                pointsReceived,
                currentLevel,
                nextLevel,
                xpToNextLevel
            ) + `\n\n`;

        userProfileMessage += `---\n\n\n`;
    }

    userProfileMessage += `## 📈 Progress\n\n`;
    userProfileMessage +=
        targetProfile.getProgress(
            currentLevel,
            vipPoints,
            nextLevel,
            xpToNextLevel
        ) + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `## 🥇 Achievements\n\n`;
    userProfileMessage += targetProfile.getAchievements() + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `## 📜 Recent Awards\n\n`;
    userProfileMessage += targetProfile.getRecentAwards() + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `## 📊 Point History\n\n`;
    userProfileMessage += targetProfile.getPointHistory + `\n\n`;
    userProfileMessage += `---\n\n\n`;

    userProfileMessage += `*Profile maintained automatically by VIPBot.*\n*Last updated: ${new Date()
        .getTime()
        .toString()}*`;
    return;
}

export async function executeRankCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("🏅 Executing RANK command", {
        user: user.username,
    });

    return;
}

export async function executeBalanceCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("💰 Executing BALANCE command", {
        user: user.username,
    });

    return;
}

export async function executeAchievementCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("🏆 Executing ACHIEVEMENTS command", {
        user: user.username,
    });

    return;
}

export async function executeXPLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("📊 Executing XP LEADERBOARD command", {
        user: user.username,
    });

    return;
}

export async function executeCoinLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("🪙 Executing COINS LEADERBOARD command", {
        user: user.username,
    });

    return;
}

export async function executeRepLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("⭐ Executing REP LEADERBOARD command", {
        user: user.username,
    });

    return;
}

export async function executeLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("📋 Executing LEADERBOARD command", {
        user: user.username,
    });

    return;
}

export async function executeStreakCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("🔥 Executing STREAK command", {
        user: user.username,
    });

    return;
}

export async function executeVIPCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("👑 Executing VIPS command", {
        user: user.username,
    });

    return;
}

export async function executeNominateCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    isMod: boolean
) {
    logger.info("🗳️ Executing NOMINATE command", {
        requester: user.username,
        target: user.username,
        isMod,
    });

    return;
}

export async function executeGiftPointsCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    logger.info("🎁 Executing GIFT command", {
        user: user.username,
        argument: bodySplit[2],
    });

    return;
}

export async function executeVIPAddDaysCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    logger.info("👑 Executing VIPADD command", {
        user: user.username,
        days: bodySplit[2],
    });

    return;
}

export async function executeSetXPCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    logger.info("✨ Executing SETXP command", {
        user: user.username,
        amount: bodySplit[2],
    });

    return;
}

export async function executeSetCoinsCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    logger.info("🪙 Executing SETCOINS command", {
        user: user.username,
        amount: bodySplit[2],
    });

    return;
}

export async function executeSetReputationCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    logger.info("⭐ Executing SETREP command", {
        user: user.username,
        amount: bodySplit[2],
    });

    return;
}

export async function executeSetLevelCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    logger.info("📈 Executing SETLEVEL command", {
        user: user.username,
        level: bodySplit[2],
    });

    return;
}
