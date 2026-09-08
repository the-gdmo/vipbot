import {
    appSettings,
} from "./config/settings";
import { onPostSubmit } from "./handlers/postSubmit";
import { onAppFirstInstall, onAppInstallOrUpgrade } from "./handlers/installEvents";
import { Devvit, FormField } from "@devvit/public-api";
import { CLEANUP_JOB, UPDATE_BOT_FLAIR_JOB, UPDATE_MODINFO_JOB } from "./config/constants";
import { cleanupDeletedAccounts } from "./jobs/cleanup";
import { modInfoJob } from "./jobs/modInfo";
import { onCommentSubmit } from "./handlers/commentSubmit";
import { botFlairJob } from "./handlers/users";
import { handleManualPointSetting, handleRemoveVip, handleSetCoins, handleSetLevel, handleSetRep, handleSetXP, handleVIPAddDays, manualSetPointsFormHandler, removeVipHandler, setCoinsFormHandler, setLevelFormHandler, setRepFormHandler, setXpFormHandler, vipAddDaysFormHandler } from "./config/userProfile";

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

Devvit.addSchedulerJob({
    name: UPDATE_BOT_FLAIR_JOB,
    onRun: botFlairJob,
})

// ─────────────────────────────────────────────────────────────
// Form Handlers
// ─────────────────────────────────────────────────────────────
export const manualSetPointsForm = Devvit.createForm(
    (data) => ({ fields: data.fields as FormField[] }),
    manualSetPointsFormHandler,
);

export const vipAddDaysForm = Devvit.createForm(
    (data) => ({ fields: data.fields as FormField[] }),
    vipAddDaysFormHandler,
);

export const setXpForm = Devvit.createForm(
    (data) => ({ fields: data.fields as FormField[] }),
    setXpFormHandler,
);

export const setCoinsForm = Devvit.createForm(
    (data) => ({ fields: data.fields as FormField[] }),
    setCoinsFormHandler,
);

export const setRepForm = Devvit.createForm(
    (data) => ({ fields: data.fields as FormField[] }),
    setRepFormHandler,
);

export const setLevelForm = Devvit.createForm(
    (data) => ({ fields: data.fields as FormField[] }),
    setLevelFormHandler,
);

export const removeVipForm = Devvit.createForm(
    (data) => ({ fields: data.fields as FormField[] }),
    removeVipHandler,
);

// ─────────────────────────────────────────────────────────────
// Menu Items
// ─────────────────────────────────────────────────────────────

Devvit.addMenuItem({
    label: "[VIP Bot] - Set User Score",
    forUserType: "moderator",
    location: "comment",
    onPress: handleManualPointSetting,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set User Score",
    forUserType: "moderator",
    location: "post",
    onPress: handleManualPointSetting,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Add VIP Days",
    forUserType: "moderator",
    location: "comment",
    onPress: handleVIPAddDays,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Add VIP Days",
    forUserType: "moderator",
    location: "post",
    onPress: handleVIPAddDays,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Experience",
    forUserType: "moderator",
    location: "comment",
    onPress: handleSetXP,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Experience",
    forUserType: "moderator",
    location: "post",
    onPress: handleSetXP,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Coins",
    forUserType: "moderator",
    location: "comment",
    onPress: handleSetCoins,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Coins",
    forUserType: "moderator",
    location: "post",
    onPress: handleSetCoins,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Reputation",
    forUserType: "moderator",
    location: "comment",
    onPress: handleSetRep,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Reputation",
    forUserType: "moderator",
    location: "post",
    onPress: handleSetRep,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Level",
    forUserType: "moderator",
    location: "comment",
    onPress: handleSetLevel,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Set Level",
    forUserType: "moderator",
    location: "post",
    onPress: handleSetLevel,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Remove VIP Status From User",
    forUserType: "moderator",
    location: "comment",
    onPress: handleRemoveVip,
});

Devvit.addMenuItem({
    label: "[VIP Bot] - Remove VIP Status From User",
    forUserType: "moderator",
    location: "post",
    onPress: handleRemoveVip,
});

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
