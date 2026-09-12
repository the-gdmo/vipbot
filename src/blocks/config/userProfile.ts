import {
    Context,
    FormOnSubmitEvent,
    JSONObject,
    MenuItemOnPressEvent,
    User,
} from "@devvit/public-api";
import { USER_VIP_POINTS_KEY } from "./constants";
import {
    getManagedFlairScore,
    ScoreResult,
    setManagedFlairScore,
} from "../utils/common-utils";
import {
    manualSetPointsForm,
    removeVipForm,
    setCoinsForm,
    setRepForm,
    setXpForm,
    vipAddDaysForm,
} from "./main";
import { logger } from "../utils/logger";
import {
    AppSetting,
    ConfiguredAchievement,
    ACHIEVEMENT_CATEGORY_SPECS,
    DEFAULT_ACHIEVEMENT_DEFINITIONS,
    TemplateDefaults,
    VIPStoreDurationUnit,
    parseAchievementDefinitions,
} from "./settings";

type UserProfileContext = Pick<Context, "redis" | "settings">;

export type RecentAward = {
    date: string;
    awardedBy: string;
    points: number;
};

export type PointHistory = {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    allTime: number;
};

export type ReputationSummary = {
    reputation: number;
    vipPoints: number;
    subredditRank: number;
    vipPointsGiven: number;
    vipPointsReceived: number;
    currentLevel: number;
    nextLevel: number;
    xpToNextLevel: number;
};

export type LevelThreshold = {
    level: number;
    xp: number;
    name: string;
};

export type ProgressSummary = {
    currentLevel: number;
    rankName: string;
    xp: number;
    nextLevel: number;
    xpToNextLevel: number;
};

export type UserProfileSnapshot = {
    username: string;
    reputation: number;
    vipPoints: number;
    subredditRank: number;
    vipPointsGiven: number;
    vipPointsReceived: number;
    xp: number;
    coins: number;
    currentLevel: number;
    rankName: string;
    nextLevel: number;
    xpToNextLevel: number;
    streak: number;
    longestStreak: number;
    achievements: string[];
    achievementCatalogSize: number;
    recentAwards: RecentAward[];
    pointHistory: PointHistory;
    vipExpiration?: number | "permanent";
};

export type ActiveVIP = {
    username: string;
    permanent: boolean;
    expiry?: number;
};


export type AchievementDefinition = ConfiguredAchievement;

type AchievementStats = {
    comments: number;
    posts: number;
    activities: number;
    xp: number;
    coins: number;
    reputation: number;
    longestStreak: number;
    vipPointsGiven: number;
    vipPointsReceived: number;
    nominationsGiven: number;
    nominationsReceived: number;
    storePurchases: number;
    vipDaysPurchased: number;
    storeCoinsSpent: number;
    coinTransfersSent: number;
    coinTransfersReceived: number;
    coinsTransferredSent: number;
    coinsTransferredReceived: number;
    coinReplyAwardsGiven: number;
    coinReplyAwardsReceived: number;
    hasVIP: boolean;
};

type AchievementCounterName =
    | "comments"
    | "posts"
    | "nominationsGiven"
    | "nominationsReceived"
    | "storePurchases"
    | "vipDaysPurchased"
    | "vipMillisecondsPurchased"
    | "storeCoinsSpent"
    | "coinTransfersSent"
    | "coinTransfersReceived"
    | "coinsTransferredSent"
    | "coinsTransferredReceived"
    | "coinReplyAwardsGiven"
    | "coinReplyAwardsReceived";

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] =
    parseAchievementDefinitions(DEFAULT_ACHIEVEMENT_DEFINITIONS);

function normalizeUsername(username: string): string {
    return username.trim().replace(/^u\//i, "").replace(/^@/, "").toLowerCase();
}

function getXPKey(username: string): string {
    return `xp:${username}`;
}

function getCoinsKey(username: string): string {
    return `coins:${username}`;
}

function getRepKey(username: string): string {
    return `rep:${username}`;
}

function getVIPKey(username: string): string {
    return `vip:${username}`;
}

function requireNonNegativeInteger(value: number, fieldName: string): number {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`${fieldName} must be a non-negative safe integer.`);
    }

    return value;
}

function requireInteger(value: number, fieldName: string): number {
    if (!Number.isSafeInteger(value)) {
        throw new Error(`${fieldName} must be a safe integer.`);
    }

    return value;
}

function getUTCDateKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

function getUTCMonthKey(date = new Date()): string {
    return date.toISOString().slice(0, 7);
}

