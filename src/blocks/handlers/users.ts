import { FlairTextColor, JobContext, JSONObject, ScheduledJobEvent } from "@devvit/public-api";

import { AppSetting, TemplateDefaults } from "../config/settings";
import { logger } from "../utils/logger";

export async function botFlairJob(
    _: ScheduledJobEvent<JSONObject | undefined>,
    context: JobContext
) {
    if (!context.subredditName) return;

    const settings = await context.settings.getAll();
    const subredditName = context.subredditName;

    const flairText = "VIP Bot | /help";

    const backgroundColor =
        (settings[AppSetting.BotFlairBackgroundColor] as string | undefined) ??
        TemplateDefaults.BotFlairBackgroundColor;

    // Get existing flair templates
    const flairTemplates = await context.reddit.getUserFlairTemplates(
        subredditName
    );

    // Find the bot flair template
    let botFlairTemplate = flairTemplates.find(
        (flair) =>
            flair.text === flairText &&
            flair.backgroundColor === backgroundColor
    );

    let textColor: FlairTextColor | undefined;

    const BotFlairTextColor = (
            settings[AppSetting.BotFlairTextColor] as string[]
        )?.[0];
    if (BotFlairTextColor === "light") {
        textColor = "light"
        logger.info(`Text color for bot flair is "light"`)
    } else if (BotFlairTextColor === "dark") {
        textColor = "dark"
        logger.info(`Text color for bot flair is "dark"`)
    } else {
        logger.error(`No text color found for bot flair`)
    }
    // Create the flair template if it doesn't exist
    if (!botFlairTemplate) {
        botFlairTemplate = await context.reddit.createUserFlairTemplate({
            subredditName,
            text: flairText,
            textColor,
            backgroundColor,
        });
    }

    // Apply the flair to the bot account
    await context.reddit.setUserFlair({
        subredditName,
        username: context.appSlug,
        text: flairText,
        textColor,
        backgroundColor,
    });
}
