import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { TriggerContext, User } from "@devvit/public-api";
import { formatMessage } from "../utils/formatting";
import { logger } from "../utils/logger";
import {
    AppSetting,
    TemplateDefaults,
    formatVIPStoreDuration,
    parseVIPStoreOptions,
} from "./settings";
import {
    LevelThreshold,
    RecentAward,
    UserProfile,
    UserProfileSnapshot,
} from "./userProfile";
import { getManagedFlairScore, getParentComment } from "../utils/common-utils";

const NOMINATION_SCORE_KEY = "vipbot:nominations:score";
const NOMINATION_BY_USER_HASH_KEY = "vipbot:nominations:by-user";
const DEFAULT_LEADERBOARD_SIZE = 10;

function normalizeUsername(username: string): string {
    return username.trim().replace(/^u\//i, "").replace(/^@/, "").toLowerCase();
}

function displayUsername(username: string): string {
    return username.trim().replace(/^u\//i, "").replace(/^@/, "");
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
    }).format(value);
}

async function featureEnabled(
    context: TriggerContext,
    setting: AppSetting,
    fallback = true
): Promise<boolean> {
    const settings = await context.settings.getAll();
    return (settings[setting] as boolean | undefined) ?? fallback;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
    if (!value || !/^\d+$/.test(value.trim())) return undefined;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function formatRemainingTime(expiryTimestamp: number): string {
    const remainingMs = expiryTimestamp - Date.now();
    if (remainingMs <= 0) return "expired";

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (!days && minutes) parts.push(`${minutes}m`);
    if (!days && !hours && seconds) parts.push(`${seconds}s`);

    return parts.join(" ") || "<1s";
}

async function replyToCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    text: string
): Promise<void> {
    if (!event.comment || !event.author) return;

    const settings = await context.settings.getAll();
    const prefix =
        (
            (settings[AppSetting.CommandPrefix] as string | undefined) ?? "/"
        ).trim() || "/";
    const pointCommandName = (
        (settings[AppSetting.PointCommand] as string | undefined) ??
        TemplateDefaults.PointCommand
    ).trim();
    const pointName =
        (
            (settings[AppSetting.PointName] as string | undefined) ?? "point"
        ).trim() || "point";
    const pointSymbol = (
        (settings[AppSetting.PointSymbol] as string | undefined) ?? ""
    ).trim();
    const vipFlairTemplate = (
        (settings[AppSetting.FlairFormatting] as string | undefined) ??
        "👑 VIP • {rank}"
    ).trim();
    const leaderboardName =
        (
            (settings[AppSetting.LeaderboardName] as string | undefined) ??
            "leaderboard"
        ).trim() || "leaderboard";
    const helpPageName = (
        (settings[AppSetting.PointSystemHelpPage] as string | undefined) ?? ""
    )
        .trim()
        .replace(/^\/+|\/+$/g, "");

    const body = event.comment.body?.trim() ?? "";
    const escapedPointCommand = pointCommandName.replace(/[.*]/g, "\\$&");

    const pointCommandMatch = body.match(
        new RegExp(`(?:^|\\s)(${escapedPointCommand})(?=\\s|[.!?,;:]|$)`, "i")
    );

    const genericCommandMatch = body.match(
        new RegExp(`(?:^|\\s)([a-zA-Z][a-zA-Z0-9_-]*)(?=\\s|[.!?,;:]|$)`, "i")
    );

    const command = pointCommandMatch?.[1] ?? genericCommandMatch?.[1] ?? `vip`;

    const username = event.author.name;
    let requester: User | undefined;

    try {
        requester = await context.reddit.getUserByUsername(username);
    } catch (error) {
        logger.warn("⚠️ Could not resolve requester in replyToCommand()", {
            user: username,
            error,
        });
    }

    if (!requester) {
        logger.warn(
            "⚠️ Command response aborted because requester could not be resolved",
            {
                user: username,
                command,
                subreddit: context.subredditName,
            }
        );
        return;
    }

    const subreddit = event.subreddit?.name ?? context.subredditName ?? "";
    const explicitTargetMatch = body.match(
        /(?:^|\s)((?:u\/|@)[a-zA-Z0-9_-]+)(?=\s|[.!?,;:]|$)/i
    );
    const explicitTargetToken = explicitTargetMatch?.[1];

    let targetUser: User | undefined;
    let requestedTargetName = explicitTargetToken
        ? displayUsername(explicitTargetToken)
        : requester.username;

    if (pointCommandMatch) {
        try {
            const parentComment = await getParentComment(event, context);
            if (parentComment?.authorName) {
                requestedTargetName = parentComment.authorName;
                targetUser = await resolveUser(
                    context,
                    parentComment.authorName
                );
            }
        } catch (error) {
            logger.warn("⚠️ Could not resolve parent-comment awardee", {
                user: username,
                command,
                commentId: event.comment.id,
                error,
            });
        }
    }

    if (!targetUser && explicitTargetToken) {
        targetUser = await resolveUser(context, explicitTargetToken);
    }

    if (!targetUser && !explicitTargetToken && !pointCommandMatch) {
        targetUser = requester;
    }

    if (!targetUser) return;

    const targetProfile = new UserProfile(targetUser, context);
    await targetProfile.syncLeaderboards();

    const [targetSnapShot, targetPlace] = await Promise.all([
        targetProfile.getSnapshot(),
        getLeaderboardPosition(
            context,
            UserProfile.XP_LEADERBOARD_KEY,
            requester.username
        ),
    ]);

    let targetTotal = "N/A";
    let targetName = targetUser?.username ?? requestedTargetName;

    if (targetUser) {
        try {
            const managedScore = await getManagedFlairScore(
                targetUser,
                context
            );
            if (managedScore) {
                targetTotal = formatNumber(managedScore.score);
            }
        } catch (error) {
            logger.warn("⚠️ Could not load target managed-flair score", {
                requester: requester.username,
                target: targetUser.username,
                command,
                error,
            });
        }
    }

    let awardee: User | undefined;
    const parentComment = await getParentComment(event, context);
    if (!parentComment) return;
    try {
        awardee = await context.reddit.getUserByUsername(parentComment.authorName);
    } catch {
        //
    }

    if (!awardee) return;

    const vipExpiration = targetSnapShot.vipExpiration;
    const hasVIP =
        vipExpiration === "permanent" ||
        (typeof vipExpiration === "number" && vipExpiration > Date.now());
    const vipStatus =
        vipExpiration === "permanent"
            ? "Permanent"
            : typeof vipExpiration === "number" && vipExpiration > Date.now()
            ? "Active"
            : "Inactive";
    const vipExpires =
        vipExpiration === "permanent"
            ? "Never"
            : typeof vipExpiration === "number" && vipExpiration > Date.now()
            ? new Date(vipExpiration).toUTCString()
            : "N/A";
    const vipDuration =
        vipExpiration === "permanent"
            ? "Permanent"
            : typeof vipExpiration === "number" && vipExpiration > Date.now()
            ? formatRemainingTime(vipExpiration)
            : "None";

    const wikiBase = subreddit
        ? `https://www.reddit.com/r/${subreddit}/wiki`
        : "https://www.reddit.com/wiki";
    const leaderboard = `${wikiBase}/${leaderboardName.replace(
        /^\/+|\/+$/g,
        ""
    )}`;
    const helpPage = helpPageName ? `${wikiBase}/${helpPageName}` : wikiBase;
    const markdownGuide = "https://www.reddit.com/wiki/markdown";
    const permalink = event.comment.permalink ?? "";
    const title = event.post?.title ?? "";

    const placeholders: Record<string, string> = {
        prefix,
        username: requester.username,
        author: event.author.name,
        subreddit,
        level: formatNumber(targetSnapShot.currentLevel),
        rank: targetSnapShot.rankName,
        xp: formatNumber(targetSnapShot.xp),
        userCoins: formatNumber(targetSnapShot.coins),
        coins: formatNumber(
            (settings[AppSetting.PointCommandVIPPointAmount] as number) ?? 0
        ),
        reputation: formatNumber(targetSnapShot.reputation),
        place:
            targetPlace !== undefined ? formatNumber(targetPlace) : "Unranked",
        streak: formatNumber(targetSnapShot.streak),
        vip: hasVIP ? "Yes" : "No",
        vipStatus,
        vipPoints: formatNumber(
            (settings[AppSetting.PointCommandVIPPointAmount] as number) ?? 0
        ),
        vipExpires,
        vipDuration,
        vipFlair: vipFlairTemplate,
        requester: requester.username,
        target: targetName,
        awardee: awardee.username,
        awarder: requester.username,
        total: targetTotal,
        symbol: pointSymbol,
        name: pointName,
        permalink,
        title,
        markdownGuide,
        leaderboard,
        pointCommand: command,
        helpPage,
    };

    if (hasVIP && vipFlairTemplate) {
        let formattedVIPFlair = vipFlairTemplate;

        for (const [key, value] of Object.entries(placeholders)) {
            const doubleRegex = new RegExp(`{{${key}}}`, "gi");
            const singleRegex = new RegExp(`{${key}}`, "gi");

            formattedVIPFlair = formattedVIPFlair
                .replace(doubleRegex, value)
                .replace(singleRegex, value);
        }

        placeholders.vipFlair = formattedVIPFlair;
    }

    logger.debug("📨 Sending command response via DM", {
        user: username,
        requester: placeholders.requester,
        target: placeholders.target,
        awardee: placeholders.awardee,
        awarder: placeholders.awarder,
        command,
        subreddit,
        commentId: event.comment.id,
        placeholders,
    });

    try {
        await context.reddit.sendPrivateMessage({
            to: username,
            subject: `Response to ${prefix}${command} in r/${subreddit}`,
            text: formatMessage(event, text, placeholders),
        });

        logger.info("✅ Command response DM sent", {
            user: username,
            command,
            subreddit,
        });
    } catch (error) {
        await logger.error("❌ Failed to send command response DM", {
            user: username,
            command,
            subreddit,
            error,
        });
        return;
    }

    try {
        const comment = await context.reddit.submitComment({
            id: event.comment.id,
            text: formatMessage(
                event,
                `Bot response sent to your DMs.`,
                placeholders
            ),
        });

        await comment.distinguish();

        logger.debug("✅ Command DM confirmation comment posted", {
            user: username,
            command,
            commentId: event.comment.id,
        });
    } catch (error) {
        await logger.error("❌ Failed to post command DM confirmation", {
            user: username,
            command,
            commentId: event.comment.id,
            error,
        });
    }
}

