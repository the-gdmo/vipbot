import { JobContext, JSONObject, ScheduledJobEvent } from "@devvit/public-api";
import { SafeWikiClient } from "./leaderboard";
import { logger } from "../utils/logger";

function modInfoTemplate(context: JobContext): string {
    return (
        `# VIP Bot Mod Info for r/${context.subredditName}\n\n` +
        `***This page is automatically managed by [VIP Bot](https://reddit.com/u/vipbot2). Any edits will be overwritten.***\n\n` +
        `---\n\n` +
        `## General Information\n\n` +
        `There is currently no information for this bot. Check back in the future.\n\n` +
        `NOTE: This page's capacity for content will only change when the bot is updated. ` +
        `You can update the bot in [your subreddit's VIP Bot settings](https://developers.reddit.com/r/${context.subredditName}/apps/${context.appSlug}).`
    );
}

export async function modInfoJob(
    _: ScheduledJobEvent<JSONObject | undefined>,
    context: JobContext,
) {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const subredditName = subreddit.name;
    const safeWiki = new SafeWikiClient(context.reddit);
    const wikiPath = "vipbot/modinfo";

    const template = modInfoTemplate(context);

    let existingPage = undefined;
    try {
        existingPage = await safeWiki.getWikiPage(subredditName, wikiPath);

        if (!existingPage) {
            await safeWiki.createWikiPage({
                subredditName,
                page: wikiPath,
                content: template,
                reason: "Mod info wiki page setup",
            });
            logger.info(`📘 No existing wiki page found — created ${wikiPath}`);
        } else {
            logger.info("ℹ️ Existing mod info wiki page found");
        }
    } catch (err) {
        logger.error("❌ Error retrieving mod info wiki page", {
            error: String(err),
        });
    }
    // ──────────────── set page content to template ────────────────

    await context.reddit.updateWikiPage({
        subredditName,
        page: wikiPath,
        content: template,
        reason: `Set page to template content`,
    });
}
