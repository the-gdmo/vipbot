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

/*
 * Get the user's rank/title from LevelThresholds.
 *
 * Format:
 * 1|0|Newcomer
 * 2|100|Supporter
 * 3|500|Bronze
 * 4|1500|Silver
 * 5|5000|Gold
 * 6|15000|Diamond
 * 7|50000|Elite
 * 8|100000|Platinum
 * 9|200000|Champion
 * 10|300000|Legend
 * 11|500000|Mythic
 * 12|1000000|A League Of Their Own
 */

export async function getRankFromScore(
    context: TriggerContext,
    user: string,
    score: number,
): Promise<string> {
    const settings = await context.settings.getAll();

    const levelThresholds = settings[AppSetting.LevelThresholds];

    if (typeof levelThresholds !== "string" || !levelThresholds.trim()) {
        return "Newcomer";
    }

    const thresholds: Array<{
        level: number;
        points: number;
        rankName: string;
    }> = [];

    for (const line of levelThresholds.split(/\r?\n/)) {
        const trimmedLine = line.trim();

        // Ignore empty lines.
        if (!trimmedLine) {
            continue;
        }

        const split = trimmedLine.split("|").map((value) => value.trim());

        if (split.length < 3) {
            logger.warn("⚠️ Invalid level threshold format", {
                line: trimmedLine,
            });
            continue;
        }

        const level = Number(split[0]);
        const points = Number(split[1]);
        const rankName = split.slice(2).join("|").trim();

        logger.info(`Checking array split values for getRankFromScore()`, {
            rankName,
            splitArr2: split[2],
        });
        if (!Number.isInteger(level) || !Number.isFinite(points) || !rankName) {
            logger.warn("⚠️ Invalid level threshold values", {
                line: trimmedLine,
            });
            continue;
        }

        thresholds.push({
            level,
            points,
            rankName,
        });
    }

    /*
     * If no valid thresholds were found, default to the
     * rank associated with level 1.
     */
    if (thresholds.length === 0) {
        return "Newcomer";
    }

    /*
     * Sort thresholds from lowest points to highest points.
     */
    thresholds.sort((a, b) => a.points - b.points);

    /*
     * Find the highest rank whose required points
     * are less than or equal to the user's score.
     */
    let rankName = thresholds[0]?.rankName ?? "Newcomer";

    for (const threshold of thresholds) {
        if (score >= threshold.points) {
            rankName = threshold.rankName;
        } else {
            break;
        }
    }

    logger.debug("🏆 Calculated user rank", {
        user,
        score,
        rank: rankName,
    });

    return rankName;
}

/*
 * Get the user's level from LevelThresholds.
 *
 * Format:
 * 1|0|Newcomer
 * 2|100|Supporter
 * 3|500|Bronze
 * 4|1500|Silver
 * 5|5000|Gold
 * 6|15000|Diamond
 * 7|50000|Elite
 * 8|100000|Platinum
 * 9|200000|Champion
 * 10|300000|Legend
 * 11|500000|Mythic
 * 12|1000000|A League Of Their Own
 */

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
    }> = [];

    for (const line of levelThresholds.split(/\r?\n/)) {
        const trimmedLine = line.trim();

        // Ignore empty lines.
        if (!trimmedLine) {
            continue;
        }

        const split = trimmedLine.split("|").map((value) => value.trim());

        if (split.length < 3) {
            logger.warn("⚠️ Invalid level threshold format", {
                line: trimmedLine,
            });
            continue;
        }

        const level = Number(split[0]);
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

export async function incrementLevel(
    context: TriggerContext,
    user: string,
    score: number,
    increment: number,
): Promise<number> {
    const level = await getLevelFromScore(context, user, score);

    return level + increment;
}