function getUTCISOWeekKey(date = new Date()): string {
    const target = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const year = target.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil(
        ((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
    );
    return `${year}-W${String(week).padStart(2, "0")}`;
}

function parseLevelThresholds(raw: string): LevelThreshold[] {
    const defaultTitles = new Map<number, string>();

    for (const line of TemplateDefaults.LevelThresholds.split(/\r?\n/)) {
        const [levelText, , ...nameParts] = line.split("|");
        const level = Number(levelText);
        const name = nameParts.join("|").trim();
        if (Number.isSafeInteger(level) && level > 0 && name) {
            defaultTitles.set(level, name);
        }
    }

    const parsed: LevelThreshold[] = [];

    for (const line of raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
        const parts = line.split("|").map((value) => value.trim());

        // Compatibility with the old default whose final line contained only
        // the XP value. New settings are validated as level|xp|rankName.
        if (parts.length === 1 && /^\d+$/.test(parts[0] ?? "") && parsed.length) {
            const previous = parsed.at(-1);
            if (!previous) continue;

            const level = previous.level + 1;
            const xp = Number(parts[0]);
            if (Number.isSafeInteger(xp) && xp > previous.xp) {
                parsed.push({
                    level,
                    xp,
                    name: defaultTitles.get(level) ?? `Level ${level}`,
                });
            }
            continue;
        }

        if (parts.length < 2) continue;

        const level = Number(parts[0]);
        const xp = Number(parts[1]);
        const configuredName = parts.slice(2).join("|").trim();
        const name =
            configuredName || defaultTitles.get(level) || `Level ${level}`;

        if (
            !Number.isSafeInteger(level) ||
            level < 1 ||
            !Number.isSafeInteger(xp) ||
            xp < 0
        ) {
            continue;
        }

        parsed.push({ level, xp, name });
    }

    parsed.sort((a, b) => a.xp - b.xp || a.level - b.level);

    const unique: LevelThreshold[] = [];
    const seenLevels = new Set<number>();
    const seenXP = new Set<number>();

    for (const threshold of parsed) {
        if (seenLevels.has(threshold.level) || seenXP.has(threshold.xp)) continue;
        seenLevels.add(threshold.level);
        seenXP.add(threshold.xp);
        unique.push(threshold);
    }

    if (unique[0]?.level !== 1 || unique[0]?.xp !== 0) return [];
    return unique;
}

export class UserProfile {
    static readonly XP_LEADERBOARD_KEY = "vipbot:leaderboard:xp";
    static readonly COIN_LEADERBOARD_KEY = "vipbot:leaderboard:coins";
    static readonly REP_LEADERBOARD_KEY = "vipbot:leaderboard:rep";
    static readonly STREAK_LEADERBOARD_KEY = "vipbot:leaderboard:streak";
    static readonly VIP_INDEX_KEY = "vipbot:vips:expiry";
    static readonly AUDIT_LOG_KEY = "vipbot:audit:entries";

    static getWeeklyXPLeaderboardKey(date = new Date()): string {
        return `vipbot:leaderboard:weeklyxp:${getUTCISOWeekKey(date)}`;
    }

    static getMonthlyXPLeaderboardKey(date = new Date()): string {
        return `vipbot:leaderboard:monthlyxp:${getUTCMonthKey(date)}`;
    }

    constructor(
        private readonly user: User,
        private readonly context: UserProfileContext
    ) {}

    get username(): string {
        return this.user.username;
    }

    get normalizedUsername(): string {
        return normalizeUsername(this.user.username);
    }

    private profileKey(name: string): string {
        return `userProfile:${this.user.username}:${name}`;
    }

    private async getOptionalNumber(key: string): Promise<number | undefined> {
        const value = await this.context.redis.get(key);
        if (value === undefined || value === null || value === "") {
            return undefined;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    private async getNumber(key: string): Promise<number> {
        return (await this.getOptionalNumber(key)) ?? 0;
    }

    private async setNumber(key: string, value: number): Promise<void> {
        await this.context.redis.set(key, value.toString());
    }

    private async getSettings() {
        return this.context.settings.getAll();
    }

    async getLevelThresholds(): Promise<LevelThreshold[]> {
        const settings = await this.getSettings();
        const raw =
            (settings[AppSetting.LevelThresholds] as string) ??
            TemplateDefaults.LevelThresholds;

        const parsed = parseLevelThresholds(raw);
        if (parsed.length) return parsed;

        const defaults = parseLevelThresholds(TemplateDefaults.LevelThresholds);
        return defaults.length
            ? defaults
            : [{ level: 1, xp: 0, name: "Newcomer" }];
    }

    async getLevelForXP(xp: number): Promise<LevelThreshold> {
        const thresholds = await this.getLevelThresholds();
        let current = thresholds[0] ?? {
            level: 1,
            xp: 0,
            name: "Newcomer",
        };

        for (const threshold of thresholds) {
            if (xp < threshold.xp) break;
            current = threshold;
        }

        return current;
    }

    async getCurrentLevelDefinition(): Promise<LevelThreshold> {
        return this.getLevelForXP(await this.getXP());
    }

    async getCurrentLevelTitle(): Promise<string> {
        return (await this.getCurrentLevelDefinition()).name;
    }

    async writeAudit(
        action: string,
        details: Record<string, unknown> = {},
        actor = "VIPBot"
    ): Promise<void> {
        const settings = await this.getSettings();
        const enabled =
            (settings[AppSetting.AuditLoggingEnabled] as boolean | undefined) ??
            true;
        if (!enabled) return;

        const id = `${Date.now()}:${this.normalizedUsername}:${Math.random()
            .toString(36)
            .slice(2, 10)}`;

        await this.context.redis.hSet(UserProfile.AUDIT_LOG_KEY, {
            [id]: JSON.stringify({
                timestamp: new Date().toISOString(),
                action,
                actor,
                target: this.user.username,
                details,
            }),
        });
    }

    // ---------------------------------------------------------------------
    // VIP points / award points
    // ---------------------------------------------------------------------

    async setVipPoints(value: number): Promise<void> {
        requireNonNegativeInteger(value, "VIP points");
        const key = await USER_VIP_POINTS_KEY(this.user);
        await this.setNumber(key, value);
    }

    async getVipPoints(): Promise<number> {
        const key = await USER_VIP_POINTS_KEY(this.user);
        return this.getNumber(key);
    }

    async adjustVipPoints(amount: number): Promise<number> {
        requireInteger(amount, "VIP point adjustment");
        const key = await USER_VIP_POINTS_KEY(this.user);
        const updated = await this.context.redis.incrBy(key, amount);

        if (updated < 0) {
            await this.context.redis.incrBy(key, -amount);
            throw new Error("VIP points cannot be negative.");
        }

        return updated;
    }

    async setVipPointsGiven(value: number): Promise<void> {
        requireNonNegativeInteger(value, "VIP points given");
        await this.setNumber(this.profileKey("vipPointsGiven"), value);
    }

    async getVipPointsGiven(): Promise<number> {
        return this.getNumber(this.profileKey("vipPointsGiven"));
    }

    async adjustVipPointsGiven(amount: number): Promise<number> {
        requireInteger(amount, "VIP points given adjustment");
        const key = this.profileKey("vipPointsGiven");
        const updated = await this.context.redis.incrBy(key, amount);

        if (updated < 0) {
            await this.context.redis.incrBy(key, -amount);
            throw new Error("VIP points given cannot be negative.");
        }

        return updated;
    }

    async setVipPointsReceived(value: number): Promise<void> {
        requireNonNegativeInteger(value, "VIP points received");
        await this.setNumber(this.profileKey("vipPointsReceived"), value);
    }

    async getVipPointsReceived(): Promise<number> {
        return this.getNumber(this.profileKey("vipPointsReceived"));
    }

    async adjustVipPointsReceived(amount: number): Promise<number> {
        requireInteger(amount, "VIP points received adjustment");
        const key = this.profileKey("vipPointsReceived");
        const updated = await this.context.redis.incrBy(key, amount);

        if (updated < 0) {
            await this.context.redis.incrBy(key, -amount);
            throw new Error("VIP points received cannot be negative.");
        }

        return updated;
    }

    // ---------------------------------------------------------------------
    // Reputation
    // ---------------------------------------------------------------------

    async setReputation(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Reputation");

        await Promise.all([
            this.setNumber(getRepKey(this.user.username), value),
            this.context.redis.zAdd(UserProfile.REP_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: value,
            }),
        ]);
    }

    async getReputation(): Promise<number> {
        return this.getNumber(getRepKey(this.user.username));
    }

    async adjustReputation(amount: number): Promise<number> {
        requireInteger(amount, "Reputation adjustment");

        let updated = await this.context.redis.incrBy(
            getRepKey(this.user.username),
            amount
        );

        if (updated < 0) {
            updated = 0;
            await this.setNumber(getRepKey(this.user.username), 0);
        }

        await this.context.redis.zAdd(UserProfile.REP_LEADERBOARD_KEY, {
            member: this.normalizedUsername,
            score: updated,
        });

        return updated;
    }

    async getReputationSummary(): Promise<ReputationSummary> {
        const [
            reputation,
            vipPoints,
            subredditRank,
            vipPointsGiven,
            vipPointsReceived,
            currentLevel,
            nextLevel,
            xpToNextLevel,
        ] = await Promise.all([
            this.getReputation(),
            this.getVipPoints(),
            this.getSubRank(),
            this.getVipPointsGiven(),
            this.getVipPointsReceived(),
            this.getCurrentUserLevel(),
            this.getNextUserLevel(),
            this.getXpToNextLevel(),
        ]);

        return {
            reputation,
            vipPoints,
            subredditRank,
            vipPointsGiven,
            vipPointsReceived,
            currentLevel,
            nextLevel,
            xpToNextLevel,
        };
    }

    // ---------------------------------------------------------------------
    // XP
    // ---------------------------------------------------------------------

    async setXP(value: number): Promise<void> {
        requireNonNegativeInteger(value, "XP");

        await Promise.all([
            this.setNumber(getXPKey(this.user.username), value),
            this.context.redis.zAdd(UserProfile.XP_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: value,
            }),
        ]);

        await this.applyAutomaticVIPFromXP(value);
    }

    async adjustXP(amount: number, countTowardPeriod = true): Promise<number> {
        requireInteger(amount, "XP adjustment");

        let updatedXP = await this.context.redis.incrBy(
            getXPKey(this.user.username),
            amount
        );

        if (updatedXP < 0) {
            updatedXP = 0;
            await this.setNumber(getXPKey(this.user.username), 0);
        }

        const updates: Promise<unknown>[] = [
            this.context.redis.zAdd(UserProfile.XP_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: updatedXP,
            }),
        ];

        if (countTowardPeriod && amount > 0) {
            updates.push(
                this.context.redis.zIncrBy(
                    UserProfile.getWeeklyXPLeaderboardKey(),
                    this.normalizedUsername,
                    amount
                ),
                this.context.redis.zIncrBy(
                    UserProfile.getMonthlyXPLeaderboardKey(),
                    this.normalizedUsername,
                    amount
                )
            );
        }

        await Promise.all(updates);
        await this.applyAutomaticVIPFromXP(updatedXP);
        return updatedXP;
    }

    async getXP(): Promise<number> {
        return this.getNumber(getXPKey(this.user.username));
    }

    async setXp(value: number): Promise<void> {
        await this.setXP(value);
    }

    async getXp(): Promise<number> {
        return this.getXP();
    }

    private async applyAutomaticVIPFromXP(xp: number): Promise<void> {
        const settings = await this.getSettings();
        const vipEnabled =
            (settings[AppSetting.VIPEnabled] as boolean | undefined) ?? true;
        const autoVIPEnabled =
            (settings[AppSetting.AutoVIPEnabled] as boolean | undefined) ?? false;
        if (!vipEnabled || !autoVIPEnabled) return;

        const threshold =
            (settings[AppSetting.AutoVIPXPThreshold] as number | undefined) ??
            50_000;
        if (xp < threshold || (await this.hasActiveVIP())) return;

        const durationDays =
            (settings[AppSetting.DefaultVIPDurationDays] as number | undefined) ??
            30;

        if (durationDays <= 0) {
            await this.setVIPExpiration("permanent");
        } else {
            await this.setVIPExpiration(
                Date.now() + durationDays * 24 * 60 * 60 * 1000
            );
        }

        await this.writeAudit("auto_vip_grant", { xp, threshold, durationDays });
    }

    // ---------------------------------------------------------------------
    // Coins
    // ---------------------------------------------------------------------

    async setCoins(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Coins");

        await Promise.all([
            this.setNumber(getCoinsKey(this.user.username), value),
            this.context.redis.zAdd(UserProfile.COIN_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: value,
            }),
        ]);
    }

    async getCoins(): Promise<number> {
        return this.getNumber(getCoinsKey(this.user.username));
    }

    async adjustCoins(amount: number): Promise<number> {
        requireInteger(amount, "Coin adjustment");

        const updatedBalance = await this.context.redis.incrBy(
            getCoinsKey(this.user.username),
            amount
        );

        await this.context.redis.zAdd(UserProfile.COIN_LEADERBOARD_KEY, {
            member: this.normalizedUsername,
            score: updatedBalance,
        });

        return updatedBalance;
    }

    // ---------------------------------------------------------------------
    // Rank / levels / progress
    // ---------------------------------------------------------------------

    async setSubRank(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Subreddit rank");
        await this.setNumber(this.profileKey("subRank"), value);
    }

    async getSubRank(): Promise<number> {
        return this.getNumber(this.profileKey("subRank"));
    }

    async setCurrentUserLevel(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Current level");
        const thresholds = await this.getLevelThresholds();
        const threshold = thresholds.find((item) => item.level === value);

        if (!threshold) {
            throw new Error(
                `Level ${value} is not defined in AppSetting.LevelThresholds.`
            );
        }

        await this.setXP(threshold.xp);
    }

    async getCurrentUserLevel(): Promise<number> {
        return (await this.getCurrentLevelDefinition()).level;
    }

    async setNextUserLevel(value: number): Promise<void> {
        await this.setCurrentUserLevel(Math.max(1, value - 1));
    }

    async getNextUserLevel(): Promise<number> {
        const xp = await this.getXP();
        const thresholds = await this.getLevelThresholds();
        const next = thresholds.find((threshold) => threshold.xp > xp);
        return next?.level ?? (await this.getCurrentLevelDefinition()).level;
    }

    async setXpToNextLevel(_value: number): Promise<void> {
        // Derived from XP and AppSetting.LevelThresholds; intentionally not stored.
    }

    async getXpToNextLevel(): Promise<number> {
        const xp = await this.getXP();
        const thresholds = await this.getLevelThresholds();
        const next = thresholds.find((threshold) => threshold.xp > xp);
        return next ? Math.max(0, next.xp - xp) : 0;
    }

    async setProgress(value: ProgressSummary): Promise<void> {
        // XP is the source of truth; every other progress field is derived.
        await this.setXP(value.xp);
    }

    async getProgress(): Promise<ProgressSummary> {
        const xp = await this.getXP();
        const thresholds = await this.getLevelThresholds();
        const current = await this.getLevelForXP(xp);
        const next = thresholds.find((threshold) => threshold.xp > xp);

        return {
            currentLevel: current.level,
            rankName: current.name,
            xp,
            nextLevel: next?.level ?? current.level,
            xpToNextLevel: next ? Math.max(0, next.xp - xp) : 0,
        };
    }

    // ---------------------------------------------------------------------
    // Streaks
    // ---------------------------------------------------------------------

    async setStreak(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Streak");

        await Promise.all([
            this.setNumber(this.profileKey("streak"), value),
            this.context.redis.zAdd(UserProfile.STREAK_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: value,
            }),
        ]);

        const longest = await this.getLongestStreak();
        if (value > longest) {
            await this.setLongestStreak(value);
        }
    }

    async getStreak(): Promise<number> {
        return this.getNumber(this.profileKey("streak"));
    }

    async setLongestStreak(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Longest streak");
        await this.setNumber(this.profileKey("longestStreak"), value);
    }

    async getLongestStreak(): Promise<number> {
        return this.getNumber(this.profileKey("longestStreak"));
    }

    private async recordDailyActivity(): Promise<number> {
        const today = getUTCDateKey();
        const lastDate = await this.context.redis.get(
            this.profileKey("lastActivityUTC")
        );

        if (lastDate === today) return this.getStreak();

        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const nextStreak =
            lastDate === getUTCDateKey(yesterday)
                ? (await this.getStreak()) + 1
                : 1;

        await Promise.all([
            this.context.redis.set(this.profileKey("lastActivityUTC"), today),
            this.setStreak(nextStreak),
        ]);

        return nextStreak;
    }

    private async grantDailyCoins(reward: number): Promise<number> {
        if (reward <= 0) return 0;

        const today = getUTCDateKey();
        const lastRewardDate = await this.context.redis.get(
            this.profileKey("lastDailyCoinRewardUTC")
        );
        if (lastRewardDate === today) return 0;

        await this.adjustCoins(reward);
        await this.context.redis.set(
            this.profileKey("lastDailyCoinRewardUTC"),
            today
        );
        return reward;
    }

    async recordActivity(kind: "post" | "comment"): Promise<void> {
        const settings = await this.getSettings();
        const xpEnabled =
            (settings[AppSetting.XPEnabled] as boolean | undefined) ?? true;
        const streaksEnabled =
            (settings[AppSetting.StreaksEnabled] as boolean | undefined) ?? true;
        const coinsEnabled =
            (settings[AppSetting.CoinsEnabled] as boolean | undefined) ?? true;
        const achievementsEnabled =
            (settings[AppSetting.AchievementsEnabled] as boolean | undefined) ??
            true;

        await this.incrementAchievementCounter(kind === "post" ? "posts" : "comments");

        const xpReward =
            kind === "post"
                ? ((settings[AppSetting.XPPerPost] as number | undefined) ?? 10)
                : ((settings[AppSetting.XPPerComment] as number | undefined) ?? 2);

        if (xpEnabled && xpReward > 0) {
            await this.adjustXP(xpReward, true);
        }

        if (streaksEnabled) await this.recordDailyActivity();

        if (coinsEnabled) {
            const dailyReward =
                (settings[AppSetting.DailyCoinReward] as number | undefined) ?? 1;
            await this.grantDailyCoins(dailyReward);
        }

        if (achievementsEnabled) await this.evaluateAchievements();
    }

    // ---------------------------------------------------------------------
    // Achievements / awards
    // ---------------------------------------------------------------------

    private achievementCounterKey(name: AchievementCounterName): string {
        return this.profileKey(`achievementCounter:${name}`);
    }

    private async getAchievementCounter(
        name: AchievementCounterName
    ): Promise<number> {
        return this.getNumber(this.achievementCounterKey(name));
    }

    private async incrementAchievementCounter(
        name: AchievementCounterName,
        amount = 1
    ): Promise<number> {
        requireNonNegativeInteger(amount, "Achievement counter increment");
        if (amount === 0) return this.getAchievementCounter(name);
        return this.context.redis.incrBy(this.achievementCounterKey(name), amount);
    }

    async recordNominationGiven(): Promise<number> {
        return this.incrementAchievementCounter("nominationsGiven");
    }

    async recordNominationReceived(): Promise<number> {
        return this.incrementAchievementCounter("nominationsReceived");
    }

    async recordStorePurchase(
        durationMilliseconds: number,
        cost: number
    ): Promise<void> {
        requireNonNegativeInteger(
            durationMilliseconds,
            "VIP Store purchased duration milliseconds"
        );
        requireNonNegativeInteger(cost, "VIP Store coin cost");
        await Promise.all([
            this.incrementAchievementCounter("storePurchases"),
            this.incrementAchievementCounter(
                "vipMillisecondsPurchased",
                durationMilliseconds
            ),
            this.incrementAchievementCounter("storeCoinsSpent", cost),
        ]);
    }

    async recordCoinTransferSent(amount: number): Promise<void> {
        requireNonNegativeInteger(amount, "Transferred coins");
        await Promise.all([
            this.incrementAchievementCounter("coinTransfersSent"),
            this.incrementAchievementCounter("coinsTransferredSent", amount),
        ]);
    }

    async recordCoinTransferReceived(amount: number): Promise<void> {
        requireNonNegativeInteger(amount, "Transferred coins");
        await Promise.all([
            this.incrementAchievementCounter("coinTransfersReceived"),
            this.incrementAchievementCounter("coinsTransferredReceived", amount),
        ]);
    }

    async recordPointCommandAwardGiven(): Promise<number> {
        // Keep the original Redis counter name for migration compatibility.
        return this.incrementAchievementCounter("coinReplyAwardsGiven");
    }

    async recordPointCommandAwardReceived(): Promise<number> {
        // Keep the original Redis counter name for migration compatibility.
        return this.incrementAchievementCounter("coinReplyAwardsReceived");
    }

    async recordCoinReplyAwardGiven(): Promise<number> {
        return this.recordPointCommandAwardGiven();
    }

    async recordCoinReplyAwardReceived(): Promise<number> {
        return this.recordPointCommandAwardReceived();
    }

    private async getAchievementStats(): Promise<AchievementStats> {
        const [
            comments,
            posts,
            xp,
            coins,
            reputation,
            currentStreak,
            longestStreak,
            vipPointsGiven,
            vipPointsReceived,
            nominationsGiven,
            nominationsReceived,
            storePurchases,
            legacyVipDaysPurchased,
            vipMillisecondsPurchased,
            storeCoinsSpent,
            coinTransfersSent,
            coinTransfersReceived,
            coinsTransferredSent,
            coinsTransferredReceived,
            coinReplyAwardsGiven,
            coinReplyAwardsReceived,
            vipExpiration,
        ] = await Promise.all([
            this.getAchievementCounter("comments"),
            this.getAchievementCounter("posts"),
            this.getXP(),
            this.getCoins(),
            this.getReputation(),
            this.getStreak(),
            this.getLongestStreak(),
            this.getVipPointsGiven(),
            this.getVipPointsReceived(),
            this.getAchievementCounter("nominationsGiven"),
            this.getAchievementCounter("nominationsReceived"),
            this.getAchievementCounter("storePurchases"),
            this.getAchievementCounter("vipDaysPurchased"),
            this.getAchievementCounter("vipMillisecondsPurchased"),
            this.getAchievementCounter("storeCoinsSpent"),
            this.getAchievementCounter("coinTransfersSent"),
            this.getAchievementCounter("coinTransfersReceived"),
            this.getAchievementCounter("coinsTransferredSent"),
            this.getAchievementCounter("coinsTransferredReceived"),
            this.getAchievementCounter("coinReplyAwardsGiven"),
            this.getAchievementCounter("coinReplyAwardsReceived"),
            this.getVIPExpiration(),
        ]);

        return {
            comments,
            posts,
            activities: comments + posts,
            xp,
            coins,
            reputation,
            longestStreak: Math.max(currentStreak, longestStreak),
            vipPointsGiven,
            vipPointsReceived,
            nominationsGiven,
            nominationsReceived,
            storePurchases,
            vipDaysPurchased:
                legacyVipDaysPurchased +
                Math.floor(vipMillisecondsPurchased / (24 * 60 * 60 * 1000)),
            storeCoinsSpent,
            coinTransfersSent,
            coinTransfersReceived,
            coinsTransferredSent,
            coinsTransferredReceived,
            coinReplyAwardsGiven,
            coinReplyAwardsReceived,
            hasVIP:
                vipExpiration === "permanent" ||
                (typeof vipExpiration === "number" && vipExpiration > Date.now()),
        };
    }

    async getAchievementCatalog(): Promise<ConfiguredAchievement[]> {
        const settings = await this.getSettings();
        const catalog: ConfiguredAchievement[] = [];
        const seenNames = new Set<string>();

        for (const spec of ACHIEVEMENT_CATEGORY_SPECS) {
            const configuredRaw = settings[spec.key] as string | undefined;
            const raw = configuredRaw?.trim() || spec.defaultValue;
            const configured = parseAchievementDefinitions(raw);
            const configuredLineCount = raw
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean).length;
            const fallback = parseAchievementDefinitions(spec.defaultValue);
            const allowedStats = new Set(spec.allowedStats);
            const configuredMatchesCategory =
                configured.length === configuredLineCount &&
                configured.length > 0 &&
                configured.every(
                    (achievement) =>
                        achievement.category.toLowerCase() ===
                            spec.definitionCategory.toLowerCase() &&
                        achievement.requirements.every((requirement) =>
                            allowedStats.has(requirement.stat)
                        )
                );
            const achievements = configuredMatchesCategory ? configured : fallback;

            for (const achievement of achievements) {
                const normalizedName = achievement.name.trim().toLowerCase();
                if (seenNames.has(normalizedName)) continue;
                seenNames.add(normalizedName);
                catalog.push(achievement);
            }
        }

        return catalog.length ? catalog : [...ACHIEVEMENT_CATALOG];
    }

    private achievementIsEarned(
        achievement: ConfiguredAchievement,
        stats: AchievementStats
    ): boolean {
        return achievement.requirements.every((requirement) => {
            if (requirement.stat === "hasVIP") {
                return stats.hasVIP === requirement.expected;
            }

            return stats[requirement.stat] >= requirement.minimum;
        });
    }

    async evaluateAchievements(): Promise<string[]> {
        const settings = await this.getSettings();
        const enabled =
            (settings[AppSetting.AchievementsEnabled] as boolean | undefined) ??
            true;
        if (!enabled) return [];

        const [stats, existing, catalog] = await Promise.all([
            this.getAchievementStats(),
            this.getAchievements(),
            this.getAchievementCatalog(),
        ]);
        const owned = new Set(existing);
        const unlocked = catalog.filter(
            (achievement) =>
                !owned.has(achievement.name) &&
                this.achievementIsEarned(achievement, stats)
        ).map((achievement) => achievement.name);

        if (!unlocked.length) return [];

        await this.setAchievements([...existing, ...unlocked]);
        await this.writeAudit("achievements_unlocked", {
            count: unlocked.length,
            achievements: unlocked,
        });
        return unlocked;
    }

    async setAchievements(value: string[]): Promise<void> {
        await this.context.redis.set(
            this.profileKey("achievements"),
            JSON.stringify(value)
        );
    }

    async getAchievements(): Promise<string[]> {
        const achievements = await this.context.redis.get(
            this.profileKey("achievements")
        );

        if (!achievements) return [];

        try {
            const parsed = JSON.parse(achievements);
            return Array.isArray(parsed)
                ? parsed.filter(
                      (item): item is string => typeof item === "string"
                  )
                : [];
        } catch {
            return [];
        }
    }

    async addAchievement(achievement: string): Promise<string[]> {
        const trimmed = achievement.trim();
        if (!trimmed) return this.getAchievements();

        const achievements = await this.getAchievements();
        if (!achievements.includes(trimmed)) {
            achievements.push(trimmed);
            await this.setAchievements(achievements);
        }

        return achievements;
    }

    async setRecentAwards(value: RecentAward[]): Promise<void> {
        await this.context.redis.set(
            this.profileKey("recentAwards"),
            JSON.stringify(value)
        );
    }

    async getRecentAwards(): Promise<RecentAward[]> {
        const awards = await this.context.redis.get(
            this.profileKey("recentAwards")
        );
        if (!awards) return [];

        try {
            const parsed = JSON.parse(awards) as unknown;
            if (!Array.isArray(parsed)) return [];

            return parsed.filter((award): award is RecentAward => {
                if (!award || typeof award !== "object") return false;
                const record = award as Record<string, unknown>;
                return (
                    typeof record.date === "string" &&
                    typeof record.awardedBy === "string" &&
                    typeof record.points === "number" &&
                    Number.isFinite(record.points)
                );
            });
        } catch {
            return [];
        }
    }

    async addRecentAward(award: RecentAward, maxEntries = 10): Promise<void> {
        const awards = await this.getRecentAwards();
        awards.unshift(award);
        await this.setRecentAwards(awards.slice(0, Math.max(1, maxEntries)));
    }

    // ---------------------------------------------------------------------
    // Point history
    // ---------------------------------------------------------------------

    private async getLegacyPointHistory(): Promise<Partial<PointHistory>> {
        const history = await this.context.redis.get(
            this.profileKey("pointHistory")
        );
        if (!history) return {};

        try {
            const parsed = JSON.parse(history) as Record<string, unknown>;
            const result: Partial<PointHistory> = {};

            for (const field of [
                "today",
                "thisWeek",
                "thisMonth",
                "thisYear",
                "allTime",
            ] as const) {
                const value = parsed[field];
                if (typeof value === "number" && Number.isFinite(value)) {
                    result[field] = value;
                }
            }

            return result;
        } catch {
            return {};
        }
    }

    async setPointsToday(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Points today");
        await this.setNumber(this.profileKey("pointsToday"), value);
    }

    async getPointsToday(): Promise<number> {
        const value = await this.getOptionalNumber(
            this.profileKey("pointsToday")
        );
        if (value !== undefined) return value;
        return (await this.getLegacyPointHistory()).today ?? 0;
    }

    async setPointsThisWeek(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Points this week");
        await this.setNumber(this.profileKey("pointsThisWeek"), value);
    }

    async getPointsThisWeek(): Promise<number> {
        const value = await this.getOptionalNumber(
            this.profileKey("pointsThisWeek")
        );
        if (value !== undefined) return value;
        return (await this.getLegacyPointHistory()).thisWeek ?? 0;
    }

    async setPointsThisMonth(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Points this month");
        await this.setNumber(this.profileKey("pointsThisMonth"), value);
    }

    async getPointsThisMonth(): Promise<number> {
        const value = await this.getOptionalNumber(
            this.profileKey("pointsThisMonth")
        );
        if (value !== undefined) return value;
        return (await this.getLegacyPointHistory()).thisMonth ?? 0;
    }

    async setPointsThisYear(value: number): Promise<void> {
        requireNonNegativeInteger(value, "Points this year");
        await this.setNumber(this.profileKey("pointsThisYear"), value);
    }

    async getPointsThisYear(): Promise<number> {
        const value = await this.getOptionalNumber(
            this.profileKey("pointsThisYear")
        );
        if (value !== undefined) return value;
        return (await this.getLegacyPointHistory()).thisYear ?? 0;
    }

    async setPointHistory(value: PointHistory): Promise<void> {
        await Promise.all([
            this.setPointsToday(value.today),
            this.setPointsThisWeek(value.thisWeek),
            this.setPointsThisMonth(value.thisMonth),
            this.setPointsThisYear(value.thisYear),
            this.setVipPoints(value.allTime),
            this.context.redis.set(
                this.profileKey("pointHistory"),
                JSON.stringify(value)
            ),
        ]);
    }

    async getPointHistory(): Promise<PointHistory> {
        const [today, thisWeek, thisMonth, thisYear, allTime] =
            await Promise.all([
                this.getPointsToday(),
                this.getPointsThisWeek(),
                this.getPointsThisMonth(),
                this.getPointsThisYear(),
                this.getVipPoints(),
            ]);

        return { today, thisWeek, thisMonth, thisYear, allTime };
    }

    // ---------------------------------------------------------------------
    // VIP status
    // ---------------------------------------------------------------------

    async setVIPExpiration(value: number | "permanent"): Promise<void> {
        const storedValue =
            value === "permanent"
                ? "permanent"
                : requireNonNegativeInteger(value, "VIP expiration").toString();

        await Promise.all([
            this.context.redis.set(getVIPKey(this.user.username), storedValue),
            this.context.redis.hSet(UserProfile.VIP_INDEX_KEY, {
                [this.user.username]: storedValue,
            }),
        ]);
    }

    async getVIPExpiration(): Promise<number | "permanent" | undefined> {
        const value = await this.context.redis.get(
            getVIPKey(this.user.username)
        );
        if (!value) return undefined;

        if (/^(permanent|never|infinite)$/i.test(value)) {
            return "permanent";
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) return undefined;
        if (parsed <= Date.now()) {
            await this.removeVIP();
            return undefined;
        }
        return parsed;
    }

    async hasActiveVIP(now = Date.now()): Promise<boolean> {
        const expiration = await this.getVIPExpiration();
        return (
            expiration === "permanent" ||
            (typeof expiration === "number" && expiration > now)
        );
    }

    async getVIPDaysRemaining(now = Date.now()): Promise<number | undefined> {
        const expiration = await this.getVIPExpiration();
        if (expiration === "permanent") return undefined;
        if (expiration === undefined || expiration <= now) return 0;

        return Math.ceil((expiration - now) / (24 * 60 * 60 * 1000));
    }

    async addVIPDuration(
        duration: number,
        unit: VIPStoreDurationUnit
    ): Promise<number | "permanent"> {
        if (!Number.isSafeInteger(duration) || duration <= 0) {
            throw new Error("VIP duration must be a positive safe integer.");
        }

        const currentExpiration = await this.getVIPExpiration();
        if (currentExpiration === "permanent") return "permanent";

        const now = Date.now();
        const base =
            typeof currentExpiration === "number" && currentExpiration > now
                ? currentExpiration
                : now;

        let newExpiration: number;

        switch (unit) {
            case "S":
                newExpiration = base + duration * 1000;
                break;
            case "m":
                newExpiration = base + duration * 60 * 1000;
                break;
            case "H":
                newExpiration = base + duration * 60 * 60 * 1000;
                break;
            case "D":
                newExpiration = base + duration * 24 * 60 * 60 * 1000;
                break;
            case "W":
                newExpiration = base + duration * 7 * 24 * 60 * 60 * 1000;
                break;
            case "M": {
                const date = new Date(base);
                const originalDay = date.getUTCDate();
                date.setUTCDate(1);
                date.setUTCMonth(date.getUTCMonth() + duration);
                const lastDayOfTargetMonth = new Date(
                    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
                ).getUTCDate();
                date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
                newExpiration = date.getTime();
                break;
            }
            case "Y": {
                const date = new Date(base);
                const originalMonth = date.getUTCMonth();
                const originalDay = date.getUTCDate();
                date.setUTCDate(1);
                date.setUTCFullYear(date.getUTCFullYear() + duration);
                date.setUTCMonth(originalMonth);
                const lastDayOfTargetMonth = new Date(
                    Date.UTC(date.getUTCFullYear(), originalMonth + 1, 0)
                ).getUTCDate();
                date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
                newExpiration = date.getTime();
                break;
            }
            default: {
                const exhaustiveCheck: never = unit;
                throw new Error(`Unsupported VIP duration unit: ${exhaustiveCheck}`);
            }
        }

        if (!Number.isSafeInteger(newExpiration) || newExpiration <= base) {
            throw new Error("VIP duration produced an invalid expiration time.");
        }

        await this.setVIPExpiration(newExpiration);
        return newExpiration;
    }

    async addVIPDays(days: number): Promise<number | "permanent"> {
        return this.addVIPDuration(days, "D");
    }

    async removeVIP(): Promise<void> {
        await Promise.all([
            this.context.redis.del(getVIPKey(this.user.username)),
            this.context.redis.hDel(UserProfile.VIP_INDEX_KEY, [
                this.user.username,
            ]),
        ]);
    }

    static async getActiveVIPs(
        context: UserProfileContext,
        now = Date.now()
    ): Promise<ActiveVIP[]> {
        const entries = await context.redis.hGetAll(UserProfile.VIP_INDEX_KEY);
        const active: ActiveVIP[] = [];

        for (const [username, rawExpiration] of Object.entries(entries)) {
            if (/^(permanent|never|infinite)$/i.test(rawExpiration)) {
                active.push({ username, permanent: true });
                continue;
            }

            const expiration = Number(rawExpiration);
            if (!Number.isFinite(expiration) || expiration <= now) {
                await Promise.all([
                    context.redis.del(getVIPKey(username)),
                    context.redis.hDel(UserProfile.VIP_INDEX_KEY, [username]),
                ]);
                continue;
            }

            active.push({
                username,
                permanent: false,
                expiry: expiration,
            });
        }

        return active.sort((a, b) => {
            if (a.permanent && !b.permanent) return -1;
            if (!a.permanent && b.permanent) return 1;
            return (b.expiry ?? 0) - (a.expiry ?? 0);
        });
    }

    // ---------------------------------------------------------------------
    // Combined helpers
    // ---------------------------------------------------------------------

    async syncLeaderboards(): Promise<void> {
        const [reputation, xp, coins, streak] = await Promise.all([
            this.getReputation(),
            this.getXP(),
            this.getCoins(),
            this.getStreak(),
        ]);

        await Promise.all([
            this.context.redis.zAdd(UserProfile.REP_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: reputation,
            }),
            this.context.redis.zAdd(UserProfile.XP_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: xp,
            }),
            this.context.redis.zAdd(UserProfile.COIN_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: coins,
            }),
            this.context.redis.zAdd(UserProfile.STREAK_LEADERBOARD_KEY, {
                member: this.normalizedUsername,
                score: streak,
            }),
        ]);
    }

    async getSnapshot(): Promise<UserProfileSnapshot> {
        const [
            reputation,
            vipPoints,
            subredditRank,
            vipPointsGiven,
            vipPointsReceived,
            xp,
            coins,
            currentLevel,
            rankName,
            nextLevel,
            xpToNextLevel,
            streak,
            longestStreak,
            achievements,
            achievementCatalog,
            recentAwards,
            pointHistory,
            vipExpiration,
        ] = await Promise.all([
            this.getReputation(),
            this.getVipPoints(),
            this.getSubRank(),
            this.getVipPointsGiven(),
            this.getVipPointsReceived(),
            this.getXP(),
            this.getCoins(),
            this.getCurrentUserLevel(),
            this.getCurrentLevelTitle(),
            this.getNextUserLevel(),
            this.getXpToNextLevel(),
            this.getStreak(),
            this.getLongestStreak(),
            this.getAchievements(),
            this.getAchievementCatalog(),
            this.getRecentAwards(),
            this.getPointHistory(),
            this.getVIPExpiration(),
        ]);

        return {
            username: this.user.username,
            reputation,
            vipPoints,
            subredditRank,
            vipPointsGiven,
            vipPointsReceived,
            xp,
            coins,
            currentLevel,
            rankName,
            nextLevel,
            xpToNextLevel,
            streak,
            longestStreak,
            achievements,
            achievementCatalogSize: achievementCatalog.length,
            recentAwards,
            pointHistory,
            vipExpiration,
        };
    }
}

