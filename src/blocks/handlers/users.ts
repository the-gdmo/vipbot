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

export async function modDigestJob(
    event: ScheduledJobEvent<JSONObject | undefined>,
    context: JobContext
) {
    const subredditName = context.subredditName;

    logger.info("📨 Mod digest job started", {
        subreddit: subredditName ?? "unknown",
        eventData: event.data ?? null,
    });

    if (!subredditName) {
        logger.warn(
            "⚠️ Mod digest aborted because subredditName is unavailable"
        );
        return;
    }

    try {
        // ============================================================
        // LOAD SETTINGS
        // ============================================================

        logger.debug("⚙️ Loading mod digest settings", {
            subreddit: subredditName,
        });

        const settings = await context.settings.getAll();

        const newConversation =
            (settings[AppSetting.DigestNewMessageEachDay] as
                | boolean
                | undefined) ?? true;

        const asModNotification =
            (settings[AppSetting.DigestAsModNotification] as
                | boolean
                | undefined) ?? false;

        const configuredFrequency = settings[AppSetting.DigestFrequency] as
            | string[]
            | string
            | undefined;

        const frequencyValue = Array.isArray(configuredFrequency)
            ? configuredFrequency[0]
            : configuredFrequency;

        const frequency =
            frequencyValue?.toLowerCase() === "daily" ? "Daily" : "Weekly";

        logger.info("⚙️ Mod digest settings loaded", {
            subreddit: subredditName,
            frequency,
            rawFrequency: configuredFrequency,
            newConversation,
            asModNotification,
        });

        // ============================================================
        // DETERMINE WHETHER DIGEST IS DUE
        // ============================================================

        const now = Date.now();

        const intervalMs =
            frequency === "Daily"
                ? 24 * 60 * 60 * 1000
                : 7 * 24 * 60 * 60 * 1000;

        const redisPrefix = "vipbot:modDigest";

        const lastSentKey = `${redisPrefix}:lastSentAt`;
        const conversationKey = `${redisPrefix}:conversationId`;
        const conversationTypeKey = `${redisPrefix}:conversationType`;

        logger.debug("🕒 Checking digest timing", {
            subreddit: subredditName,
            frequency,
            intervalMs,
            lastSentKey,
        });

        const lastSentRaw = await context.redis.get(lastSentKey);
        const parsedLastSent = lastSentRaw ? Number(lastSentRaw) : undefined;

        const lastSentAt =
            parsedLastSent !== undefined && Number.isFinite(parsedLastSent)
                ? parsedLastSent
                : undefined;

        if (lastSentRaw && lastSentAt === undefined) {
            logger.warn("⚠️ Invalid stored digest last-sent timestamp", {
                subreddit: subredditName,
                lastSentRaw,
            });
        }

        if (lastSentAt !== undefined && now - lastSentAt < intervalMs) {
            logger.info("⏭️ Mod digest is not due yet", {
                subreddit: subredditName,
                frequency,
                lastSentAt,
                lastSentAtISO: new Date(lastSentAt).toISOString(),
                nextEligibleAt: lastSentAt + intervalMs,
                nextEligibleAtISO: new Date(
                    lastSentAt + intervalMs
                ).toISOString(),
                elapsedMs: now - lastSentAt,
                requiredIntervalMs: intervalMs,
            });

            return;
        }

        const periodStart =
            lastSentAt !== undefined && lastSentAt < now
                ? lastSentAt
                : now - intervalMs;

        logger.info("✅ Mod digest is due", {
            subreddit: subredditName,
            frequency,
            periodStart,
            periodStartISO: new Date(periodStart).toISOString(),
            periodEnd: now,
            periodEndISO: new Date(now).toISOString(),
        });

        // ============================================================
        // LOAD AUDIT LOG
        // ============================================================

        type AuditEntry = {
            timestamp?: string;
            action?: string;
            actor?: string;
            target?: string;
            details?: Record<string, unknown>;
        };

        logger.debug("📜 Loading VIPBot audit entries", {
            subreddit: subredditName,
            auditKey: "vipbot:audit:entries",
        });

        const rawAuditEntries = await context.redis.hGetAll(
            "vipbot:audit:entries"
        );

        const rawAuditCount = Object.keys(rawAuditEntries).length;

        logger.debug("📜 Raw audit entries loaded", {
            subreddit: subredditName,
            count: rawAuditCount,
        });

        const auditEntries: AuditEntry[] = [];

        let malformedAuditEntries = 0;
        let outsidePeriodEntries = 0;
        let missingTimestampEntries = 0;

        for (const [auditId, rawEntry] of Object.entries(rawAuditEntries)) {
            try {
                const parsed = JSON.parse(rawEntry) as AuditEntry;

                if (!parsed.timestamp) {
                    missingTimestampEntries++;

                    logger.debug("⏭️ Ignoring audit entry without timestamp", {
                        subreddit: subredditName,
                        auditId,
                        action: parsed.action,
                    });

                    continue;
                }

                const timestamp = new Date(parsed.timestamp).getTime();

                if (!Number.isFinite(timestamp)) {
                    malformedAuditEntries++;

                    logger.warn(
                        "⚠️ Ignoring audit entry with invalid timestamp",
                        {
                            subreddit: subredditName,
                            auditId,
                            timestamp: parsed.timestamp,
                        }
                    );

                    continue;
                }

                if (timestamp < periodStart || timestamp > now) {
                    outsidePeriodEntries++;
                    continue;
                }

                auditEntries.push(parsed);
            } catch (error) {
                malformedAuditEntries++;

                logger.warn("⚠️ Ignoring malformed VIPBot audit entry", {
                    subreddit: subredditName,
                    auditId,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        auditEntries.sort((a, b) => {
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;

            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;

            return bTime - aTime;
        });

        logger.info("📜 Audit entries processed for digest", {
            subreddit: subredditName,
            rawEntries: rawAuditCount,
            includedEntries: auditEntries.length,
            outsidePeriodEntries,
            malformedAuditEntries,
            missingTimestampEntries,
        });

        // ============================================================
        // COUNT AUDIT ACTIONS
        // ============================================================

        const actionCounts = new Map<string, number>();
        const actors = new Set<string>();
        const targets = new Set<string>();

        for (const entry of auditEntries) {
            if (entry.action) {
                actionCounts.set(
                    entry.action,
                    (actionCounts.get(entry.action) ?? 0) + 1
                );
            }

            if (entry.actor) {
                actors.add(entry.actor.toLowerCase());
            }

            if (entry.target) {
                targets.add(entry.target.toLowerCase());
            }
        }

        logger.debug("📊 Digest audit statistics calculated", {
            subreddit: subredditName,
            totalActions: auditEntries.length,
            uniqueActionTypes: actionCounts.size,
            uniqueActors: actors.size,
            uniqueTargets: targets.size,
            actionCounts: Object.fromEntries(actionCounts),
        });

        const formatActionName = (action: string): string =>
            action
                .replace(/_/g, " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase());

        const actionLines = [...actionCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(
                ([action, count]) =>
                    `- **${formatActionName(action)}:** ${count.toLocaleString(
                        "en-US"
                    )}`
            );

        // ============================================================
        // LOAD LEADERBOARDS AND VIP DATA
        // ============================================================

        logger.debug("📈 Loading leaderboard and VIP snapshots", {
            subreddit: subredditName,
        });

        const [
            xpLeaders,
            coinLeaders,
            reputationLeaders,
            streakLeaders,
            vipIndex,
        ] = await Promise.all([
            context.redis.zRange("vipbot:leaderboard:xp", 0, 4, {
                by: "rank",
                reverse: true,
            }),
            context.redis.zRange("vipbot:leaderboard:coins", 0, 4, {
                by: "rank",
                reverse: true,
            }),
            context.redis.zRange("vipbot:leaderboard:rep", 0, 4, {
                by: "rank",
                reverse: true,
            }),
            context.redis.zRange("vipbot:leaderboard:streak", 0, 4, {
                by: "rank",
                reverse: true,
            }),
            context.redis.hGetAll("vipbot:vips:expiry"),
        ]);

        logger.debug("📈 Leaderboard snapshots loaded", {
            subreddit: subredditName,
            xpLeaderCount: xpLeaders.length,
            coinLeaderCount: coinLeaders.length,
            reputationLeaderCount: reputationLeaders.length,
            streakLeaderCount: streakLeaders.length,
            indexedVIPCount: Object.keys(vipIndex).length,
        });

        // ============================================================
        // DETERMINE ACTIVE VIPS
        // ============================================================

        const activeVIPs = Object.entries(vipIndex)
            .filter(([rawExpiration]) => {
                if (/^(permanent|never|infinite)$/i.test(rawExpiration)) {
                    return true;
                }

                const expiration = Number(rawExpiration);

                return Number.isFinite(expiration) && expiration > now;
            })
            .map(([username]) => username)
            .sort((a, b) => a.localeCompare(b));

        logger.info("👑 Active VIP snapshot calculated", {
            subreddit: subredditName,
            activeVIPCount: activeVIPs.length,
            indexedVIPCount: Object.keys(vipIndex).length,
        });

        const formatLeaderboard = (
            entries: Array<{
                member: string;
                score: number;
            }>,
            suffix: string
        ): string => {
            if (!entries.length) {
                return "_No data yet._";
            }

            return entries
                .map(
                    (entry, index) =>
                        `${index + 1}. **u/${entry.member}** — ${Number(
                            entry.score
                        ).toLocaleString("en-US")} ${suffix}`
                )
                .join("\n");
        };

        // ============================================================
        // RECENT ACTIONS
        // ============================================================

        const recentActivityLines = auditEntries.slice(0, 10).map((entry) => {
            const action = entry.action
                ? formatActionName(entry.action)
                : "Unknown Action";

            const actor = entry.actor ? `u/${entry.actor}` : "VIPBot";

            const target = entry.target ? `u/${entry.target}` : undefined;

            const timestamp = entry.timestamp
                ? new Date(entry.timestamp).toUTCString()
                : "Unknown time";

            return target
                ? `- **${action}** — ${actor} → ${target} — ${timestamp}`
                : `- **${action}** — ${actor} — ${timestamp}`;
        });

        // ============================================================
        // BUILD DIGEST
        // ============================================================

        logger.debug("📝 Building mod digest message", {
            subreddit: subredditName,
            frequency,
        });

        const periodStartText = new Date(periodStart).toUTCString();

        const periodEndText = new Date(now).toUTCString();

        const subject = `VIPBot ${frequency} Summary — ` + `r/${subredditName}`;

        let body = `# 👑 VIPBot ${frequency} Summary\n\n`;

        body += `**Subreddit:** r/${subredditName}\n\n`;

        body += `**Period:** ${periodStartText} → ${periodEndText}\n\n`;

        body += `---\n\n`;

        body += `## 📊 Activity Summary\n\n`;

        body += `**Audited actions:** ${auditEntries.length.toLocaleString(
            "en-US"
        )}\n\n`;

        body += `**Unique actors:** ${actors.size.toLocaleString("en-US")}\n\n`;

        body += `**Users affected:** ${targets.size.toLocaleString(
            "en-US"
        )}\n\n`;

        if (actionLines.length) {
            body += `${actionLines.join("\n")}\n\n`;
        } else {
            body += `_No audited VIPBot actions were recorded during this period._\n\n`;
        }

        body += `---\n\n`;

        body += `## 👑 VIP Status\n\n`;

        body += `**Active VIPs:** ${activeVIPs.length.toLocaleString(
            "en-US"
        )}\n\n`;

        if (activeVIPs.length) {
            body += `${activeVIPs
                .slice(0, 25)
                .map((username) => `- u/${username}`)
                .join("\n")}\n\n`;

            if (activeVIPs.length > 25) {
                body += `_...and ${activeVIPs.length - 25} more._\n\n`;
            }
        } else {
            body += `_There are currently no active VIPs._\n\n`;
        }

        body += `---\n\n`;

        body += `## 📈 Top XP\n\n`;
        body += `${formatLeaderboard(xpLeaders, "XP")}\n\n`;

        body += `## 🪙 Top Coin Balances\n\n`;
        body += `${formatLeaderboard(coinLeaders, "coins")}\n\n`;

        body += `## ⭐ Top Reputation\n\n`;
        body += `${formatLeaderboard(reputationLeaders, "reputation")}\n\n`;

        body += `## 🔥 Top Streaks\n\n`;
        body += `${formatLeaderboard(streakLeaders, "days")}\n\n`;

        body += `---\n\n`;

        body += `## 📜 Recent VIPBot Actions\n\n`;

        if (recentActivityLines.length) {
            body += recentActivityLines.join("\n");
        } else {
            body += `_No recent audited actions._`;
        }

        body += `\n\n---\n\n`;
        body += `*Generated automatically by VIPBot.*`;

        logger.info("📝 Mod digest message built", {
            subreddit: subredditName,
            subject,
            bodyLength: body.length,
            auditEntryCount: auditEntries.length,
            activeVIPCount: activeVIPs.length,
        });

        // ============================================================
        // DETERMINE MODMAIL DESTINATION
        // ============================================================

        const desiredConversationType = asModNotification
            ? "notification"
            : "inbox";

        const [previousConversationId, previousConversationType] =
            await Promise.all([
                context.redis.get(conversationKey),
                context.redis.get(conversationTypeKey),
            ]);

        logger.debug("📬 Determining digest Modmail delivery method", {
            subreddit: subredditName,
            newConversation,
            asModNotification,
            desiredConversationType,
            previousConversationId: previousConversationId ?? null,
            previousConversationType: previousConversationType ?? null,
        });

        let conversationId: string | undefined;

        const modMail = context.reddit.modMail as any;

        // ============================================================
        // REPLY TO PREVIOUS CONVERSATION
        // ============================================================

        if (
            !newConversation &&
            previousConversationId &&
            previousConversationType === desiredConversationType
        ) {
            logger.info(
                "↩️ Attempting to reply to previous digest conversation",
                {
                    subreddit: subredditName,
                    conversationId: previousConversationId,
                    conversationType: previousConversationType,
                }
            );

            try {
                await modMail.reply({
                    conversationId: previousConversationId,
                    body,
                });

                conversationId = previousConversationId;

                logger.info("✅ Replied to previous digest conversation", {
                    subreddit: subredditName,
                    conversationId,
                });
            } catch (error) {
                logger.warn(
                    "⚠️ Could not reply to previous digest conversation; a new conversation will be created",
                    {
                        subreddit: subredditName,
                        conversationId: previousConversationId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    }
                );
            }
        } else {
            logger.debug("🆕 Previous digest conversation will not be reused", {
                subreddit: subredditName,
                reason: newConversation
                    ? "Setting requires a new conversation"
                    : !previousConversationId
                    ? "No previous conversation ID exists"
                    : previousConversationType !== desiredConversationType
                    ? "Conversation destination type changed"
                    : "Unknown",
            });
        }

        // ============================================================
        // CREATE NEW CONVERSATION
        // ============================================================

        if (!conversationId) {
            logger.info("📨 Creating new digest Modmail conversation", {
                subreddit: subredditName,
                destination: desiredConversationType,
                subject,
            });

            if (
                asModNotification &&
                typeof modMail.createModNotification === "function"
            ) {
                logger.debug("🔔 Using createModNotification()", {
                    subreddit: subredditName,
                });

                const response = await modMail.createModNotification({
                    subredditId: context.subredditId,
                    subject,
                    bodyMarkdown: body,
                });

                conversationId =
                    typeof response === "string"
                        ? response
                        : response?.conversation?.id ??
                          response?.conversationId ??
                          response?.id;
            } else if (
                !asModNotification &&
                typeof modMail.createModInboxConversation === "function"
            ) {
                logger.debug("📥 Using createModInboxConversation()", {
                    subreddit: subredditName,
                });

                const response = await modMail.createModInboxConversation({
                    subredditId: context.subredditId,
                    subject,
                    bodyMarkdown: body,
                });

                conversationId =
                    typeof response === "string"
                        ? response
                        : response?.conversation?.id ??
                          response?.conversationId ??
                          response?.id;
            } else {
                logger.warn(
                    "⚠️ Preferred Modmail creation method unavailable; using createConversation() fallback",
                    {
                        subreddit: subredditName,
                        destination: desiredConversationType,
                        hasCreateModNotification:
                            typeof modMail.createModNotification === "function",
                        hasCreateModInboxConversation:
                            typeof modMail.createModInboxConversation ===
                            "function",
                    }
                );

                const fallbackSubject = asModNotification
                    ? `[notification] ${subject}`
                    : subject;

                const response = await modMail.createConversation({
                    subredditName,
                    subject: fallbackSubject,
                    body,
                    to: null,
                });

                conversationId =
                    response?.conversation?.id ??
                    response?.conversationId ??
                    response?.id;
            }

            logger.info("✅ New digest Modmail conversation created", {
                subreddit: subredditName,
                conversationId: conversationId ?? "unavailable",
                destination: desiredConversationType,
            });
        }

        // ============================================================
        // SAVE SUCCESS STATE
        // ============================================================

        logger.debug("💾 Saving mod digest delivery state", {
            subreddit: subredditName,
            sentAt: now,
            sentAtISO: new Date(now).toISOString(),
            conversationId: conversationId ?? null,
            conversationType: desiredConversationType,
        });

        await context.redis.set(lastSentKey, now.toString());

        if (conversationId) {
            await Promise.all([
                context.redis.set(conversationKey, conversationId),
                context.redis.set(conversationTypeKey, desiredConversationType),
            ]);
        } else {
            logger.warn(
                "⚠️ Digest was sent but no Modmail conversation ID was returned",
                {
                    subreddit: subredditName,
                    destination: desiredConversationType,
                }
            );
        }

        logger.info("✅ Mod digest job completed successfully", {
            subreddit: subredditName,
            frequency,
            destination: desiredConversationType,
            conversationId: conversationId ?? null,
            auditEntryCount: auditEntries.length,
            activeVIPCount: activeVIPs.length,
            periodStartISO: new Date(periodStart).toISOString(),
            periodEndISO: new Date(now).toISOString(),
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);

        const stack = error instanceof Error ? error.stack : undefined;

        /*
         * Passing context causes your logger.error() implementation to
         * send the failure to the subreddit's moderators as well.
         */
        await logger.error("❌ Mod digest job failed", {
            subreddit: subredditName,
            error: errorMessage,
            stack,
        });
    }
}