async function resolveUser(
    context: TriggerContext,
    usernameOrToken: string
): Promise<User | undefined> {
    const username = displayUsername(usernameOrToken);
    if (!username) return undefined;

    try {
        return await context.reddit.getUserByUsername(username);
    } catch (error) {
        logger.warn("⚠️ Could not resolve Reddit user", {
            username,
            error,
        });
        return undefined;
    }
}

async function getConfiguredLeaderboardSize(
    context: TriggerContext
): Promise<number> {
    const settings = await context.settings.getAll();
    const configured =
        (settings[AppSetting.LeaderboardSize] as number | undefined) ??
        DEFAULT_LEADERBOARD_SIZE;
    return Number.isSafeInteger(configured) && configured > 0
        ? Math.min(configured, 1000)
        : DEFAULT_LEADERBOARD_SIZE;
}

function resolveLevelFromThresholds(
    xp: number,
    thresholds: LevelThreshold[]
): LevelThreshold {
    let current = thresholds[0] ?? { level: 1, xp: 0, name: "Newcomer" };
    for (const threshold of thresholds) {
        if (xp < threshold.xp) break;
        current = threshold;
    }
    return current;
}

async function getLeaderboardLines(
    context: TriggerContext,
    key: string,
    unit: string,
    limit?: number
): Promise<string[]> {
    const resolvedLimit =
        limit ?? (await getConfiguredLeaderboardSize(context));
    const entries = await context.redis.zRange(key, 0, resolvedLimit - 1, {
        by: "rank",
        reverse: true,
    });

    return entries.map((entry, index) => {
        const username = displayUsername(entry.member);
        return `${index + 1}. **u/${username}** — ${formatNumber(entry.score)}${
            unit ? ` ${unit}` : ""
        }`;
    });
}

