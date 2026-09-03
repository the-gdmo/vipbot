import {
    appSettings,
} from "./config/settings";
import { onPostSubmit } from "./handlers/postSubmit";
import { onAppFirstInstall, onAppInstallOrUpgrade } from "./handlers/installEvents";
import { Devvit } from "@devvit/public-api";
import { CLEANUP_JOB, UPDATE_MODINFO_JOB } from "./config/constants";
import { cleanupDeletedAccounts } from "./jobs/cleanup";
import { modInfoJob } from "./jobs/modInfo";
import { onCommentSubmit } from "./handlers/commentSubmit";

/**
 *
 * Main Devvit Blocks entry point.
 *
 * All triggers/functionality are registered here.
 */

// ─────────────────────────────────────────────────────────────
// App configuration
// ─────────────────────────────────────────────────────────────

Devvit.addSettings(appSettings);
// ─────────────────────────────────────────────────────────────
// Post Submit
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    event: "PostSubmit",
    onEvent: onPostSubmit,
});

// ─────────────────────────────────────────────────────────────
// Comment Submit/Update
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    events: ["CommentSubmit", "CommentUpdate"],
    onEvent: onCommentSubmit,
});

// ─────────────────────────────────────────────────────────────
// App Install
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    event: "AppInstall",
    onEvent: onAppFirstInstall,
});

// ─────────────────────────────────────────────────────────────
// App Install/Upgrade
// ─────────────────────────────────────────────────────────────

Devvit.addTrigger({
    events: ["AppInstall", "AppUpgrade"],
    onEvent: onAppInstallOrUpgrade,
});

// ─────────────────────────────────────────────────────────────
// Scheduler Jobs
// ─────────────────────────────────────────────────────────────

Devvit.addSchedulerJob({
    name: CLEANUP_JOB,
    onRun: cleanupDeletedAccounts,
});

Devvit.addSchedulerJob({
    name: UPDATE_MODINFO_JOB,
    onRun: modInfoJob,
})

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
