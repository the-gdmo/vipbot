import {
    Context,
    FormOnSubmitEvent,
    JSONObject,
    MenuItemOnPressEvent,
    TriggerContext,
    User,
} from "@devvit/public-api";
import { USER_VIP_POINTS_KEY } from "./constants";
import {
    getCurrentScore,
    ScoreResult,
    setUserScore,
} from "../utils/common-utils";
import {
    manualSetPointsForm,
    removeVipForm,
    setCoinsForm,
    setRepForm,
    setXpForm,
    vipAddDaysForm,
} from "../main";
import { logger } from "../utils/logger";
import { AppSetting, TemplateDefaults } from "./settings";

export class UserProfile {
    constructor(
        private readonly user: User,
        private readonly context: TriggerContext
    ) {}

    async setVipPoints(value: Promise<number>): Promise<void> {
        const userVipPointsKey = await USER_VIP_POINTS_KEY(this.user);

        await this.context.redis.set(userVipPointsKey, value.toString());
    }

    async getVipPoints(): Promise<number> {
        const userVipPointsKey = await USER_VIP_POINTS_KEY(this.user);
        const points = await this.context.redis.get(userVipPointsKey);

        return points ? Number(points) : 0;
    }

    async setSubRank(value: Promise<number>): Promise<void> {
        const key = `userProfile:${this.user.username}:subRank`;

        await this.context.redis.set(key, value.toString());
    }

    async getSubRank(): Promise<number> {
        const key = `userProfile:${this.user.username}:subRank`;
        const rank = await this.context.redis.get(key);

        return rank ? Number(rank) : 0;
    }

    async setReputation(value: {
        vipPoints: Promise<number>;
        subredditRank: Promise<number>;
        vipPointsGiven: Promise<number>;
        vipPointsReceived: Promise<number>;
        currentLevel: Promise<number>;
        nextLevel: Promise<number>;
        xpToNextLevel: Promise<number>;
    }): Promise<void> {
        await Promise.all([
            this.setVipPoints(value.vipPoints),
            this.setSubRank(value.subredditRank),
            this.setVipPointsGiven(value.vipPointsGiven),
            this.setVipPointsReceived(value.vipPointsReceived),
            this.setCurrentUserLevel(value.currentLevel),
            this.setNextUserLevel(value.nextLevel),
            this.setXpToNextLevel(value.xpToNextLevel),
        ]);
    }

    async getReputation(
        vipPoints: Promise<number>,
        subredditRank: Promise<number>,
        pointsGiven: Promise<number>,
        pointsReceived: Promise<number>,
        currentLevel: Promise<number>,
        nextLevel: any,
        xpToNextLevel: Promise<number>
    ) {
        return {
            vipPoints,
            subredditRank,
            pointsGiven,
            pointsReceived,
            currentLevel,
            nextLevel,
            xpToNextLevel,
        };
    }

    async setProgress(
        currentLevel: Promise<number>,
        vipPoints: Promise<number>,
        nextLevel: Promise<number>,
        xpToNextLevel: Promise<number>
    ): Promise<void> {
        await Promise.all([
            this.setCurrentUserLevel(currentLevel),
            this.setVipPoints(vipPoints),
            this.setNextUserLevel(nextLevel),
            this.setXpToNextLevel(xpToNextLevel),
        ]);
    }

    async getProgress(
        currentLevel: Promise<number>,
        vipPoints: Promise<number>,
        nextLevel: Promise<number>,
        xpToNextLevel: Promise<number>
    ) {
        return {
            currentLevel,
            vipPoints,
            nextLevel,
            xpToNextLevel,
        };
    }

    async setAchievements(value: Promise<string>): Promise<void> {
        const key = `userProfile:${this.user.username}:achievements`;

        await this.context.redis.set(key, JSON.stringify(value));
    }

    async getAchievements(): Promise<string[]> {
        const key = `userProfile:${this.user.username}:achievements`;
        const achievements = await this.context.redis.get(key);

        if (!achievements) {
            return [];
        }

        try {
            return JSON.parse(achievements) as string[];
        } catch {
            return [];
        }
    }