async function getLeaderboardPosition(
    context: TriggerContext,
    key: string,
    username: string
): Promise<number | undefined> {
    const member = normalizeUsername(username);
    const ascendingRank = await context.redis.zRank(key, member);

    if (ascendingRank === undefined || ascendingRank === null) {
        return undefined;
    }

    const total = await context.redis.zCard(key);
    return total - ascendingRank;
}

function formatAchievements(achievements: string[]): string {
    if (!achievements.length) return "No achievements yet.";
    return achievements.map((achievement) => `- ${achievement}`).join("\n");
}

function formatRecentAwards(awards: RecentAward[]): string {
    if (!awards.length) return "No recent awards yet.";

    return awards
        .map(
            (award) =>
                `- **${award.date}** — ${formatNumber(award.points)} point${
                    award.points === 1 ? "" : "s"
                } from u/${displayUsername(award.awardedBy)}`
        )
        .join("\n");
}

function buildProfileMessage(snapshot: UserProfileSnapshot): string {
    const vipStatus =
        snapshot.vipExpiration === "permanent"
            ? "Permanent"
            : typeof snapshot.vipExpiration === "number" &&
              snapshot.vipExpiration > Date.now()
            ? `Active (${formatRemainingTime(snapshot.vipExpiration)})`
            : "Inactive";

    return (
        `## u/${snapshot.username}'s VIPBot Profile\n\n` +
        `## ⭐ Reputation\n\n` +
        `**Reputation:** ${formatNumber(snapshot.reputation)}\n\n` +
        `**VIP Points:** ${formatNumber(snapshot.vipPoints)}\n\n` +
        `**Points Given:** ${formatNumber(snapshot.vipPointsGiven)}\n\n` +
        `**Points Received:** ${formatNumber(snapshot.vipPointsReceived)}\n\n` +
        `---\n\n` +
        `## 📈 Progress\n\n` +
        `**Level:** ${formatNumber(snapshot.currentLevel)} — ${
            snapshot.rankName
        }\n\n` +
        `**XP:** ${formatNumber(snapshot.xp)}\n\n` +
        `**Next Level:** ${formatNumber(snapshot.nextLevel)}\n\n` +
        `**XP To Next Level:** ${formatNumber(snapshot.xpToNextLevel)}\n\n` +
        `**Coins:** ${formatNumber(snapshot.coins)}\n\n` +
        `**Current Streak:** ${formatNumber(snapshot.streak)} day${
            snapshot.streak === 1 ? "" : "s"
        }\n\n` +
        `**Longest Streak:** ${formatNumber(snapshot.longestStreak)} day${
            snapshot.longestStreak === 1 ? "" : "s"
        }\n\n` +
        `**VIP Status:** ${vipStatus}\n\n` +
        `---\n\n` +
        `## 🥇 Achievements\n\n` +
        `**Unlocked:** ${formatNumber(
            snapshot.achievements.length
        )} / ${formatNumber(snapshot.achievementCatalogSize)}\n\n` +
        `${formatAchievements(snapshot.achievements)}\n\n` +
        `---\n\n` +
        `## 📜 Recent Awards\n\n${formatRecentAwards(
            snapshot.recentAwards
        )}\n\n` +
        `---\n\n` +
        `## 📊 Point History\n\n` +
        `**Today:** ${formatNumber(snapshot.pointHistory.today)}\n\n` +
        `**This Week:** ${formatNumber(snapshot.pointHistory.thisWeek)}\n\n` +
        `**This Month:** ${formatNumber(snapshot.pointHistory.thisMonth)}\n\n` +
        `**This Year:** ${formatNumber(snapshot.pointHistory.thisYear)}\n\n` +
        `**All Time:** ${formatNumber(snapshot.pointHistory.allTime)}\n\n` +
        `---\n\n` +
        `*Profile maintained automatically by VIPBot.*\n` +
        `*Last updated: ${
            snapshot.lastUpdatedAt !== undefined
                ? new Date(snapshot.lastUpdatedAt).toUTCString()
                : "Unknown"
        }*`
    );
}

