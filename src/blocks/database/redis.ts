import { TriggerContext } from "@devvit/public-api";

export async function userPointsKeyExists(context: TriggerContext, subredditName: string, authorName: string): Promise<boolean> {
    const userPointsKey = `user_points:${subredditName}:${authorName}`;
    const exists = await context.redis.exists(userPointsKey);
    return exists === 1;
}

export async function setUserPoints(context: TriggerContext, subredditName: string, authorName: string, points: number): Promise<void> {
    const userPointsKey = `user_points:${subredditName}:${authorName}`;
    await context.redis.set(userPointsKey, points.toString());
}

export async function getUserPoints(context: TriggerContext, subredditName: string, authorName: string): Promise<number> {
    const userPointsKey = `user_points:${subredditName}:${authorName}`;
    const pointsStr = await context.redis.get(userPointsKey);
    return pointsStr ? parseInt(pointsStr, 10) : 0;
}