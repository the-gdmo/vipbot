import { CommentSubmit, CommentUpdate } from "@devvit/protos";
import { formatMessage } from "../utils/formatting";
import { logger } from "../utils/logger";
import { TemplateDefaults } from "./settings";
import { TriggerContext, User } from "@devvit/public-api";

export async function executeInfoCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User,
    prefix: string
) {
    if (!event.subreddit || !event.comment) return;
    logger.info("ℹ️ Executing INFO command", {
        user: user.username,
    });

    const formattedDMInfoMessage = formatMessage(
        event,
        TemplateDefaults.DMInfoMessage,
        {
            username: user.username,
            subreddit: event.subreddit.name,
            prefix,
            permalink: event.comment.permalink,
        }
    );

    await context.reddit.sendPrivateMessage({
        to: user.username,
        subject: "VIP Bot Info",
        text: formattedDMInfoMessage,
    });

    logger.info("📨 Sent info message via DM", {
        user: user.username,
        subreddit: event.subreddit.name,
    });

    const formattedInfoMessageConfirmation = formatMessage(
        event,
        TemplateDefaults.InfoMessageConfirmation,
        {}
    );

    const formattedInfoMessage = await context.reddit.submitComment({
        id: event.comment.id,
        text: formattedInfoMessageConfirmation,
    });

    await formattedInfoMessage.distinguish();

    logger.info("💬 Posted info confirmation", {
        commentId: event.comment.id,
    });

    return;
}

/**
 *
 * @param event CommentSubmit | CommentUpdate from \@devvit/protos
 * @param user User from \@devvit/public-api
 * @param isMod Gets if the user is a moderator or not
 * @param prefix Symbol(s) directly preceding all commands
 * @param context TriggerContext from \@devvit/public-api
 */
export async function executeHelpCommand(
    event: CommentSubmit | CommentUpdate,
    user: User,
    isMod: boolean,
    prefix: string,
    context: TriggerContext
) {
    logger.info("❓ Executing HELP command", {
        user: user.username,
        isMod,
    });

    if (!event.comment) return;

    if (!isMod) {
        const formattedNormalDMHelpMessage = formatMessage(
            event,
            TemplateDefaults.NormalUserDMHelpMessage,
            { prefix }
        );

        await context.reddit.sendPrivateMessage({
            to: user.username,
            subject: "VIP Bot Help",
            text: formattedNormalDMHelpMessage,
        });

        logger.info("📨 Sent normal-user help DM", {
            user: user.username,
        });
        return;
    } else if (isMod) {
        const formattedModDMHelpMessage = formatMessage(
            event,
            TemplateDefaults.ModDMHelpMessage,
            { prefix }
        );

        await context.reddit.sendPrivateMessage({
            to: user.username,
            subject: "VIP Bot Help",
            text: formattedModDMHelpMessage,
        });

        logger.info("📨 Sent moderator help DM", {
            user: user.username,
        });
        return;
    }

    const helpMessageConfirmation = formatMessage(
        event,
        TemplateDefaults.HelpMessageConfirmation,
        {}
    );

    const publicHelpMessage = await context.reddit.submitComment({
        id: event.comment.id,
        text: helpMessageConfirmation,
    });

    await publicHelpMessage.distinguish();

    logger.info("💬 Posted help confirmation", {
        commentId: event.comment.id,
    });

    return;
}

/**
 * @param event CommentSubmit | CommentUpdate from \@devvit/protos
 * @param context TriggerContext from \@devvit/public-api
 * @param user User from \@devvit/public-api
 */
export async function executeProfileCommand(
    event: CommentSubmit | CommentUpdate,
    context: TriggerContext,
    user: User
) {
    logger.info("👤 Executing PROFILE command", {
        user: user.username,
    });

    if (!event.comment || !event.author) return;

/*

# u/ryry50583583's VIPBot Profile

## 🏆 Reputation

| Statistic | Value |
|---|---:|
| **VIP Points** | 1,247 |
| **Global Rank** | #12 |
| **Awards Received** | 1,247 |
| **Awards Given** | 386 |
| **Current Level** | 13 |
| **Next Level** | 1,300 XP |

---

## 📈 Progress

**Level 13**

**1,247 / 1,300**

53 VIP Points until Level 14.

---

## 🥇 Achievements

- 🏆 **Top 25 Global**
- ⭐ **1,000 VIP Points**
- 🎖️ **500 Awards Received**
- 💎 **Active Commenter**

---

## 📜 Recent Awards

| Date | Awarded By | Points |
|---|---|---:|
| Sep 2, 2026 | u/Bob | +1 |
| Sep 1, 2026 | u/Charlie | +1 |
| Aug 31, 2026 | u/David | +1 |
| Aug 30, 2026 | u/Eve | +1 |
| Aug 29, 2026 | u/Bob | +1 |

---

## 📊 Point History

| Period | Points |
|---|---:|
| Today | 12 |
| This Week | 47 |
| This Month | 183 |
| This Year | 1,247 |
| All Time | **1,247** |

---

*Profile maintained automatically by VIPBot.*
*Last updated: September 2, 2026*

*/
}
