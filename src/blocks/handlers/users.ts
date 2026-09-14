import {
    FlairTextColor,
    JobContext,
    JSONObject,
    ScheduledJobEvent,
} from "@devvit/public-api";

import { AppSetting, TemplateDefaults } from "../config/settings";
import { logger } from "../utils/logger";

export async function botFlairJob(
    _: ScheduledJobEvent<JSONObject | undefined>,
    context: JobContext
) {
    if (!context.subredditName) return;

    const settings = await context.settings.getAll();
    const subredditName = context.subredditName;
    const prefix = (settings[AppSetting.CommandPrefix] as string) ?? "/";

    const flairText = (
        (settings[AppSetting.BotFlairText] as string | undefined) ??
        `VIP Bot | ${prefix}info`
    )
        .replaceAll(/{{prefix}}/gi, prefix)
        .replaceAll(/{prefix}/gi, prefix);

    if (!flairText) {
        logger.info(`Bot flair not set in app settings, returning.`);
        return;
    }

    const backgroundColor =
        (settings[AppSetting.BotFlairBackgroundColor] as string | undefined) ??
        TemplateDefaults.BotFlairBackgroundColor;

    let textColor: FlairTextColor | undefined;

    const BotFlairTextColor = (
        settings[AppSetting.BotFlairTextColor] as string[]
    )?.[0];

    if (BotFlairTextColor === "light") {
        textColor = "light";
        logger.info(`Text color for bot flair is "light"`);
    } else if (BotFlairTextColor === "dark") {
        textColor = "dark";
        logger.info(`Text color for bot flair is "dark"`);
    } else {
        logger.error(`No text color found for bot flair`);
    }

    logger.info(`Setting bot's flair`, {
        botName: context.appSlug,
        text: flairText,
        textColor,
        backgroundColor,
    });

    // Apply the flair to the bot account
    await context.reddit.setUserFlair({
        subredditName,
        username: context.appSlug,
        text: flairText,
        textColor,
        backgroundColor,
    });
}
