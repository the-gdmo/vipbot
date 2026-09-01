import { CreateWikiPageOptions, RedditAPIClient, TriggerContext } from "@devvit/public-api";
import { AppSetting } from "../config/settings";
import { logger } from "../utils/logger";
import { WikiPage } from "@devvit/protos";
import pluralize from "pluralize";

function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatDate(dateString: number): string {
    const d = new Date(dateString);
    return `${d.getMonth()}/${d.getDate()}/${d.getFullYear()}`;
}

function escapeTitle(title: string): string {
    return title
        .replaceAll(/\|/gi, "\\|")
        .replaceAll(/\[/gi, "\\[")
        .replaceAll(/\]/gi, "\\]");
}

export async function updateUserWiki(
    context: TriggerContext,
    awarder: string,
    recipient: string,
    data: {
        postTitle: string;
        postUrl: string;
        commentUrl: string;
    }
) {
    awarder = awarder.toLowerCase();
    recipient = recipient.toLowerCase();

    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";
    const subredditName =
        context.subredditName ??
        (await context.reddit.getCurrentSubreddit()).name;

    const capPoint = capitalize(pointName);
    const plural = pluralize(pointName);
    const capPlural = capitalize(plural);

    //
    // ──────────────────────────────────────────────────────────────
    // UPDATE DATABASE ENTRIES
    // ──────────────────────────────────────────────────────────────
    //

    // Awarder → GIVEN
    await context.redis.zAdd(`userHistory:given:${awarder}`, {
        member: JSON.stringify({
            date: new Date().toISOString(),
            postTitle: data.postTitle,
            postUrl: data.postUrl,
            recipient,
            commentUrl: data.commentUrl,
        }),
        score: Date.now(),
    });

    // Recipient → RECEIVED
    await context.redis.zAdd(`userHistory:received:${recipient}`, {
        member: JSON.stringify({
            date: new Date().toISOString(),
            postTitle: data.postTitle,
            postUrl: data.postUrl,
            awarder,
            commentUrl: data.commentUrl,
        }),
        score: Date.now(),
    });

    //
    // ──────────────────────────────────────────────────────────────
    // REBUILD BOTH TABLES FROM REDIS
    // ──────────────────────────────────────────────────────────────
    //

    async function loadHistory(key: string) {
        const raw = await context.redis.zRange(key, 0, -1, { by: "rank" });
        return raw.map((r) => JSON.parse(r.member));
    }

    const awarderGiven = await loadHistory(`userHistory:given:${awarder}`);
    const awarderReceived = await loadHistory(
        `userHistory:received:${awarder}`
    );

    const recipientGiven = await loadHistory(`userHistory:given:${recipient}`);
    const recipientReceived = await loadHistory(
        `userHistory:received:${recipient}`
    );

    //
    // ──────────────────────────────────────────────────────────────
    // BUILD TABLES
    // ──────────────────────────────────────────────────────────────
    //

    function buildReceivedTable(list: any[]): string {
        if (list.length === 0) return "No history yet.";

        return `
| Date | Submission |
| :-: | :-- |
${list
    .map(
        (e) =>
            `| ${formatDate(e.date)} | [${escapeTitle(e.postTitle)}](${
                e.postUrl
            })`
    )
    .join("\n")}
`.trim();
    }

    function buildGivenTable(list: any[]): string {
        if (list.length === 0) return "No history yet.";

        return `
| Date | Submission | ${capPoint} Comment | Awarded To |
| :-: | :-- | :-: | :-: |
${list
    .map(
        (e) =>
            `| ${formatDate(e.date)} | [${escapeTitle(e.postTitle)}](${
                e.postUrl
            }) | [Link](${e.commentUrl}) | /u/${e.recipient}`
    )
    .join("\n")}
`.trim();
    }

    const awarderReceivedTable = buildReceivedTable(awarderReceived);
    const awarderGivenTable = buildGivenTable(awarderGiven);

    const recipientReceivedTable = buildReceivedTable(recipientReceived);
    const recipientGivenTable = buildGivenTable(recipientGiven);

    //
    // ──────────────────────────────────────────────────────────────
    // WRITE BOTH TABLES TO BOTH WIKI PAGES
    // ──────────────────────────────────────────────────────────────
    //

    async function writePage(
        user: string,
        receivedTable: string,
        givenTable: string
    ) {
        const content = `
# ${capPoint} History for u/${user}

## ${capPlural} Received
u/${user} has received ${
            receivedTable.includes("|")
                ? receivedTable.split("\n").length - 2
                : 0
        } ${plural}.

${receivedTable}

---

## ${capPlural} Given
u/${user} has given ${
            givenTable.includes("|") ? givenTable.split("\n").length - 2 : 0
        } ${plural}.

${givenTable}
        `.trim();

        await context.reddit.updateWikiPage({
            subredditName,
            page: `user/${user}`,
            content,
            reason: `Updated wiki history for ${user}`,
        });
    }

    await writePage(awarder, awarderReceivedTable, awarderGivenTable);
    await writePage(recipient, recipientReceivedTable, recipientGivenTable);

    logger.info("📄 User wiki updated for both awarder & recipient", {
        awarder,
        recipient,
    });
}

