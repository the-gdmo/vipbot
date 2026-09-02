# VIPBot

VIPBot is a community recognition, reputation, progression, and rewards app for Reddit communities.

The app allows you to reward active and helpful members of your subreddit with XP, VIP status, coins, reputation, achievements, streaks, and other community-recognition features.

VIPBot can automatically track community participation and maintain leaderboards, while moderators can manually manage VIP status, XP, coins, and reputation.

The app is highly configurable, so each subreddit can choose which features it wants to use.

---

# NOTE: Not all features may actually exist at time of upload.

## Features

### ⭐ XP & Levels

VIPBot tracks user participation using an XP system.

Users can earn XP from activities such as:

* Posting
* Commenting
* (Potentially in the future) Other configurable community activities

Users progress through multiple levels as they accumulate XP.

The default levels are:

| Level | Title                 |XP Required|
| ----: | ---------             |----------:|
|     1 | Newcomer              |         0 |
|     2 | Supporter             |       100 |
|     3 | Bronze                |       500 |
|     4 | Silver                |     1,500 |
|     5 | Gold                  |     5,000 |
|     6 | Diamond               |    15,000 |
|     7 | Elite                 |    50,000 |
|     8 | Platinum              |   100,000 |
|     9 | Champion              |   200,000 |
|    10 | Legend                |   300,000 |
|    11 | Mythic                |   500,000 |
|    12 | A League Of Their Own | 1,000,000 |