async function sendProfileDM(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    target: User
): Promise<void> {
    const targetProfile = new UserProfile(target, context);
    const snapshot = await targetProfile.getSnapshot();
    const message = buildProfileMessage(snapshot);

    const confirmation = formatMessage(event, message, {
        target: target.username,
    });

    await replyToCommand(event, context, confirmation);
}

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

    const message = formatMessage(event, TemplateDefaults.DMInfoMessage, {
        username: user.username,
        subreddit: event.subreddit.name,
        prefix,
        permalink: event.comment.permalink,
    });

    await context.reddit.sendPrivateMessage({
        to: user.username,
        subject: "VIP Bot Info",
        text: message,
    });

    const confirmation = formatMessage(
        event,
        TemplateDefaults.DMInfoMessage,
        {}
    );

    await replyToCommand(event, context, confirmation);
}

export async function executeHelpCommand(
    event: CommentSubmit | CommentUpdate,
    user: User,
    isMod: boolean,
    context: TriggerContext
) {
    if (!event.comment) return;

    logger.info("❓ Executing HELP command", {
        user: user.username,
        isMod,
    });

    const template = isMod
        ? TemplateDefaults.ModDMHelpMessage
        : TemplateDefaults.NormalUserDMHelpMessage;

    const confirmation = formatMessage(event, template, {});

    await replyToCommand(event, context, confirmation);
}

export async function executeUserRankCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.XPEnabled))) {
        await replyToCommand(
            event,
            context,
            "XP and levels are disabled here."
        );
        return;
    }

    logger.info("🏆 Executing USER RANK command", {
        target: user.username,
    });

    const profile = new UserProfile(user, context);
    await profile.syncLeaderboards();

    const [xp, level, rankName, nextLevel, xpToNextLevel, xpRank] =
        await Promise.all([
            profile.getXP(),
            profile.getCurrentUserLevel(),
            profile.getCurrentLevelTitle(),
            profile.getNextUserLevel(),
            profile.getXpToNextLevel(),
            getLeaderboardPosition(
                context,
                UserProfile.XP_LEADERBOARD_KEY,
                user.username
            ),
        ]);

    const message =
        `# 🏆 u/${user.username}'s XP Rank\n\n` +
        `**XP Rank:** ${xpRank ? `#${xpRank}` : "Unranked"}\n\n` +
        `**XP:** ${formatNumber(xp)}\n\n` +
        `**Level:** ${formatNumber(level)} — ${rankName}\n\n` +
        `**Next Level:** ${formatNumber(nextLevel)}\n\n` +
        `**XP To Next Level:** ${formatNumber(xpToNextLevel)}`;

    await replyToCommand(event, context, message);
}

export async function executeProfileCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment || !event.author) return;

    logger.info("👤 Executing PROFILE command", {
        user: user.username,
    });

    await sendProfileDM(event, context, user);
}

export async function executeUserProfileCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    targetObj: string
) {
    if (!event.comment || !event.author) return;

    const target = await resolveUser(context, targetObj);
    if (!target) {
        await replyToCommand(
            event,
            context,
            `I couldn't find **${targetObj}**.`
        );
        return;
    }

    const requester = await resolveUser(context, event.author.name);
    if (!requester) {
        logger.error(
            "Couldn't resolve requester for executeUserProfileCommand()",
            {
                author: event.author.name,
            }
        );
        return;
    }

    logger.info("👤 Executing USER PROFILE command", {
        requester: requester.username,
        target: target.username,
    });

    await sendProfileDM(event, context, target);
}

export async function executeRankCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    return executeUserRankCommand(event, context, user);
}

export async function executeBalanceCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.CoinsEnabled))) {
        await replyToCommand(event, context, "VIP Coins are disabled here.");
        return;
    }

    const coins = await new UserProfile(user, context).getCoins();
    await replyToCommand(
        event,
        context,
        `# 💰 u/${user.username}'s Coin Balance\n\n**Coins:** ${formatNumber(
            coins
        )}`
    );
}

export async function executeAchievementCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.AchievementsEnabled))) {
        await replyToCommand(event, context, "Achievements are disabled here.");
        return;
    }

    logger.info("🏆 Executing ACHIEVEMENTS command", {
        user: user.username,
    });

    const profile = new UserProfile(user, context);
    await profile.evaluateAchievements();
    const [achievements, catalog] = await Promise.all([
        profile.getAchievements(),
        profile.getAchievementCatalog(),
    ]);

    await replyToCommand(
        event,
        context,
        `# 🏆 u/${user.username}'s Achievements\n\n` +
            `**Unlocked:** ${formatNumber(
                achievements.length
            )} / ${formatNumber(catalog.length)}\n\n` +
            `${formatAchievements(achievements)}`
    );
}

export async function executeXPLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.XPEnabled))) {
        await replyToCommand(
            event,
            context,
            "XP and levels are disabled here."
        );
        return;
    }

    logger.info("📊 Executing XP LEADERBOARD command", {
        user: user.username,
    });

    await new UserProfile(user, context).syncLeaderboards();

    const [lines] = await Promise.all([
        getLeaderboardLines(context, UserProfile.XP_LEADERBOARD_KEY, "XP"),
    ]);

    let message = `# 📊 XP Leaderboard\n\n`;
    message += lines.length ? lines.join("\n\n") : "No XP data yet.";

    await replyToCommand(event, context, message);
}

