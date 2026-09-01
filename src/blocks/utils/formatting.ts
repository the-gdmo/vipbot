import { CommentSubmit, CommentUpdate, PostSubmit } from "@devvit/protos";
import { logger } from "./logger";

export function formatFlair(
    template: string,
    placeholders: Record<string, string>
): string {
    let result = template;
    for (const [key, value] of Object.entries(placeholders)) {
        const singleRegex = new RegExp(`{${key}}`, "gi");
        const doubleRegex = new RegExp(`{{${key}}}`, "gi");
        if (doubleRegex.test(result)) {
            logger.debug(`Replacing {{${key}}} with ${value}`);
            result = result.replaceAll(doubleRegex, value);
        } else if (singleRegex.test(result)) {
            logger.debug(`Replacing {${key}} with ${value}`);
            result = result.replaceAll(singleRegex, value);
        }
    }

    return result;
}

export function formatMessage(
    event: CommentSubmit | CommentUpdate | PostSubmit,
    template: string,
    placeholders: Record<string, string>
): string {
    if (!event.subreddit) return "";
    let result = template;
    for (const [key, value] of Object.entries(placeholders)) {
        const singleRegex = new RegExp(`{${key}}`, "gi");
        const doubleRegex = new RegExp(`{{${key}}}`, "gi");
        if (doubleRegex.test(result)) {
            logger.debug(`Replacing {{${key}}} with ${value}`);
            result = result.replaceAll(doubleRegex, value);
        } else if (singleRegex.test(result)) {
            logger.debug(`Replacing {${key}} with ${value}`);
            result = result.replaceAll(singleRegex, value);
        }
    }

    const footer = `\n\n---\n\n^(I am a bot — [contact the mods of r/${event.subreddit.name}](https://reddit.com/message/compose?to=r/${event.subreddit.name}) with any questions or [r/VIPBot2](https://www.reddit.com/message/compose?to=r/VIPBot2) to talk directly with my developer)`;
    if (!result.trim().endsWith(footer)) {
        result = result.trim() + footer;
    }

    return result;
}

export function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}