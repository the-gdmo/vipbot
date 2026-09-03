import { TriggerContext, User } from "@devvit/public-api";
import { USER_VIP_POINTS_KEY } from "./constants";

export class UserProfile {
    constructor(
        private readonly user: User,
        private readonly context: TriggerContext
    ) {}

    async setVipPoints(value: number): Promise<void> {
        const userVipPointsKey = await USER_VIP_POINTS_KEY(this.user);

        await this.context.redis.set(userVipPointsKey, value.toString());
    }

    async getVipPoints(): Promise<number> {
        const userVipPointsKey = await USER_VIP_POINTS_KEY(this.user);
        const points = await this.context.redis.get(userVipPointsKey);

        return points ? Number(points) : 0;
    }

    async setSubRank(value: number): Promise<void> {
        const key = `userProfile:${this.user.username}:subRank`;

        await this.context.redis.set(key, value.toString());
    }

    async getSubRank(): Promise<number> {
        const key = `userProfile:${this.user.username}:subRank`;
        const rank = await this.context.redis.get(key);

        return rank ? Number(rank) : 0;
    }

    async setReputation(value: {
        vipPoints: number;
        subredditRank: number;
        vipPointsGiven: number;
        vipPointsReceived: number;
        currentLevel: number;
        nextLevel: number;
        xpToNextLevel: number;
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

    async getReputation() {
        const [
            vipPoints,
            subredditRank,
            vipPointsGiven,
            vipPointsReceived,
            currentLevel,
            nextLevel,
            xpToNextLevel,
        ] = await Promise.all([
            this.getVipPoints(),
            this.getSubRank(),
            this.getVipPointsGiven(),
            this.getVipPointsReceived(),
            this.getCurrentUserLevel(),
            this.getNextUserLevel(),
            this.getXpToNextLevel(),
        ]);

        return {
            vipPoints,
            subredditRank,
            vipPointsGiven,
            vipPointsReceived,
            currentLevel,
            nextLevel,
            xpToNextLevel,
        };
    }

    async setProgress(value: {
        currentLevel: number;
        vipPoints: number;
        nextLevel: number;
        xpToNextLevel: number;
    }): Promise<void> {
        await Promise.all([
            this.setCurrentUserLevel(value.currentLevel),
            this.setVipPoints(value.vipPoints),
            this.setNextUserLevel(value.nextLevel),
            this.setXpToNextLevel(value.xpToNextLevel),
        ]);
    }

    async getProgress() {
        const [currentLevel, vipPoints, nextLevel, xpToNextLevel] =
            await Promise.all([
                this.getCurrentUserLevel(),
                this.getVipPoints(),
                this.getNextUserLevel(),
                this.getXpToNextLevel(),
            ]);

        return {
            currentLevel,
            vipPoints,
            nextLevel,
            xpToNextLevel,
        };
    }

    async setAchievements(value: string[]): Promise<void> {
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
            points: number;
        }[]
    ): Promise<void> {
        const key = `userProfile:${this.user.username}:recentAwards`;

        await this.context.redis.set(key, JSON.stringify(value));
    }

    async getRecentAwards(): Promise<
        {
            date: string;
            awardedBy: string;
            points: number;
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
                points: number;
            }[];
        } catch {
            return [];
        }
    }

    async setPointHistory(value: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        thisYear: number;
        allTime: number;
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
                today: number;
                thisWeek: number;
                thisMonth: number;
                thisYear: number;
                allTime: number;
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

    async setVipPointsReceived(value: number): Promise<void> {
        const key = `userProfile:${this.user.username}:vipPointsReceived`;

        await this.context.redis.set(key, value.toString());
    }

    async getVipPointsReceived(): Promise<number> {
        const key = `userProfile:${this.user.username}:vipPointsReceived`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setVipPointsGiven(value: number): Promise<void> {
        const key = `userProfile:${this.user.username}:vipPointsGiven`;

        await this.context.redis.set(key, value.toString());
    }

    async getVipPointsGiven(): Promise<number> {
        const key = `userProfile:${this.user.username}:vipPointsGiven`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setCurrentUserLevel(value: number): Promise<void> {
        const key = `userProfile:${this.user.username}:currentLevel`;

        await this.context.redis.set(key, value.toString());
    }

    async getCurrentUserLevel(): Promise<number> {
        const key = `userProfile:${this.user.username}:currentLevel`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setNextUserLevel(value: number): Promise<number> {
        const key = `userProfile:${this.user.username}:nextLevel`;

        await this.context.redis.set(key, value.toString());

        return value;
    }

    async getNextUserLevel(): Promise<number> {
        const key = `userProfile:${this.user.username}:nextLevel`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }

    async setXpToNextLevel(value: number): Promise<void> {
        const key = `userProfile:${this.user.username}:xpToNextLevel`;

        await this.context.redis.set(key, value.toString());
    }

    async getXpToNextLevel(): Promise<number> {
        const key = `userProfile:${this.user.username}:xpToNextLevel`;
        const value = await this.context.redis.get(key);

        return value ? Number(value) : 0;
    }
}