    async setRecentAwards(
        value: {
            date: string;
            awardedBy: string;
            points: Promise<number>;
        }[]
    ): Promise<void> {
        const key = `userProfile:${this.user.username}:recentAwards`;

        await this.context.redis.set(key, JSON.stringify(value));
    }

    async getRecentAwards(): Promise<
        {
            date: string;
            awardedBy: string;
            points: Promise<number>;
        }[]
    > {
        const key = `userProfile:${this.user.username}:recentAwards`;
        const awards = await this.context.redis.get(key);

        if (!awards) {
            return [];
        }

        try {
            return JSON.parse(awards) as {
                date: string;
                awardedBy: string;
                points: Promise<number>;
            }[];
        } catch {
            return [];
        }
    }

    async setPointHistory(value: {
        today: Promise<number>;
        thisWeek: Promise<number>;
        thisMonth: Promise<number>;
        thisYear: Promise<number>;
        allTime: Promise<number>;
    }): Promise<void> {
        const key = `userProfile:${this.user.username}:pointHistory`;

        await this.context.redis.set(key, JSON.stringify(value));
    }

    async getPointHistory() {
        const key = `userProfile:${this.user.username}:pointHistory`;
        const history = await this.context.redis.get(key);

        if (!history) {
            return {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                thisYear: 0,
                allTime: await this.getVipPoints(),
            };
        }

        try {
            return JSON.parse(history) as {
                today: Promise<number>;
                thisWeek: Promise<number>;
                thisMonth: Promise<number>;
                thisYear: Promise<number>;
                allTime: Promise<number>;
            };
        } catch {
            return {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                thisYear: 0,
                allTime: await this.getVipPoints(),
            };
        }
    }

    async setVipPointsReceived(value: Promise<number>): Promise<void> {
        const key = `userProfile:${this.user.username}:vipPointsReceived`;

        await this.context.redis.set(key, value.toString());
    }