export async function executeCoinLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.CoinsEnabled))) {
        await replyToCommand(event, context, "VIP Coins are disabled here.");
        return;
    }

    logger.info("🪙 Executing COINS LEADERBOARD command", {
        user: user.username,
    });

    await new UserProfile(user, context).syncLeaderboards();

    const [lines] = await Promise.all([
        getLeaderboardLines(context, UserProfile.COIN_LEADERBOARD_KEY, "coins"),
    ]);

    let message = `# 🪙 Coins Leaderboard\n\n`;
    message += lines.length ? lines.join("\n\n") : "No coin data yet.";

    await replyToCommand(event, context, message);
}

export async function executeRepLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.ReputationEnabled))) {
        await replyToCommand(event, context, "Reputation is disabled here.");
        return;
    }

    logger.info("⭐ Executing REP LEADERBOARD command", {
        user: user.username,
    });

    await new UserProfile(user, context).syncLeaderboards();

    const [lines] = await Promise.all([
        getLeaderboardLines(
            context,
            UserProfile.REP_LEADERBOARD_KEY,
            "reputation"
        ),
    ]);

    let message = `# ⭐ Reputation Leaderboard\n\n`;
    message += lines.length ? lines.join("\n\n") : "No reputation data yet.";

    await replyToCommand(event, context, message);
}

export async function executeWeeklyXPLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    _: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.XPEnabled))) {
        await replyToCommand(
            event,
            context,
            "XP and levels are disabled here."
        );
        return;
    }

    const [lines] = await Promise.all([
        getLeaderboardLines(
            context,
            UserProfile.getWeeklyXPLeaderboardKey(),
            "XP"
        ),
    ]);

    let message = `# 📅 Weekly XP Leaderboard\n\n`;
    message += lines.length ? lines.join("\n\n") : "No weekly XP data yet.";
    await replyToCommand(event, context, message);
}

export async function executeMonthlyXPLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.XPEnabled))) {
        await replyToCommand(
            event,
            context,
            "XP and levels are disabled here."
        );
        return;
    }

    const key = UserProfile.getMonthlyXPLeaderboardKey();
    const [lines] = await Promise.all([
        getLeaderboardLines(context, key, "XP"),
        getLeaderboardPosition(context, key, user.username),
    ]);

    let message = `# 🗓️ Monthly XP Leaderboard\n\n`;
    message += lines.length ? lines.join("\n\n") : "No monthly XP data yet.";

    await replyToCommand(event, context, message);
}

export async function executeLevelLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.XPEnabled))) {
        await replyToCommand(
            event,
            context,
            "XP and levels are disabled here."
        );
        return;
    }

    const profile = new UserProfile(user, context);
    await profile.syncLeaderboards();
    const [thresholds, limit] = await Promise.all([
        profile.getLevelThresholds(),
        getConfiguredLeaderboardSize(context),
    ]);
    const entries = await context.redis.zRange(
        UserProfile.XP_LEADERBOARD_KEY,
        0,
        limit - 1,
        { by: "rank", reverse: true }
    );

    const lines = entries.map((entry, index) => {
        const level = resolveLevelFromThresholds(entry.score, thresholds);
        return `${index + 1}. **u/${displayUsername(entry.member)}** — Level ${
            level.level
        } (${level.name}) — ${formatNumber(entry.score)} XP`;
    });

    await replyToCommand(
        event,
        context,
        `# 📈 Level Leaderboard\n\n${
            lines.length ? lines.join("\n\n") : "No level data yet."
        }`
    );
}

export async function executeStreakLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.StreaksEnabled))) {
        await replyToCommand(
            event,
            context,
            "Activity streaks are disabled here."
        );
        return;
    }

    await new UserProfile(user, context).syncLeaderboards();
    const [lines] = await Promise.all([
        getLeaderboardLines(
            context,
            UserProfile.STREAK_LEADERBOARD_KEY,
            "days"
        ),
    ]);

    let message = `# 🔥 Streak Leaderboard\n\n`;
    message += lines.length ? lines.join("\n\n") : "No streak data yet.";
    await replyToCommand(event, context, message);
}

export async function executeLeaderboardCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    return executeXPLeaderboardCommand(event, context, user);
}

export async function executeStreakCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.StreaksEnabled))) {
        await replyToCommand(
            event,
            context,
            "Activity streaks are disabled here."
        );
        return;
    }

    logger.info("🔥 Executing STREAK command", {
        user: user.username,
    });

    const profile = new UserProfile(user, context);
    await profile.syncLeaderboards();

    const [streak, longestStreak, streakRank] = await Promise.all([
        profile.getStreak(),
        profile.getLongestStreak(),
        getLeaderboardPosition(
            context,
            UserProfile.STREAK_LEADERBOARD_KEY,
            user.username
        ),
    ]);

    const message =
        `# 🔥 u/${user.username}'s Streak\n\n` +
        `**Current Streak:** ${formatNumber(streak)} day${
            streak === 1 ? "" : "s"
        }\n\n` +
        `**Longest Streak:** ${formatNumber(longestStreak)} day${
            longestStreak === 1 ? "" : "s"
        }\n\n` +
        `**Streak Rank:** ${streakRank ? `#${streakRank}` : "Unranked"}`;

    await replyToCommand(event, context, message);
}

export async function executeVIPCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    if (!event.comment) return;

    if (!(await featureEnabled(context, AppSetting.VIPEnabled))) {
        await replyToCommand(event, context, "VIP status is disabled here.");
        return;
    }

    logger.info("👑 Executing VIPS command", {
        user: user.username,
    });

    const activeVIPs = await UserProfile.getActiveVIPs(context);

    let message = `# 👑 Active VIPs\n\n`;

    if (!activeVIPs.length) {
        message += "There are currently no active VIPs.";
    } else {
        message += activeVIPs
            .slice(0, 50)
            .map((vip, index) => {
                const status = vip.permanent
                    ? "Permanent"
                    : formatRemainingTime(vip.expiry!);
                return `${index + 1}. **u/${displayUsername(
                    vip.username
                )}** — ${status}`;
            })
            .join("\n");
    }

    await replyToCommand(event, context, message);
}