// ============================================================================
// Public managed-flair score tools
// ============================================================================

export async function manualSetPointsFormHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    if (!context.commentId) {
        context.ui.showToast("An error occurred setting the user's score");
        return;
    }

    const entry = event.values.newScore as number | undefined;
    if (
        typeof entry !== "number" ||
        !Number.isFinite(entry) ||
        !Number.isInteger(entry) ||
        entry < 0
    ) {
        context.ui.showToast("You must enter a new score (0 or higher)");
        return;
    }

    const comment = await context.reddit.getCommentById(context.commentId);

    let user: User | undefined;
    try {
        user = await context.reddit.getUserByUsername(comment.authorName);
    } catch {
        // User lookup failed.
    }

    if (!user) {
        context.ui.showToast("Cannot set points. User may be shadowbanned");
        return;
    }

    const newScore: ScoreResult = {
        score: entry,
        userHasFlair: false,
        flairIsNumber: false,
    };

    await setManagedFlairScore(
        context,
        user.username,
        newScore,
        await context.settings.getAll()
    );

    context.ui.showToast(`Score for ${user.username} is now ${entry}`);
}

export async function handleManualPointSetting(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast(
            "Unable to determine the author of this post or comment"
        );
        return;
    }

    if (await isProtectedBotUser(user, context)) {
        context.ui.showToast(`${user.username}'s points cannot be set`);
        return;
    }

    const currentScore = await getManagedFlairScore(user, context);

    if (!currentScore) {
        context.ui.showToast("Unable to retrieve current score for user");
        return;
    }

    const fields = [
        {
            name: "newScore",
            type: "number",
            defaultValue: currentScore.score,
            label: `Enter a new score for ${user.username}`,
            helpText:
                "Warning: This will overwrite the public flair-managed score that currently exists.",
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(manualSetPointsForm, { fields });
}

// ============================================================================
// Target user helpers
// ============================================================================

async function getTargetUserFromContext(
    context: Context
): Promise<User | undefined> {
    let username: string | undefined;

    if (context.commentId) {
        try {
            const comment = await context.reddit.getCommentById(
                context.commentId
            );
            username = comment.authorName;
        } catch {
            // Try post context next.
        }
    }

    if (!username && context.postId) {
        try {
            const post = await context.reddit.getPostById(context.postId);
            username = post.authorName;
        } catch {
            // User could not be resolved.
        }
    }

    if (!username) return undefined;

    try {
        return await context.reddit.getUserByUsername(username);
    } catch {
        return undefined;
    }
}

async function getTargetUserFromMenuEvent(
    event: MenuItemOnPressEvent,
    context: Context
): Promise<User | undefined> {
    try {
        try {
            const comment = await context.reddit.getCommentById(event.targetId);
            if (comment.authorName) {
                return await context.reddit.getUserByUsername(
                    comment.authorName
                );
            }
        } catch {
            // Not a comment; try a post.
        }

        try {
            const post = await context.reddit.getPostById(event.targetId);
            if (post.authorName) {
                return await context.reddit.getUserByUsername(post.authorName);
            }
        } catch {
            // Unable to resolve target.
        }
    } catch {
        // Ignore lookup errors.
    }

    return undefined;
}

async function isProtectedBotUser(
    user: User,
    context: Context
): Promise<boolean> {
    const settings = await context.settings.getAll();
    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;

    const normalizedUsername = user.username.trim().toLowerCase();
    const excludedAccounts = botsThatWillNotBeManaged
        .split(/\r?\n|,/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    return (
        excludedAccounts.includes(normalizedUsername) ||
        normalizedUsername === "automoderator"
    );
}

function getNonNegativeInteger(value: unknown): number | undefined {
    if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < 0
    ) {
        return undefined;
    }

    return value;
}

// ============================================================================
// VIP add days
// ============================================================================

export async function vipAddDaysFormHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const days = getNonNegativeInteger(event.values.days);

    if (days === undefined) {
        context.ui.showToast("Entry must be 0 or greater");
        return;
    }

    const user = await getTargetUserFromContext(context);
    if (!user) {
        context.ui.showToast("Cannot add VIP time. User may be shadowbanned");
        return;
    }

    const profile = new UserProfile(user, context);

    if (days === 0) {
        await profile.setVIPExpiration("permanent");
        await profile.evaluateAchievements();
        await profile.writeAudit("moderator_vip_grant", { permanent: true });
        context.ui.showToast(`${user.username} received permanent VIP`);
        return;
    }

    const expiration = await profile.addVIPDays(days);
    await profile.evaluateAchievements();
    await profile.writeAudit("moderator_vip_grant", { days });

    context.ui.showToast(
        `${user.username} received ${days} day${days === 1 ? "" : "s"} of VIP`
    );

    logger.info("👑 VIP time added from context menu", {
        user: user.username,
        days,
        expiration:
            expiration === "permanent"
                ? "permanent"
                : new Date(expiration).toISOString(),
    });
}