    async getVipPointsReceived(): Promise<number> {
        const key = `userProfile:${this.user.username}:vipPointsReceived`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setVipPointsGiven(value: Promise<number>): Promise<void> {
        const key = `userProfile:${this.user.username}:vipPointsGiven`;

        await this.context.redis.set(key, value.toString());
    }

    async getVipPointsGiven(): Promise<number> {
        const key = `userProfile:${this.user.username}:vipPointsGiven`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setCurrentUserLevel(value: Promise<number>): Promise<void> {
        const key = `userProfile:${this.user.username}:currentLevel`;

        await this.context.redis.set(key, value.toString());
    }

    async getCurrentUserLevel(): Promise<number> {
        const key = `userProfile:${this.user.username}:currentLevel`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setNextUserLevel(value: Promise<number>): Promise<number> {
        const key = `userProfile:${this.user.username}:nextLevel`;

        await this.context.redis.set(key, value.toString());

        return value;
    }

    async getNextUserLevel(): Promise<number> {
        const key = `userProfile:${this.user.username}:nextLevel`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setXpToNextLevel(value: Promise<number>): Promise<void> {
        const key = `userProfile:${this.user.username}:xpToNextLevel`;

        await this.context.redis.set(key, value.toString());
    }

    async getXpToNextLevel(): Promise<number> {
        const key = `userProfile:${this.user.username}:xpToNextLevel`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }
}

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
        isNaN(entry) ||
        parseInt(entry.toString(), 10) < 0
    ) {
        context.ui.showToast("You must enter a new score (0 or higher)");
        return;
    }

    const comment = await context.reddit.getCommentById(context.commentId);

    let user: User | undefined;
    try {
        user = await context.reddit.getUserByUsername(comment.authorName);
    } catch {
        //
    }

    if (!user) {
        context.ui.showToast("Cannot set points. User may be shadowbanned");
        return;
    }

    // ✅ Overwrite the user's score directly
    const newScore: ScoreResult = {
        score: entry,
        userHasFlair: false,
        flairIsNumber: false,
    };
    setUserScore(
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
    let username: string | undefined;

    // ============================================================
    // TRY COMMENT
    // ============================================================

    try {
        const comment = await context.reddit.getCommentById(event.targetId);

        username = comment.authorName;
    } catch {
        // Target wasn't a comment, so try post.
    }

    // ============================================================
    // TRY POST
    // ============================================================

    if (!username) {
        try {
            const post = await context.reddit.getPostById(event.targetId);

            username = post.authorName;
        } catch {
            // Target wasn't a post either.
        }
    }

    // ============================================================
    // VALIDATE USERNAME
    // ============================================================

    if (!username) {
        context.ui.showToast(
            "Unable to determine the author of this post or comment"
        );
        return;
    }

    // ============================================================
    // GET USER
    // ============================================================

    let user: User | undefined;

    try {
        user = await context.reddit.getUserByUsername(username);
    } catch {
        // User could not be found.
    }

    if (!user) {
        context.ui.showToast("Cannot set points. User may be shadowbanned");
        return;
    }

    const settings = await context.settings.getAll();
    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;
    const normalizedCommentAuthor = user.username.trim().toLowerCase();
    const normalizedBotName = botsThatWillNotBeManaged.trim().toLowerCase();

    const isBotUser =
        normalizedCommentAuthor === normalizedBotName ||
        normalizedCommentAuthor === "automoderator";
    if (isBotUser) {
        context.ui.showToast(`${user.username}'s points cannot be set`);
        return;
    }
    // ============================================================
    // GET CURRENT SCORE
    // ============================================================

    const currentScore = await getCurrentScore(user, context);

    if (!currentScore) {
        context.ui.showToast("Unable to retrieve current score for user");
        return;
    }

    // ============================================================
    // SHOW FORM
    // ============================================================

    const fields = [
        {
            name: "newScore",
            type: "number",
            defaultValue: currentScore.score,
            label: `Enter a new score for ${user.username}`,
            helpText:
                "Warning: This will overwrite the score that currently exists",
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(manualSetPointsForm, { fields });
}

// ============================================================
// REDIS KEYS
// ============================================================

const getXPKey = (username: string) => `xp:${username}`;
const getCoinsKey = (username: string) => `coins:${username}`;
const getRepKey = (username: string) => `rep:${username}`;
const getVIPKey = (username: string) => `vip:${username}`;

// ============================================================
// TARGET USER HELPERS
// ============================================================

/**
 * Gets the author of either the current comment or post.
 *
 * This allows the menu handlers to work from both:
 * - comment context
 * - post context
 */
async function getTargetUserFromContext(
    context: Context
): Promise<User | undefined> {
    let username: string | undefined;

    // Comment context
    if (context.commentId) {
        try {
            const comment = await context.reddit.getCommentById(
                context.commentId
            );

            username = comment.authorName;
        } catch {
            // Continue and try post context.
        }
    }

    // Post context
    if (!username && context.postId) {
        try {
            const post = await context.reddit.getPostById(context.postId);

            username = post.authorName;
        } catch {
            // User could not be resolved.
        }
    }

    if (!username) {
        return undefined;
    }

    try {
        return await context.reddit.getUserByUsername(username);
    } catch {
        return undefined;
    }
}

/**
 * Gets the author of the menu item's target.
 *
 * This is used by menu handlers because MenuItemOnPressEvent
 * gives us the target ID directly.
 */
async function getTargetUserFromMenuEvent(
    event: MenuItemOnPressEvent,
    context: Context
): Promise<User | undefined> {
    try {
        // Try comment first.
        try {
            const comment = await context.reddit.getCommentById(event.targetId);

            if (comment.authorName) {
                return await context.reddit.getUserByUsername(
                    comment.authorName
                );
            }
        } catch {
            // Not a comment, so try post.
        }

        // Try post.
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

// ============================================================
// INTEGER VALIDATION
// ============================================================

function getNonNegativeInteger(value: unknown): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
    }

    if (!Number.isInteger(value) || value < 0) {
        return undefined;
    }

    return value;
}

// ============================================================
// VIP ADD DAYS
// ============================================================

export async function vipAddDaysFormHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const days = getNonNegativeInteger(event.values.days);

    if (days === undefined || days < 1) {
        context.ui.showToast("Entry must be greater than 0");
        return;
    }

    const user = await getTargetUserFromContext(context);

    if (!user) {
        context.ui.showToast("Cannot add VIP time. User may be shadowbanned");
        return;
    }

    const key = getVIPKey(user.username);

    const existingVIP = await context.redis.get(key);

    const now = Date.now();

    let currentExpiration = 0;

    if (existingVIP) {
        const parsedExpiration = Number(existingVIP);

        if (Number.isFinite(parsedExpiration) && parsedExpiration > now) {
            currentExpiration = parsedExpiration;
        }
    }

    const newExpiration =
        (currentExpiration > now ? currentExpiration : now) +
        days * 24 * 60 * 60 * 1000;

    await context.redis.set(key, newExpiration.toString());

    const expirationDate = new Date(newExpiration);

    context.ui.showToast(
        `${user.username} received ${days} day${days === 1 ? "" : "s"} of VIP`
    );

    console.log(
        `VIP added to ${user.username}: ${days} days` +
            `New expiration: ${expirationDate.toISOString()}`
    );
}

// ============================================================
// VIP ADD DAYS MENU HANDLER
// ============================================================

export async function handleVIPAddDays(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot add VIP time. User may be shadowbanned");
        return;
    }

    const settings = await context.settings.getAll();
    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;
    const normalizedCommentAuthor = user.username.trim().toLowerCase();
    const normalizedBotName = botsThatWillNotBeManaged.trim().toLowerCase();

    const isBotUser =
        normalizedCommentAuthor === normalizedBotName ||
        normalizedCommentAuthor === "automoderator";
    if (isBotUser) {
        context.ui.showToast(`${user.username} cannot be granted VIP`);
        return;
    }

    const key = getVIPKey(user.username);

    const existingVIP = await context.redis.get(key);

    let currentDays = 0;

    if (existingVIP) {
        const expiration = Number(existingVIP);

        if (Number.isFinite(expiration) && expiration > Date.now()) {
            currentDays = Math.ceil(
                (expiration - Date.now()) / (24 * 60 * 60 * 1000)
            );
        }
    }

    const fields = [
        {
            name: "days",
            type: "number",
            defaultValue: 1,
            label: `How many VIP days should be added to ${user.username}?`,
            helpText:
                currentDays > 0
                    ? `${
                          user.username
                      } currently has approximately ${currentDays} day${
                          currentDays === 1 ? "" : "s"
                      } of VIP remaining`
                    : `${user.username} currently does not have active VIP`,
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(vipAddDaysForm, { fields });
}

// ============================================================
// SET XP
// ============================================================

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

    await context.redis.set(getXPKey(user.username), entry.toString());

    context.ui.showToast(`XP for ${user.username} is now ${entry}`);
}

// ============================================================
// SET XP MENU HANDLER
// ============================================================

export async function handleSetXP(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot set XP. User may be shadowbanned");
        return;
    }

    const settings = await context.settings.getAll();
    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;
    const normalizedCommentAuthor = user.username.trim().toLowerCase();
    const normalizedBotName = botsThatWillNotBeManaged.trim().toLowerCase();

    const isBotUser =
        normalizedCommentAuthor === normalizedBotName ||
        normalizedCommentAuthor === "automoderator";
    if (isBotUser) {
        context.ui.showToast(`${user.username}'s xp cannot be set`);
        return;
    }

    const existing = await context.redis.get(getXPKey(user.username));

    const currentXP = existing ? Number(existing) : 0;

    const fields = [
        {
            name: "xp",
            type: "number",
            defaultValue:
                Number.isFinite(currentXP) && currentXP >= 0 ? currentXP : 0,
            label: `Enter a new XP value for ${user.username}`,
            helpText:
                "Warning: This will overwrite the XP that currently exists.",
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(setXpForm, { fields });
}

// ============================================================
// SET COINS
// ============================================================

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

    await context.redis.set(getCoinsKey(user.username), entry.toString());

    context.ui.showToast(`Coins for ${user.username} are now ${entry}`);
}

// ============================================================
// SET COINS MENU HANDLER
// ============================================================

export async function handleSetCoins(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot set coins. User may be shadowbanned.");
        return;
    }

    const settings = await context.settings.getAll();
    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;
    const normalizedCommentAuthor = user.username.trim().toLowerCase();
    const normalizedBotName = botsThatWillNotBeManaged.trim().toLowerCase();

    const isBotUser =
        normalizedCommentAuthor === normalizedBotName ||
        normalizedCommentAuthor === "automoderator";
    if (isBotUser) {
        context.ui.showToast(`${user.username}'s coins cannot be set`);
        return;
    }

    const existing = await context.redis.get(getCoinsKey(user.username));

    const currentCoins = existing ? Number(existing) : 0;

    const fields = [
        {
            name: "coins",
            type: "number",
            defaultValue:
                Number.isFinite(currentCoins) && currentCoins >= 0
                    ? currentCoins
                    : 0,
            label: `Enter a new coin value for ${user.username}`,
            helpText:
                "Warning: This will overwrite the coins that currently exist.",
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(setCoinsForm, { fields });
}

// ============================================================
// SET REP
// ============================================================

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

    await context.redis.set(getRepKey(user.username), entry.toString());

    context.ui.showToast(`Reputation for ${user.username} is now ${entry}`);
}

// ============================================================
// SET REP MENU HANDLER
// ============================================================

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

    const settings = await context.settings.getAll();
    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;
    const normalizedCommentAuthor = user.username.trim().toLowerCase();
    const normalizedBotName = botsThatWillNotBeManaged.trim().toLowerCase();

    const isBotUser =
        normalizedCommentAuthor === normalizedBotName ||
        normalizedCommentAuthor === "automoderator";
    if (isBotUser) {
        context.ui.showToast(`${user.username}'s rep cannot be set`);
        return;
    }

    const existing = await context.redis.get(getRepKey(user.username));

    const currentRep = existing ? Number(existing) : 0;

    const fields = [
        {
            name: "rep",
            type: "number",
            defaultValue:
                Number.isFinite(currentRep) && currentRep >= 0 ? currentRep : 0,
            label: `Enter a new reputation value for ${user.username}`,
            helpText:
                "Warning: This will overwrite the reputation that currently exists.",
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(setRepForm, { fields });
}

// ============================================================
// REMOVE VIP
// ============================================================

export async function removeVipHandler(
    event: FormOnSubmitEvent<JSONObject>,
    context: Context
) {
    const confirmText = String(event.values.confirmation ?? "")
        .trim()
        .toLowerCase();

    const confirm = /^confirm$/gi;
    if (!confirm.test(confirmText)) {
        context.ui.showToast(`⚠️ You must type "confirm" (case insensitive)`);
        logger.warn("⚠️ Moderator failed confirmation input.", { confirmText });
        return;
    }

    const user = await getTargetUserFromContext(context);

    if (!user) {
        context.ui.showToast("Cannot remove VIP. User may be shadowbanned");
        return;
    }

    const key = getVIPKey(user.username);

    const existingVIP = await context.redis.get(key);

    if (!existingVIP) {
        context.ui.showToast(`${user.username} does not currently have VIP`);
        return;
    }

    await context.redis.del(key);

    context.ui.showToast(`VIP has been removed from ${user.username}`);
}

// ============================================================
// REMOVE VIP MENU HANDLER
// ============================================================

export async function handleRemoveVip(
    event: MenuItemOnPressEvent,
    context: Context
) {
    const user = await getTargetUserFromMenuEvent(event, context);

    if (!user) {
        context.ui.showToast("Cannot remove VIP. User may be shadowbanned");
        return;
    }

    const settings = await context.settings.getAll();

    const botsThatWillNotBeManaged =
        (settings[AppSetting.AccountsThatWillNotBeManaged] as string) ??
        TemplateDefaults.AccountsThatWillNotBeManaged;
    const normalizedCommentAuthor = user.username.trim().toLowerCase();
    const normalizedBotName = botsThatWillNotBeManaged.trim().toLowerCase();

    const isBotUser =
        normalizedCommentAuthor === normalizedBotName ||
        normalizedCommentAuthor === "automoderator";
    if (isBotUser) {
        context.ui.showToast(`${user.username} cannot receive VIP status`);
        return;
    }

    const existingVIP = await context.redis.get(getVIPKey(user.username));

    if (!existingVIP) {
        context.ui.showToast(`${user.username} does not currently have VIP`);
        return;
    }

    const fields = [
        {
            name: "confirmation",
            type: "string",
            label: `Confirm you wish to remove VIP from ${user.username}`,
            helpText:
                'This action cannot be undone. Type "confirm" (case insensitive) to confirm this',
            multiSelect: false,
            required: true,
        },
    ];

    context.ui.showForm(removeVipForm, { fields });
}
