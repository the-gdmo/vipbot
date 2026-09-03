import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { formatMessage } from "../utils/formatting";
import { logger } from "../utils/logger";
import { AppSetting, TemplateDefaults } from "./settings";
import { TriggerContext, User } from "@devvit/public-api";
import {
    getProfileAchievements,
    getProfilePointHistory,
    getProfileProgress,
    getProfileRecentAwards,
    getProfileReputation,
} from "./getters";

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
    logger.info("🏆 Executing USER RANK command", {
        requester: user.username,
        target: user.username,
    });

    return;
}

export async function executeProfileCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("👤 Executing PROFILE command", {
        user: user.username,
    });

    if (!event.comment || !event.author) return;

    const settings = await context.settings.getAll();
    const symbol = (settings[AppSetting.PointSymbol] as string) ?? "";

    let wikiContents: string = `# u/${user.username}'s VIPBot Profile\n\n`;

    if (symbol) {
        wikiContents += `## ${symbol} Reputation\n\n`;
        wikiContents += (await getProfileReputation(user, context)) + `\n\n`;
    } else {
        wikiContents += `## Reputation\n\n`;
        wikiContents += (await getProfileReputation(user, context)) + `\n\n`;
        wikiContents += `---\n\n`;
    }

    wikiContents += `## 📈 Progress\n\n`;
    wikiContents += (await getProfileProgress(user, context)) + `\n\n`;
    wikiContents += `---\n\n`;

    wikiContents += `## 🥇 Achievements\n\n`;
    wikiContents += (await getProfileAchievements(user, context)) + `\n\n`;
    wikiContents += `---\n\n`;

    wikiContents += `## 📜 Recent Awards\n\n`;
    wikiContents += (await getProfileRecentAwards(user, context)) + `\n\n`;
    wikiContents += `---\n\n`;

    wikiContents += `## 📊 Point History\n\n`;
    wikiContents += (await getProfilePointHistory(user, context)) + `\n\n`;
    wikiContents += `---\n\n`;

    wikiContents += `*Profile maintained automatically by VIPBot.*\n*Last updated: ${new Date()
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
    bodySplit: string
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
    bodySplit: string
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
    bodySplit: string
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
    bodySplit: string
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
    bodySplit: string
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
    bodySplit: string
) {
    logger.info("📈 Executing SETLEVEL command", {
        user: user.username,
        level: bodySplit[2],
    });

    return;
}
