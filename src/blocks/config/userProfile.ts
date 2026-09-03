import { TriggerContext, User } from "@devvit/public-api";
import { USER_VIP_POINTS_KEY } from "./constants";

export class UserProfile {
    constructor(
        private readonly user: User,
        private readonly context: TriggerContext
    ) {}

    async setVipPoints(points: number): Promise<void> {
        const userVipPointsKey = await USER_VIP_POINTS_KEY(this.user);
        await this.context.redis.set(userVipPointsKey, points.toString());
    }

    async getVipPoints(): Promise<number> {
        const userVipPointsKey = await USER_VIP_POINTS_KEY(this.user);
        const points = await this.context.redis.get(userVipPointsKey);

        return points ? Number(points) : 0;
    }

    async getReputation() {
        const [
            vipPoints,
            subredditRank,
            vipPointsReceived,
            vipPointsGiven,
            currentLevel,
            nextLevel,
            xpToNextLevel,
        ] = await Promise.all([
            this.getVipPoints(),
            this.getSubredditRank(),
            this.getVipPointsReceived(),
            this.getVipPointsGiven(),
            this.getCurrentUserLevel(),
            this.getNextUserLevel(),
            this.getXpToNextLevel(),
        ]);

        return {
            vipPoints,
            subredditRank,
            vipPointsReceived,
            vipPointsGiven,
            currentLevel,
            nextLevel,
            xpToNextLevel,
        };
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

    async getAchievements() {
        return [];
    }

    async getRecentAwards() {
        return [];
    }

    async getPointHistory() {
        return {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            thisYear: 0,
            allTime: await this.getVipPoints(),
        };
    }

    private async getSubredditRank() {
        // TODO: Implement subreddit rank lookup.
        return 0;
    }

    private async getVipPointsReceived() {
        // TODO: Implement VIP points received lookup.
        return 0;
    }

    private async getVipPointsGiven() {
        // TODO: Implement VIP points given lookup.
        return 0;
    }

    private async getCurrentUserLevel() {
        // TODO: Implement current level lookup.
        return 0;
    }

    private async getNextUserLevel() {
        // TODO: Implement next level lookup.
        return 0;
    }

    private async getXpToNextLevel() {
        // TODO: Implement XP-to-next-level lookup.
        return 0;
    }
}