export async function buildInitialUserWiki(
    context: TriggerContext,
    username: string
) {
    logger.info("📄 Building initial user wiki page…", { username });

    const settings = await context.settings.getAll();
    const pointName = (settings[AppSetting.PointName] as string) ?? "point";

    try {
        logger.debug(`🧩 Loaded ${pointName} for initial wiki`, {
            username,
            pointName,
        });
    } catch (err) {
        logger.error("❌ Failed to load settings for initial wiki", {
            username,
            error: String(err),
        });
    }

    const plural = pluralize(pointName);
    const capPoint = capitalize(pointName);
    const capPlural = capitalize(plural);

    logger.debug("📝 Computed wiki title parts", {
        username,
        capPoint,
        capPlural,
        plural,
    });

    const page = `
# ${capPoint} History for u/${username}

---

## ${capPlural} Received
u/${username} has received 0 ${plural}

| Date | Submission | ${capPoint} Comment | Awarded To |

---

## ${capPlural} Given
u/${username} has given 0 ${plural}

| Date | Submission | ${capPoint} Comment | Awarded To |
`.trim();

    logger.info("✅ Initial user wiki page built", { username });

    return page;
}

export class SafeWikiClient {
    constructor(protected reddit: RedditAPIClient) {}

    /**
     * Safely gets or creates a wiki page.
     * Handles missing or uninitialized wiki pages without throwing.
     */
    public async getWikiPage(
        subredditName: string,
        wikiPath: string,
    ): Promise<WikiPage | undefined> {
        try {
            const wikiPage = await this.reddit.getWikiPage(
                subredditName,
                wikiPath,
            );

            // 🩹 Some RedditAPIClient versions return a partial wiki page
            // Fill missing fields to satisfy the WikiPage type
            const safeWikiPage: WikiPage = {
                ...wikiPage,
                contentHtml: "",
                revisionId: "",
                revisionDate: Date.now(),
                contentMd: "",
                mayRevise: true,
            };

            return safeWikiPage;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            if (
                errorMessage.includes("PAGE_NOT_CREATED") ||
                errorMessage.includes("404 Not Found")
            ) {
                // Page doesn't exist
                return;
            }

            if (errorMessage.includes("Wiki page author details are missing")) {
                // Page exists but has no revision history → seed with safe content
                await this.reddit.updateWikiPage({
                    subredditName,
                    page: wikiPath,
                    content: "---",
                    reason: "Devvit blank page fix",
                });
                // Try again
                return this.getWikiPage(subredditName, wikiPath);
            }

            console.error(
                "❌ Unexpected error while getting wiki page!",
                error,
            );
            throw error;
        }
    }

    /**
     * Creates a wiki page safely, avoiding empty-content issues.
     */
    public async createWikiPage(
        options: CreateWikiPageOptions,
    ): Promise<WikiPage | undefined> {
        try {
            const content = options.content?.trim() || "---";
            const created = await this.reddit.createWikiPage({
                ...options,
                content,
            });

            // Ensure full WikiPage structure
            const safeWikiPage: WikiPage = {
                ...created,
                contentHtml: "",
                revisionId: "",
                revisionDate: Date.now(),
                contentMd: "",
                mayRevise: true,
            };

            return safeWikiPage;
        } catch (error) {
            console.warn("⚠️ Error creating wiki page:", error);
            return;
        }
    }
}