export async function executeStoreCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    if (!event.comment) return;

    const settings = await context.settings.getAll();
    const storeEnabled =
        (settings[AppSetting.VIPStoreEnabled] as boolean | undefined) ?? true;
    const vipEnabled =
        (settings[AppSetting.VIPEnabled] as boolean | undefined) ?? true;
    const coinsEnabled =
        (settings[AppSetting.CoinsEnabled] as boolean | undefined) ?? true;
    const prefix = (settings[AppSetting.CommandPrefix] as string) ?? "/";

    if (!storeEnabled) {
        await replyToCommand(event, context, "The VIP Store is disabled here.");
        return;
    }
    if (!vipEnabled) {
        await replyToCommand(event, context, "VIP status is disabled here.");
        return;
    }
    if (!coinsEnabled) {
        await replyToCommand(
            event,
            context,
            "VIP Coins are disabled here, so store purchases are unavailable."
        );
        return;
    }

    const configured =
        (settings[AppSetting.VIPStoreOptions] as string | undefined) ??
        TemplateDefaults.VIPStoreOptions;
    let options = parseVIPStoreOptions(configured);
    if (!options.length) {
        options = parseVIPStoreOptions(TemplateDefaults.VIPStoreOptions);
    }

    if (!options.length) {
        await replyToCommand(
            event,
            context,
            "The VIP Store does not currently have any valid purchase options."
        );
        return;
    }

    const profile = new UserProfile(user, context);
    const [coins, expiration] = await Promise.all([
        profile.getCoins(),
        profile.getVIPExpiration(),
    ]);

    const optionLines = options.map(
        (option, index) =>
            `${index + 1}. **${
                option.durationToken
            }** (${formatVIPStoreDuration(
                option.duration,
                option.unit
            )}) — ${formatNumber(option.cost)} coin${
                option.cost === 1 ? "" : "s"
            }`
    );

    if (bodySplit.length === 1) {
        const vipStatus =
            expiration === "permanent"
                ? "Permanent VIP"
                : typeof expiration === "number" && expiration > Date.now()
                ? `Active VIP (${formatRemainingTime(expiration)})`
                : "No active VIP";

        await replyToCommand(
            event,
            context,
            `# 👑 VIP Store\n\n` +
                `Your balance: **${formatNumber(coins)} coin${
                    coins === 1 ? "" : "s"
                }**\n\n` +
                `Your VIP status: **${vipStatus}**\n\n` +
                `${optionLines.join("\n\n")}\n\n` +
                `Purchase with \`${prefix}store <option number>\`.`
        );
        return;
    }

    if (bodySplit.length !== 2 || !/^\d+$/.test(bodySplit[1] ?? "")) {
        await replyToCommand(
            event,
            context,
            `Usage: \`${prefix}store\` to view the store or \`${prefix}store <option number>\` to buy VIP time.`
        );
        return;
    }

    const selection = Number(bodySplit[1]);
    const option =
        Number.isSafeInteger(selection) && selection > 0
            ? options[selection - 1]
            : undefined;

    if (!option) {
        await replyToCommand(
            event,
            context,
            `That store option does not exist. Use \`${prefix}store\` to see the current options.`
        );
        return;
    }

    if (expiration === "permanent") {
        await replyToCommand(
            event,
            context,
            "You already have permanent VIP status, so there is no VIP time to purchase."
        );
        return;
    }

    if (coins < option.cost) {
        await replyToCommand(
            event,
            context,
            `You need **${formatNumber(option.cost)} coins** for **${
                option.label
            }**, but you only have **${formatNumber(coins)}**.`
        );
        return;
    }

    let updatedCoins: number;
    try {
        updatedCoins = await profile.adjustCoins(-option.cost);
        if (updatedCoins < 0) {
            await profile.adjustCoins(option.cost);
            await replyToCommand(
                event,
                context,
                "Your coin balance changed before the purchase completed. No VIP time was purchased."
            );
            return;
        }
    } catch (error) {
        logger.error("❌ VIP Store coin deduction failed", {
            user: user.username,
            option,
            error,
        });
        await replyToCommand(
            event,
            context,
            "The purchase could not be completed because your coin balance could not be updated."
        );
        return;
    }

    const purchaseStartedAt = Date.now();
    const purchaseBase =
        typeof expiration === "number" && expiration > purchaseStartedAt
            ? expiration
            : purchaseStartedAt;

    let newExpiration: number | "permanent";
    try {
        newExpiration = await profile.addVIPDuration(
            option.duration,
            option.unit
        );
    } catch (error) {
        try {
            await profile.adjustCoins(option.cost);
        } catch (rollbackError) {
            logger.error("🚨 VIP Store refund failed", {
                user: user.username,
                option,
                rollbackError,
            });
        }

        logger.error("❌ VIP Store VIP grant failed", {
            user: user.username,
            option,
            error,
        });
        await replyToCommand(
            event,
            context,
            "The purchase could not be completed. VIP time was not granted and a coin refund was attempted."
        );
        return;
    }

    if (newExpiration === "permanent") {
        try {
            await profile.adjustCoins(option.cost);
        } catch (refundError) {
            logger.error("🚨 VIP Store permanent-VIP refund failed", {
                user: user.username,
                option,
                refundError,
            });
        }

        await replyToCommand(
            event,
            context,
            "Your VIP status became permanent before the purchase completed, so no additional VIP time was needed and a coin refund was attempted."
        );
        return;
    }

    const purchasedDurationMilliseconds = Math.max(
        0,
        newExpiration - purchaseBase
    );
    await profile.recordStorePurchase(
        purchasedDurationMilliseconds,
        option.cost
    );
    await profile.evaluateAchievements();

    await profile.writeAudit(
        "vip_store_purchase",
        {
            duration: option.duration,
            unit: option.unit,
            durationToken: option.durationToken,
            purchasedDurationMilliseconds,
            cost: option.cost,
            label: option.label,
            coinBalance: updatedCoins,
            expiration: newExpiration,
        },
        user.username
    );

    const status = formatRemainingTime(newExpiration);

    await replyToCommand(
        event,
        context,
        `# 👑 VIP Purchased\n\n` +
            `You purchased **${option.label}** for **${formatNumber(
                option.cost
            )} coin${option.cost === 1 ? "" : "s"}**.\n\n` +
            `VIP remaining: **${status}**\n\n` +
            `New coin balance: **${formatNumber(updatedCoins)}**`
    );
}

