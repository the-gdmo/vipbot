/*
| Level | Title     | XP Required |
| ----: | --------- | ----------: |
|     1 | Newcomer  |           0 |
|     2 | Supporter |         100 |
|     3 | Bronze    |         500 |
|     4 | Silver    |       1,500 |
|     5 | Gold      |       5,000 |
|     6 | Diamond   |      15,000 |
|     7 | Elite     |      50,000 |
|     8 | Legendary |     100,000 |
*/

import { TriggerContext } from "@devvit/public-api";
import { AppSetting } from "../config/settings";
import { logger } from "../utils/logger";
import { USER_STORE_KEY } from "../config/constants";

export async function getLevelFromScore(
    context: TriggerContext,
    user: string,
    score: number,
): Promise<number> {
    const settings = await context.settings.getAll();

    const levelThresholds = settings[AppSetting.LevelThresholds];

    if (typeof levelThresholds !== "string" || !levelThresholds.trim()) {
        return 1;
    }

    const thresholds: Array<{
        level: number;
        points: number;
        rank: string;
    }> = [];

    for (const line of levelThresholds.split(/\r?\n/)) {
        const trimmedLine = line.trim();

        // Ignore empty lines.
        if (!trimmedLine) {
            continue;
        }

        const split = trimmedLine.split("|").map((value) => value.trim());

        if (split.length !== 3) {
            logger.warn("⚠️ Invalid level threshold format", {
                line: trimmedLine,
                parts: split,
                partCount: split.length,
            });
            continue;
        }

        const level = Number(split[0]);
        const xpRequired = Number(split[1]);
        const title = split[2];

        if (
            !Number.isInteger(level) ||
            !title ||
            !Number.isFinite(xpRequired)
        ) {
            logger.warn("⚠️ Invalid level threshold values", {
                line: trimmedLine,
                level: split[0],
                title: split[1],
                xpRequired: split[2],
            });
            continue;
        }

        const points = Number(split[1]);

        if (!Number.isInteger(level) || !Number.isFinite(points)) {
            logger.warn("⚠️ Invalid level threshold values", {
                line: trimmedLine,
            });
            continue;
        }

        thresholds.push({
            level,
            points,
            rank: title,
        });
    }

    /*
     * If no valid thresholds were found, default to level 1.
     */
    if (thresholds.length === 0) {
        return 1;
    }

    /*
     * Sort thresholds from lowest points to highest points.
     */
    thresholds.sort((a, b) => a.points - b.points);

    /*
     * Find the highest level whose required points
     * are less than or equal to the user's score.
     */
    let level = thresholds[0]?.level ?? 1;

    for (const threshold of thresholds) {
        if (score >= threshold.points) {
            level = threshold.level;
        } else {
            break;
        }
    }

    logger.debug("📊 Calculated user level", {
        user,
        score,
        level,
    });

    return level;
}

//todo: make this work
export async function getXpRequiredForNextRank(): Promise<Number> {
    let xpRequiredForNextRank = 0;

    return xpRequiredForNextRank;
}

//todo: make this work
export async function getTitleFromScore(): Promise<string> {
    let title = "";

    return title;
}
export async function incrementLevel(
    context: TriggerContext,
    user: string,
    currentScore: number,
    increment: number,
): Promise<string | undefined> {
    const level = await getLevelFromScore(context, user, currentScore);
    const increase = level + increment;
    context.redis.set(`${USER_STORE_KEY}`, increase.toString());
    return context.redis.get(`${USER_STORE_KEY}:${user}`);
}