Level requirements and rewards can be expanded in [VIPBot's settings](https://developers.reddit.com/apps/vipbot2).

---

### 👑 VIP Status

VIPBot allows communities to recognize their most valuable members with **VIP status**.

VIP status can be granted:

* Automatically after reaching a configurable XP threshold
* Manually by a moderator
* Through community recognition and nominations

VIP status can optionally expire after a configurable period.

VIP members can receive special recognition such as:

* VIP flair
* VIP-only achievements
* VIP leaderboards
* Recognition in community dashboards
* Future VIP-only perks and rewards

VIP status can also be removed manually by moderators.

---

### 💰 VIP Coins

VIPBot includes a virtual coin system.

Users can earn coins through community participation and daily activity.

Coins can be used for community features such as:

* Gifting coins to other users
* Future shop items
* Future VIP perks
* Community rewards
* Other configurable features

Users can check their balance using:
`/balance`

Users can give coins to another member using:
`/gift u/username amount`

The maximum gift amount can be configured by subreddit moderators.

---

### ❤️ Reputation

VIPBot maintains a separate reputation score for each user.

Reputation is intended to represent community standing, rather than simply activity.

Reputation can be increased through features such as:

* VIP nominations
* Community recognition
* Moderator adjustments
* Future reputation-based events

Reputation has its own leaderboard separate from XP and coins.

---

### 🔥 Activity Streaks

VIPBot tracks consecutive days of community activity.

Users can build streaks by participating in the subreddit on consecutive days.

Examples include:

* 7-day streak
* 30-day streak
* 100-day streak
* 1-year streak
* 2-year streak
* 3-year streak
* etc.

Streak milestones can unlock achievements.

Users can check their current streak with:

`/streak`

---

### 🎖️ Achievements

VIPBot includes an achievement system that recognizes important milestones.

Achievements can be earned for activities such as:

* Making your first comment
* Making your first post
* Reaching XP milestones
* Reaching high levels
* Becoming a VIP
* Reaching Elite status
* Reaching Legendary status
* Building activity streaks
* Receiving community nominations
* Reaching nomination milestones
* etc.

Examples include:

* 💬 First Comment
* 📝 First Post
* 🌱 Getting Started
* ⭐ Rising Star
* 💎 Diamond Hands
* 👑 Legend
* 🔥 Week Warrior
* 💯 Unstoppable
* 🏆 Year Long
* 🤝 Community Favorite
* ❤️ Community Builder

Users can view their achievements using:

`/achievements`

---

### 🗳️ VIP Nominations

Communities can allow users to nominate other members for VIP recognition.

For example:
`/nominate u/example`

Nominations can increase the recipient's community reputation and contribute toward nomination achievements.
This allows VIP status to represent more than simply accumulating XP.
Future versions may expand this system to include:

* Moderator approval
* Voting
* Nomination periods
* Nomination leaderboards
* Automatic VIP promotions

---

### 🏆 Leaderboards

VIPBot maintains multiple leaderboards.

Supported leaderboards include:

* ⭐ XP
* 💰 Coins
* ❤️ Reputation
* 📈 Levels
* 🔥 Streaks
* Weekly XP
* Monthly XP

Users can view a leaderboard with:
`/leaderboard`

Specific leaderboards can also be requested:
`/leaderboard weeklyxp`
`/leaderboard monthlyxp`
`/leaderboard coins`
`/leaderboard rep`
`/leaderboard level`
`/leaderboard streak`


Leaderboards can be configured to display a specified number of users.

---

### 📊 User Rankings

VIPBot can determine a user's position on the community leaderboard.

For example:

> 👑 u/example is #7 with 12,450 XP — 💎 Diamond.

The ranking system is based on Redis sorted sets and supports descending rankings so that:

* #1 = highest score
* #2 = second highest score
* #3 = third highest score
* etc.

This allows VIPBot to determine a user's actual leaderboard placement rather than simply displaying their score.

---

### 🎁 User-to-User Rewards

VIPBot allows users to reward other community members.

Coin gifting allows you to do this.

Future versions may expand user rewards to include:

* XP
* Reputation
* Achievement-related rewards
* Temporary VIP status
* Community awards

---

### 🎨 VIP Flair

VIPBot can optionally assign flair to VIP users.

Flair can display information such as:

* VIP status
* User level
* XP
* VIP Point Symbol
* Other configurable information

For example:

`⭐ VIP` or `👑 VIP • Gold`

Flair functionality can be disabled if the subreddit does not want VIPBot to modify user flair.

---

### 🛡️ Moderator Controls

Moderators have access to administrative commands for managing the system.

Available moderator commands include:

`/vipadd u/username`: Grant VIP status to a user.

`/vipadd u/username 30`: Grant VIP status for a specified number of days.

`/vipremove u/username`: Remove VIP status.

`/addxp u/username amount`: Add or remove XP.

`/addcoins u/username amount`: Add or remove coins.

`/addrep u/username amount`: Add or remove reputation.

`/setlevel u/username level`: Set a user's level.

Moderator actions can also be recorded in the VIPBot audit system.

---

### 📝 Audit Logging

VIPBot can maintain an audit history of important actions.

Actions can include:

* VIP grants
* VIP removals
* Moderator XP changes
* Moderator coin changes
* Reputation changes
* Nominations
* User rewards

This provides moderators with a record of important changes made by the bot.

---

### ⏰ Automatic VIP Expiration

VIP status can optionally expire automatically.

When a VIP's expiration time is reached, VIPBot can:

1. Remove their VIP status
2. Remove their VIP leaderboard entry
3. Remove VIP flair if enabled
4. Preserve their historical XP, coins, reputation, and achievements

This allows communities to use temporary VIP memberships without requiring moderators to manually remove them.

---

### 📅 Daily Rewards

VIPBot can provide users with a configurable daily coin reward for participating.

A user can receive the reward once per UTC day.

This encourages members to return to the community regularly.

---

### 📈 Community Progression

VIPBot is designed around the idea that different types of participation should mean different things: XP represents progression, Coins represent an economy, Reputation represents community standing, VIP represents special recognition, Achievements represent milestones, Streaks represent consistency. This keeps the systems separate instead of reducing the entire community to a single score.

---

## Commands

The default command prefix is `/`.

The command prefix can be changed through the app settings.

### User Commands

| Command                   | Description                        |
| ------------------------- | ---------------------------------- |
| `/help`                   | Display available commands         |
| `/vip`                    | Display your VIPBot profile       |
| `/rank`                   | Display your XP rank               |
| `/rank u/username`        | Display another user's rank        |
| `/balance`                | Display your coin balance          |
| `/achievements`           | Display your achievements          |
| `/leaderboard`            | Display the XP leaderboard         |
| `/leaderboard xp`         | Display the XP leaderboard         |
| `/leaderboard coins`      | Display the coin leaderboard       |
| `/leaderboard rep`        | Display the reputation leaderboard |
| `/streak`                 | Display your activity streak       |
| `/vips`                   | Display current VIPs               |
| `/nominate u/username`    | Nominate another user              |
| `/gift u/username amount` | Give another user coins            |

### Moderator Commands

| Command                       | Description                        |
| ----------------------------- | ---------------------------------- |
| `/vipadd u/username`          | Grant VIP                          |
| `/vipadd u/username <days>`     | Grant VIP for a specified duration |
| `/vipremove u/username`       | Remove VIP                         |
| `/addxp u/username <amount>`    | Modify XP                          |
| `/addcoins u/username <amount>` | Modify coins                       |
| `/addrep u/username <amount>`   | Modify reputation                  |
| `/setlevel u/username <level>`  | Set a user's level                 |

---

## Supported Placeholders

VIPBot supports placeholders in configurable messages and templates.

Placeholders can use either single or double curly braces (ie `{username}` or `{{username}}`).

NOTE: All placeholders are case-insensitive.

### User Information

* `username`: The user's Reddit username without `u/`.
* `author`: The username of the author of a post or comment.
* `subreddit`: The subreddit name without `r/`.
* `level`: The user's current number level.
* `rank`: The name of the user's current level.
* `xp`: The user's current XP.
* `coins`: The user's current coin balance.
* `reputation`: The user's current reputation.
* `place`: The user's leaderboard position.
* `streak`: The user's current activity streak.
* `vip`: Whether the user currently has VIP status.

### VIP Information

* `vipStatus`: The user's current VIP status.
* `vipExpires`: The user's VIP expiration date.
* `vipDuration`: The duration of a VIP grant.
* `vipFlair`: The user's VIP flair.

### Award / Recognition Information

* `awardee`: The user receiving recognition.
* `awarder`: The user giving recognition.
* `total`: The recipient's total amount.
* `symbol`: The configured point/reward symbol.
* `name`: The configured point/reward name.

### Reddit Information

* `permalink`: Link to the relevant Reddit post or comment.
* `title`: The title of the relevant post.
* `markdownGuide`: Link to Reddit's Markdown Guide.

### Leaderboard Information

* `leaderboard`: Link to the subreddit leaderboard.
* `rank`: The user's current leaderboard placement.
* `place`: The user's placement when used in flair formatting.
* `awardeePage`: Link to the user's public profile/history page.
* `awarderPage`: Link to the awarder's public profile/history page.

### Command Information

* `command`: The command associated with an action.
* `commandsWithOr`: Lists configured commands separated with `or`.
* `commandsWithAnd`: Lists configured commands separated with `and`.
* `helpPage`: Link to the VIPBot help page.

---

## Data Stored

VIPBot stores information required to provide its features.

Depending on which features are enabled, this can include:

* User XP
* User levels
* Coin balances
* Reputation
* VIP status
* VIP expiration times
* Achievement progress
* Activity streaks
* Daily activity records
* Nomination information
* Leaderboard information
* VIP membership information
* Audit records
* Challenge and event information

Data is stored using Redis.

### Removing the App

If VIPBot is removed from a subreddit, stored data may be deleted.

User flair is not automatically restored when data is deleted.

If VIPBot is subsequently reinstalled, previously deleted data may not automatically be restored.

Moderators should therefore ensure they have any information they need before removing the app.

---

## Limitations

* VIPBot relies on Reddit and Devvit APIs, so functionality may be affected by API limitations or changes.
* Leaderboard rankings depend on the data currently stored by VIPBot.
* Removing the app can permanently remove stored application data.
* User flair may remain after the application is removed and may need to be manually restored.
* Automatic features only operate while the relevant VIPBot setting is enabled.
* The bot should not be considered a replacement for Reddit's native moderation tools.
* Communities should test configuration changes before deploying them to an actual subreddit.
* The bot will increment it's own score any time it comments if the ""

---

## Suggestions

I strongly recommend installing and testing VIPBot on a test subreddit before deploying it to an actual community.

This is especially important when testing:

* Automatic VIP promotion
* VIP expiration
* Flair settings
* XP rewards
* Coin rewards
* Reputation rewards
* Moderator commands
* Leaderboards
* Nominations
* Automated messages

Start with conservative reward values and increase them after verifying that the system behaves as expected.

---

## Future Features

VIPBot is designed so additional community features can be added without replacing the existing XP, economy, reputation, or VIP systems.

Potential future features include:

### 🛒 VIP Shop

Users can spend VIP Coins on configurable rewards.

Examples:

* Temporary VIP status
* Custom flair
* Special badges
* XP boosts
* Highlighted comments
* Community awards

### 🎯 Challenges

Communities could create temporary challenges such as:

> Earn 500 XP this week.

or:

> Make 10 helpful comments.

Challenges could provide:

* XP
* Coins
* Reputation
* Achievements
* VIP status

### 🏅 Contests

VIPBot will support community contests with:

* Contest entries
* Voting
* Winners
* Prizes
* Leaderboards
* Historical records

### 👑 Hall of Fame

A Hall of Fame will permanently recognize:

* Legendary users
* VIP champions
* Contest winners
* Top contributors
* Longest streaks
* Most nominated users
* Community milestones

### 🥇 Weekly & Monthly Champions

VIPBot will automatically recognize the:

* Top XP user
* Top reputation user
* Top coin earner
* Longest streak
* Most nominated user

for each week or month.

### 📊 Community Dashboard

A public dashboard will display:

* Current VIPs
* XP leaderboard
* Reputation leaderboard
* Coin leaderboard
* Recent achievements
* Weekly champions
* Monthly champions
* Hall of Fame members

---

## Acknowledgements

I have received help in the past from [**u/fsv**](https://reddit.com/u/fsv) and [**u/beach-brews**](https://reddit.com/u/beach-brews) with RepBot

[Code edited from my RepBot project](https://github.com/the-gdmo/TheRepBot).

VIPBot and RepBot were partially coded based on ideas and code developed for [ReputatorBot](https://github.com/fsvreddit/reputatorbot).

---

## About

VIPBot is an open-source Reddit application designed for use with Reddit's Devvit platform. The project provides communities with a flexible system for recognizing active, helpful, and trusted members.

VIPBot combines **XP, Levels, Coins, Reputation, Achievements, Streaks, and Leaderboards** into a single community-recognition system.

This app is open source and licensed under the BSD 3-Clause License. You can find the source code on GitHub [here](https://github.com/the-gdmo/vipbot).

---

## Version History
### 1.0.0
* Bring the bot into an up-and-running state
* List all placeholders in the README
* Update README to list all features that exist currently
* Import [RepBot](https://github.com/the-gdmo/TheRepBot) code
* Create VIPBot
* Upload app image