export async function handleVIPAddDays(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot add VIP time. User may be shadowbanned");
        return;
    }

    if (await isProtectedBotUser(user, context)) {
        context.ui.showToast(`${user.username} cannot be granted VIP`);
        return;
    }

    const settings = await context.settings.getAll();
    const defaultVIPDurationDays =
        (settings[AppSetting.DefaultVIPDurationDays] as number | undefined) ?? 30;
    const profile = new UserProfile(user, context);
    const expiration = await profile.getVIPExpiration();
    const currentDays = await profile.getVIPDaysRemaining();

    const fields = [
        {
            name: "days",
            type: "number",
            defaultValue: defaultVIPDurationDays,
            label: `How many VIP days should be added to ${user.username}?`,
            helpText:
                expiration === "permanent"
                    ? `${user.username} already has permanent VIP`
                    : currentDays && currentDays > 0
                    ? `${
                          user.username
                      } currently has approximately ${currentDays} day${
                          currentDays === 1 ? "" : "s"
                      } of VIP remaining`
                    : `${user.username} currently does not have active VIP. Enter 0 for permanent VIP`,
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(vipAddDaysForm, { fields });
}

// ============================================================================
// Set XP
// ============================================================================

export async function setXpFormHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const entry = getNonNegativeInteger(event.values.xp);

    if (entry === undefined) {
        context.ui.showToast("You must enter an XP value of 0 or higher");
        return;
    }

    const user = await getTargetUserFromContext(context);
    if (!user) {
        context.ui.showToast("Cannot set XP. User may be shadowbanned");
        return;
    }

    const profile = new UserProfile(user, context);
    await profile.setXP(entry);
    await profile.evaluateAchievements();
    const level = await profile.getCurrentLevelDefinition();
    await profile.writeAudit("moderator_set_xp", {
        value: entry,
        derivedLevel: level.level,
        derivedRank: level.name,
    });
    context.ui.showToast(
        `XP for ${user.username} is now ${entry} (Level ${level.level} — ${level.name})`
    );
}

