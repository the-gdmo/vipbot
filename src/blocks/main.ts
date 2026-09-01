import {
    appSettings,
} from "./config/settings";
import { onPostSubmit } from "./handlers/postSubmit";
import { onCommentSubmit } from "./handlers/commentSubmit";
import { onAppFirstInstall, onAppInstallOrUpgrade } from "./handlers/installEvents";
import { Devvit } from "@devvit/public-api";

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
// Export
// ─────────────────────────────────────────────────────────────

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
