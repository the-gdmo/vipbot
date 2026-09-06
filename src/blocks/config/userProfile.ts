import { TriggerContext, User } from "@devvit/public-api";
import { USER_VIP_POINTS_KEY } from "./constants";

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

    async getReputation(vipPoints: Promise<number>, subredditRank: Promise<number>, pointsGiven: Promise<number>, pointsReceived: Promise<number>, currentLevel: Promise<number>, nextLevel: any, xpToNextLevel: Promise<number>) {

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
        xpToNextLevel: Promise<number>,
    ): Promise<void> {
        await Promise.all([
            this.setCurrentUserLevel(currentLevel),
            this.setVipPoints(vipPoints),
            this.setNextUserLevel(nextLevel),
            this.setXpToNextLevel(xpToNextLevel),
        ]);
    }

    async getProgress(currentLevel: Promise<number>, vipPoints: Promise<number>, nextLevel: Promise<number>, xpToNextLevel: Promise<number>) {

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