export async function handleSetXP(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot set XP. User may be shadowbanned");
        return;
    }

    if (await isProtectedBotUser(user, context)) {
        context.ui.showToast(`${user.username}'s xp cannot be set`);
        return;
    }

    const currentXP = await new UserProfile(user, context).getXP();

    context.ui.showForm(setXpForm, {
        fields: [
            {
                name: "xp",
                type: "number",
                defaultValue: currentXP,
                label: `Enter a new XP value for ${user.username}`,
                helpText:
                    "This overwrites XP. The user's level and rank are then derived automatically from the XP Level Thresholds setting.",
                multiSelect: false,
                required: true,
            },
        ],
    });
}

// ============================================================================
// Set coins
// ============================================================================

export async function setCoinsFormHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const entry = getNonNegativeInteger(event.values.coins);

    if (entry === undefined) {
        context.ui.showToast("You must enter a coin value of 0 or higher.");
        return;
    }

    const user = await getTargetUserFromContext(context);
    if (!user) {
        context.ui.showToast("Cannot set coins. User may be shadowbanned.");
        return;
    }

    const profile = new UserProfile(user, context);
    await profile.setCoins(entry);
    await profile.evaluateAchievements();
    await profile.writeAudit("moderator_set_coins", { value: entry });
    context.ui.showToast(`Coins for ${user.username} are now ${entry}`);
}