export async function executeNominateCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    isMod: boolean
) {
    if (!event.comment) return;

    const settings = await context.settings.getAll();
    const nominationsEnabled =
        (settings[AppSetting.NominationsEnabled] as boolean | undefined) ??
        true;
    if (!nominationsEnabled) {
        await replyToCommand(
            event,
            context,
            "VIP nominations are disabled here."
        );
        return;
    }

    const bodySplit = event.comment.body.trim().split(/\s+/).filter(Boolean);
    const requestedTarget = bodySplit[1] ?? user.username;
    const target = await resolveUser(context, requestedTarget);

    logger.info("🗳️ Executing NOMINATE command", {
        requester: user.username,
        target: target?.username ?? requestedTarget,
        isMod,
    });

    if (!target) {
        await replyToCommand(
            event,
            context,
            `I couldn't find **${requestedTarget}**.`
        );
        return;
    }

    if (
        normalizeUsername(target.username) === normalizeUsername(user.username)
    ) {
        await replyToCommand(event, context, "You can't nominate yourself.");
        return;
    }

    const requesterKey = normalizeUsername(user.username);
    const targetKey = normalizeUsername(target.username);
    const previousTarget = await context.redis.hGet(
        NOMINATION_BY_USER_HASH_KEY,
        requesterKey
    );

    if (previousTarget === targetKey) {
        const votes =
            (await context.redis.zScore(NOMINATION_SCORE_KEY, targetKey)) ?? 0;

        await replyToCommand(
            event,
            context,
            `You have already nominated **u/${target.username}**.\n\n` +
                `Current nominations: **${formatNumber(votes)}**`
        );
        return;
    }

    if (previousTarget) {
        const previousScore = await context.redis.zIncrBy(
            NOMINATION_SCORE_KEY,
            previousTarget,
            -1
        );

        if (previousScore < 0) {
            await context.redis.zAdd(NOMINATION_SCORE_KEY, {
                member: previousTarget,
                score: 0,
            });
        }
    }

    const reputationEnabled =
        (settings[AppSetting.ReputationEnabled] as boolean | undefined) ?? true;
    const reputationReward =
        (settings[AppSetting.NominationReputationReward] as
            | number
            | undefined) ?? 1;

    if (
        previousTarget &&
        previousTarget !== targetKey &&
        reputationEnabled &&
        reputationReward > 0
    ) {
        const previousUser = await resolveUser(context, previousTarget);
        if (previousUser) {
            await new UserProfile(previousUser, context).adjustReputation(
                -reputationReward
            );
        }
    }

    await context.redis.hSet(NOMINATION_BY_USER_HASH_KEY, {
        [requesterKey]: targetKey,
    });

    const nominationCount = await context.redis.zIncrBy(
        NOMINATION_SCORE_KEY,
        targetKey,
        1
    );

    const targetProfile = new UserProfile(target, context);
    const requesterProfile = new UserProfile(user, context);
    if (reputationEnabled && reputationReward > 0) {
        await targetProfile.adjustReputation(reputationReward);
    }

    await Promise.all([
        requesterProfile.recordNominationGiven(),
        targetProfile.recordNominationReceived(),
    ]);
    await Promise.all([
        requesterProfile.evaluateAchievements(),
        targetProfile.evaluateAchievements(),
    ]);

    await targetProfile.writeAudit(
        "nomination_received",
        { nominations: nominationCount, reputationReward },
        user.username
    );

    let message =
        `# 🗳️ Nomination Recorded\n\n` +
        `**u/${target.username}** has been nominated for VIP status.\n\n` +
        `Current nominations: **${formatNumber(nominationCount)}**`;

    if (previousTarget && previousTarget !== targetKey) {
        message += "\n\nYour previous nomination was moved to this user.";
    }

    if (isMod) {
        message += "\n\n*Recorded as a moderator nomination.*";
    }

    await replyToCommand(event, context, message);

    const nominationsToBeSuperuser =
        (settings[AppSetting.NominationsToBecomeVipUser] as number) ?? 0;
    if (nominationsToBeSuperuser === 0) {
        logger.info(
            `No amount of nominations will allow user to become Superuser, returning.`,
            { user: user.username }
        );
        return;
    }

    if (nominationCount >= nominationsToBeSuperuser) {
        const durationDays =
            (settings[AppSetting.DefaultVIPDurationDays] as
                | number
                | undefined) ?? 30;

        if (durationDays <= 0) {
            await targetProfile.setVIPExpiration("permanent");
        } else {
            await targetProfile.setVIPExpiration(
                Date.now() + durationDays * 24 * 60 * 60 * 1000
            );
        }

        const userBecameSuperuserFromNominationsMessage =
            (settings[
                AppSetting.UserBecameSuperuserFromNominationsMessage
            ] as string) ??
            TemplateDefaults.UserBecameSuperuserFromNominationsMessage;

        await context.reddit.sendPrivateMessage({
            to: target.username,
            subject: `You are now a VIP user in r/${context.subredditName}`,
            text: formatMessage(
                event,
                userBecameSuperuserFromNominationsMessage,
                {}
            ),
        });

        logger.info(`User is now superuser.`, {
            user: user.username,
            nominationCount,
            nominationsToBeSuperuser,
        });
    }
}

