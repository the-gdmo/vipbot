import { TriggerContext } from "@devvit/public-api";
import { AppInstall, AppUpgrade } from "@devvit/protos";
import { populateCleanupLogAndScheduleCleanup } from "../jobs/cleanup";
import {
    CLEANUP_JOB,
    CLEANUP_JOB_CRON,
    MODINFO_CRON,
    UPDATE_LEADERBOARD_JOB,
    UPDATE_MODINFO_JOB,
    // UPGRADE_NOTIFIER_CRON,
    // UPGRADE_NOTIFIER_JOB,
} from "../config/constants";

export async function onAppFirstInstall(
    _: AppInstall,
    context: TriggerContext
) {
    await context.redis.set("InstallDate", new Date().getTime().toString());
}

export async function onAppInstallOrUpgrade(
    _: AppInstall | AppUpgrade,
    context: TriggerContext
) {
    const currentJobs = await context.scheduler.listJobs();
    await Promise.all(
        currentJobs.map((job) => context.scheduler.cancelJob(job.id))
    );

    await context.scheduler.runJob({
        name: CLEANUP_JOB,
        cron: CLEANUP_JOB_CRON,
    });
    await context.scheduler.runJob({
        name: UPDATE_MODINFO_JOB,
        cron: MODINFO_CRON,
    });
    // await context.scheduler.runJob({
    //     name: UPGRADE_NOTIFIER_JOB,
    //     cron: UPGRADE_NOTIFIER_CRON,
    // });

    await populateCleanupLogAndScheduleCleanup(context);

    await context.scheduler.runJob({
        name: UPDATE_LEADERBOARD_JOB,
        runAt: new Date(),
        data: { reason: "RepVIPBots been installed or upgraded." },
    });
}