export async function handleSetCoins(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot set coins. User may be shadowbanned.");
        return;
    }

    if (await isProtectedBotUser(user, context)) {
        context.ui.showToast(`${user.username}'s coins cannot be set`);
        return;
    }

    const currentCoins = await new UserProfile(user, context).getCoins();

    context.ui.showForm(setCoinsForm, {
        fields: [
            {
                name: "coins",
                type: "number",
                defaultValue: currentCoins,
                label: `Enter a new coin value for ${user.username}`,
                helpText:
                    "Warning: This will overwrite the coins that currently exist.",
                multiSelect: false,
                required: true,
            },
        ],
    });
}

// ============================================================================
// Set reputation
// ============================================================================

export async function setRepFormHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const entry = getNonNegativeInteger(event.values.rep);

    if (entry === undefined) {
        context.ui.showToast(
            "You must enter a reputation value of 0 or higher."
        );
        return;
    }

    const user = await getTargetUserFromContext(context);
    if (!user) {
        context.ui.showToast(
            "Cannot set reputation. User may be shadowbanned."
        );
        return;
    }

    const profile = new UserProfile(user, context);
    await profile.setReputation(entry);
    await profile.evaluateAchievements();
    await profile.writeAudit("moderator_set_reputation", { value: entry });
    context.ui.showToast(`Reputation for ${user.username} is now ${entry}`);
}