export async function executeGiveCoinsCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    bodySplit: string[]
) {
    if (!event.comment) return;

    const settings = await context.settings.getAll();
    const coinsEnabled =
        (settings[AppSetting.CoinsEnabled] as boolean | undefined) ?? true;
    if (!coinsEnabled) {
        await replyToCommand(event, context, "VIP Coins are disabled here.");
        return;
    }

    const prefix = (settings[AppSetting.CommandPrefix] as string) ?? "/";
    const targetToken = bodySplit[1];
    const amount = parsePositiveInteger(bodySplit[2]);

    logger.info("🎁 Executing GIVECOINS command", {
        user: user.username,
        target: targetToken,
        amount,
    });

    if (!targetToken || amount === undefined) {
        await replyToCommand(
            event,
            context,
            `Usage: \`${prefix}givecoins u/username <positive whole number>\``
        );
        return;
    }

    const maxGift =
        (settings[AppSetting.MaxCoinGiftAmount] as number | undefined) ?? 1000;
    if (maxGift > 0 && amount > maxGift) {
        await replyToCommand(
            event,
            context,
            `The maximum givecoins amount is **${formatNumber(
                maxGift
            )} coins**.`
        );
        return;
    }

    const target = await resolveUser(context, targetToken);
    if (!target) {
        await replyToCommand(
            event,
            context,
            `I couldn't find **${targetToken}**.`
        );
        return;
    }

    if (
        normalizeUsername(target.username) === normalizeUsername(user.username)
    ) {
        await replyToCommand(
            event,
            context,
            "You can't give coins to yourself."
        );
        return;
    }

    const senderProfile = new UserProfile(user, context);
    const receiverProfile = new UserProfile(target, context);
    const senderCoins = await senderProfile.getCoins();

    if (senderCoins < amount) {
        await replyToCommand(
            event,
            context,
            `You only have **${formatNumber(senderCoins)} coin${
                senderCoins === 1 ? "" : "s"
            }**, so you can't give **${formatNumber(amount)}**.`
        );
        return;
    }

    let updatedSenderCoins: number;

    try {
        updatedSenderCoins = await senderProfile.adjustCoins(-amount);

        if (updatedSenderCoins < 0) {
            await senderProfile.adjustCoins(amount);

            await replyToCommand(
                event,
                context,
                `You don't have enough coins for that transfer. Your current balance is **${formatNumber(
                    await senderProfile.getCoins()
                )}**.`
            );
            return;
        }
    } catch (error) {
        logger.error("❌ Failed to subtract transferred coins", {
            sender: user.username,
            target: target.username,
            amount,
            error,
        });

        await replyToCommand(
            event,
            context,
            "The transfer could not be completed because your coin balance could not be updated."
        );
        return;
    }

    let updatedReceiverCoins: number;

    try {
        updatedReceiverCoins = await receiverProfile.adjustCoins(amount);
    } catch (error) {
        try {
            await senderProfile.adjustCoins(amount);
        } catch (rollbackError) {
            logger.error(
                "🚨 Failed to roll back sender coins after transfer failure",
                {
                    sender: user.username,
                    target: target.username,
                    amount,
                    rollbackError,
                }
            );
        }

        logger.error("❌ Failed to add transferred coins to receiver", {
            sender: user.username,
            target: target.username,
            amount,
            error,
        });

        await replyToCommand(
            event,
            context,
            "The transfer could not be completed because the receiver's coin balance could not be updated."
        );
        return;
    }

    logger.info("✅ Coin transfer completed", {
        sender: user.username,
        receiver: target.username,
        amount,
        senderBalance: updatedSenderCoins,
        receiverBalance: updatedReceiverCoins,
    });

    await Promise.all([
        senderProfile.recordCoinTransferSent(amount),
        receiverProfile.recordCoinTransferReceived(amount),
    ]);
    await Promise.all([
        senderProfile.evaluateAchievements(),
        receiverProfile.evaluateAchievements(),
    ]);

    await receiverProfile.writeAudit(
        "coin_transfer",
        {
            amount,
            senderBalance: updatedSenderCoins,
            receiverBalance: updatedReceiverCoins,
        },
        user.username
    );

    await replyToCommand(
        event,
        context,
        `# 🎁 Coins Sent\n\n` +
            `**u/${user.username}** gave **${formatNumber(amount)} coin${
                amount === 1 ? "" : "s"
            }** to **u/${target.username}**.\n\n` +
            `Your new coin balance: **${formatNumber(updatedSenderCoins)}**`
    );
}
