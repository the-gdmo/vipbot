import { User } from "@devvit/public-api";

//Constant Keys Without Functions
export const POINTS_STORE_KEY = "vipPointsStore";

// Job Names
export const UPDATE_MODINFO_JOB = "updateModInfo";
export const CLEANUP_JOB = "cleanupDeletedAccounts";
export const ADHOC_CLEANUP_JOB = "cleanupDeletedAccountsAdhoc";
export const UPDATE_BOT_FLAIR_JOB = "updateBotFlair";
export const MOD_DIGEST_JOB = "modDigest";
// export const UPGRADE_NOTIFIER_JOB = "upgradeNotifier";

// Job Cron
export const CLEANUP_JOB_CRON = "0 0 * * *";
export const MOD_DIGEST_CRON = "* * * * *";
export const MODINFO_CRON = "* * * * *";
export const BOT_FLAIR_CRON = "* * * * *";
// export const UPGRADE_NOTIFIER_CRON = "* * * * *";

// Constant Keys Using Functions
export async function USER_VIP_POINTS_KEY(user: User): Promise<string> {
    return `vipPoints:${user}`;
}