export async function handleSetRep(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast(
            "Cannot set reputation. User may be shadowbanned."
        );
        return;
    }

    if (await isProtectedBotUser(user, context)) {
        context.ui.showToast(`${user.username}'s rep cannot be set`);
        return;
    }

    const currentRep = await new UserProfile(user, context).getReputation();

    context.ui.showForm(setRepForm, {
        fields: [
            {
                name: "rep",
                type: "number",
                defaultValue: currentRep,
                label: `Enter a new reputation value for ${user.username}`,
                helpText:
                    "Warning: This will overwrite the reputation that currently exists.",
                multiSelect: false,
                required: true,
            },
        ],
    });
}

// ============================================================================
// Remove VIP
// ============================================================================

export async function removeVipHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const confirmText = String(event.values.confirmation ?? "")
        .trim()
        .toLowerCase();

    if (confirmText !== "confirm") {
        context.ui.showToast(`⚠️ You must type "confirm" (case insensitive)`);
        logger.warn("⚠️ Moderator failed confirmation input.", { confirmText });
        return;
    }

    const user = await getTargetUserFromContext(context);
    if (!user) {
        context.ui.showToast("Cannot remove VIP. User may be shadowbanned");
        return;
    }

    const profile = new UserProfile(user, context);
    if (!(await profile.hasActiveVIP())) {
        context.ui.showToast(`${user.username} does not currently have VIP`);
        return;
    }

    await profile.removeVIP();
    await profile.writeAudit("moderator_vip_remove");
    context.ui.showToast(`VIP has been removed from ${user.username}`);
}

export async function handleRemoveVip(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot remove VIP. User may be shadowbanned");
        return;
    }

    if (await isProtectedBotUser(user, context)) {
        context.ui.showToast(`${user.username} cannot receive VIP status`);
        return;
    }

    const profile = new UserProfile(user, context);
    if (!(await profile.hasActiveVIP())) {
        context.ui.showToast(`${user.username} does not currently have VIP`);
        return;
    }

    context.ui.showForm(removeVipForm, {
        fields: [
            {
                name: "confirmation",
                type: "string",
                label: `Confirm you wish to remove VIP from ${user.username}`,
                helpText:
                    'This action cannot be undone. Type "confirm" (case insensitive) to confirm this',
                multiSelect: false,
                required: true,
            },
        ],
    });
}
