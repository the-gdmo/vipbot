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
        //| **VIP Points** | 1,247 |
        const userVipPointsKey = await USER_VIP_POINTS_KEY(this.user);
        const points = await this.context.redis.get(userVipPointsKey);

        return points ? Number(points) : 0;
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
            this.getSubredditRank(),
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
        //| **Subreddit Rank** | #12 |
        return 0;
    }

    private async getVipPointsReceived() {
        // TODO: Implement VIP points received lookup.
        //| **VIP Points Received** | 386 |
        return 0;
    }

    private async getVipPointsGiven() {
        // TODO: Implement VIP points given lookup.
        //| **VIP Points Given** | 386 |

        return 0;
    }

    private async getCurrentUserLevel() {
        // TODO: Implement current level lookup.
        //| **Current Level** | 13 |

        return 0;
    }

    private async getNextUserLevel() {
        // TODO: Implement next level lookup.
        //| **Next Level** | 14 |
        return 0;
    }

    private async getXpToNextLevel() {
        // TODO: Implement XP-to-next-level lookup.
        //| **XP To Next Level** | 100 |
        return 0;
    }
}
