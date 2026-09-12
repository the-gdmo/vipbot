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

Level requirements and titles are configured through VIPBot's **XP Level Thresholds** setting (`AppSetting.LevelThresholds`). XP is the source of truth: a user's current level, level title, next level, and XP remaining to the next level are derived from those configured thresholds rather than stored as separate progression values.

Level requirements can be customized in [VIPBot's settings](https://developers.reddit.com/apps/vipbot2).

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
* Temporary VIP status through the VIP Store
* Future VIP perks
* Community rewards
* Other configurable features

Users can check their balance using:
`/balance`

Users can give coins to another member using:
`/givecoins u/username amount`

The maximum `givecoins` transfer amount can be configured by subreddit moderators.

### 👑 VIP Store

VIPBot includes a configurable VIP Store where users can spend VIP Coins on temporary VIP status.

Use:

`/store`

to view the currently configured store options and your coin balance. Purchase an option by its displayed number, for example:

`/store 4`

Store options are configured in the **VIP Store Settings** group with `AppSetting.VIPStoreOptions`. Each non-empty line uses:

`optionNumber|duration|coinCost`

For example:

`1|5|1D`

At least one valid option is required. Durations and costs must be positive whole numbers, and durations must be unique. The default store assumes coins are generally earned in one-coin increments and provides:

| Option | VIP Duration | Cost |
| ---: | --- | ---: |
| 1 | 1D | 5 coins |
| 2 | 3D | 12 coins |
| 3 | 5D | 18 coins |
| 4 | 1W | 24 coins |
| 5 | 2W | 45 coins |
| 6 | 3W | 65 coins |
| 7 | 1M | 90 coins |

Purchasing temporary VIP extends existing temporary VIP time. Users with permanent VIP cannot purchase additional VIP time. The store requires VIP status, VIP Coins, and the VIP Store to be enabled.

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

VIPBot includes an automatic achievement engine. When achievements are enabled, qualifying milestones are evaluated after normal activity and after supported VIPBot economy/community actions. Once unlocked, an achievement remains on the user's profile even if a current balance, streak, reputation value, or VIP status later decreases.

The built-in catalog currently contains **188 realistically attainable default achievements** with customizable milestones. It intentionally avoids moderator-only actions and leaderboard-place requirements so ordinary members can earn the catalog through participation and community interaction when the corresponding VIPBot features are enabled.

| Category | Milestones / achievements |
| --- | --- |
| 💬 Comments | 1, 10, 25, 50, 100, 250, 500, 1,000, 2,500, and 5,000 comments |
| 📝 Posts | 1, 5, 10, 25, 50, 100, 250, 500, and 1,000 posts |
| 🧭 Total activity | 10, 25, 50, 100, 250, 500, 1,000, 2,500, 5,000, and 10,000 activities |
| 🎬 Mixed activity | **Double Debut** — make both a post and a comment |
| 📈 XP | 100 through 1,000,000 XP, including **Getting Started**, **Rising Star**, **Diamond Hands**, **Elite Status**, **Legend**, **Mythic**, and **A League Of Their Own** |
| 🔥 Streaks | 2, 3, 7, 14, 30, 60, 90, 100, 180, 365, 500, 730, and 1,095 days |
| 🪙 Coin balance | 1, 5, 10, 25, 50, 100, 250, 500, 1,000, 2,500, 5,000, and 10,000 coins |
| ⭐ Reputation | 1, 3, 5, 10, 25, 50, 100, 250, 500, and 1,000 reputation |
| 💎 VIP points received | 1, 5, 10, 25, 50, 100, 250, 500, 1,000, and 2,500 |
| 🎁 VIP points given | 1, 5, 10, 25, 50, 100, 250, 500, 1,000, and 2,500 |
| 🤝 Nominations received | 1, 3, 5, 10, 25, 50, 100, and 250 |
| 🗳️ Nominations made | 1, 3, 5, 10, 25, 50, and 100 |
| 🛍️ VIP Store purchases | 1, 3, 5, 10, 25, and 50 purchases |
| 👑 VIP days purchased | 1, 7, 30, 90, 180, 365, and 730 total days |
| 💸 VIP Store spending | 5, 25, 100, 250, 500, 1,000, and 2,500 coins spent |
| 👑 VIP status | **VIP Club** — obtain active VIP status |
| 📤 Coins sent | 1, 5, 10, 25, 50, and 100 successful transfers |
| 📥 Coins received | 1, 5, 10, 25, 50, and 100 successful transfers |
| 💸 Coins transferred out | 1, 10, 50, 100, 250, 500, 1,000, 2,500, and 5,000 total |
| 🏦 Coins transferred in | 1, 10, 50, 100, 250, 500, 1,000, 2,500, and 5,000 total |
| 🪙 Coin reply awards | 1, 5, 10, 25, 50, 100, 250, and 500 both **given** and **received** |
| 🌟 Combined challenges | **Well Rounded**, **Community Regular**, **Community Pillar**, **VIPBot Veteran**, **Generous Spirit**, **Community Builder**, **Store Regular**, **Full Circle**, **Community Economist**, and **All-Around VIP** |

Representative named achievements include:

* 💬 First Comment
* 📝 First Post
* 🎬 Double Debut
* 🌱 Getting Started
* ⭐ Rising Star
* 💎 Diamond Hands
* 🚀 Elite Status
* 👑 Legend
* ✨ A League Of Their Own
* 🔥 Week Warrior
* 💯 Unstoppable
* 🏆 Year Long
* 🪙 First Coin
* ⭐ Trusted Voice
* 💎 First VIP Point
* 🎁 First VIP Point Given
* 🤝 Community Favorite
* 🗳️ First Nomination Made
* 🛍️ First VIP Store Purchase
* 👑 VIP Club
* 📤 First Coin Transfer Sent
* 📥 First Coin Transfer Received
* 🪙 First Coin Reply Award Given
* 🎉 First Coin Reply Award Received
* 🌈 Well Rounded
* 🏘️ Community Regular
* 🏛️ Community Pillar
* 🧓 VIPBot Veteran
* 💝 Generous Spirit
* ❤️ Community Builder
* 🛒 Store Regular
* 🔄 Full Circle
* 📊 Community Economist
* 🌟 All-Around VIP

The **Achievements** settings group uses the same 22 categories shown above. It contains the master `AchievementsEnabled` toggle plus these category settings:

`AppSetting.Comment`, `AppSetting.Post`, `AppSetting.TotalActivity`, `AppSetting.MixedActivity`, `AppSetting.XP`, `AppSetting.Streak`, `AppSetting.CoinBalance`, `AppSetting.Reputation`, `AppSetting.VIPPointsReceived`, `AppSetting.VIPPointsGiven`, `AppSetting.NominationsReceived`, `AppSetting.NominationsMade`, `AppSetting.VIPStorePurchases`, `AppSetting.VIPDaysPurchased`, `AppSetting.VIPStoreSpending`, `AppSetting.VIPStatus`, `AppSetting.CoinsSent`, `AppSetting.CoinsReceived`, `AppSetting.CoinsTransferredOut`, `AppSetting.CoinsTransferredIn`, `AppSetting.CoinReplyAwards`, and `AppSetting.CombinedChallenges`.

Each category setting is a multiline field. **Every achievement must be on its own new line** using:

`category|name|description|requirements`

For example, the Streak setting contains lines such as:

`Streaks|🔥 Week Warrior|Reach a 7-day activity streak.|longestStreak>=7`

and the Comments setting contains lines such as:

`Comments|💬 10 Comments|Make 10 counted comments.|comments>=10`

The settings validator enforces the correct statistic for each category. For example, `AppSetting.Streak` accepts streak requirements based on `longestStreak`, `AppSetting.XP` accepts `xp`, `AppSetting.CoinBalance` accepts `coins`, and `AppSetting.VIPStatus` accepts `hasVIP`. `AppSetting.CombinedChallenges` is intentionally allowed to combine multiple statistics. `AppSetting.CoinReplyAwards` supports both `coinReplyAwardsGiven` and `coinReplyAwardsReceived`.

Each built-in default line comes from a named `TemplateDefaults` member whose name matches the achievement itself, such as `TemplateDefaults.FirstComment`, `TemplateDefaults.WeekWarrior`, `TemplateDefaults.CommunityFavorite`, and `TemplateDefaults.AllAroundVIP`. The default catalog still contains **188 achievements**, but moderators edit them by category instead of managing 188 separate settings fields.

## Complete Default Achievement Catalog

The complete built-in achievement catalog is included directly below. These are the same defaults used by the 22 category settings described above.

## 💬 Comments

- **💬 First Comment** — Make your first counted comment.  
  Requirement: `comments>=1`
- **💬 10 Comments** — Make 10 counted comments.  
  Requirement: `comments>=10`
- **💬 25 Comments** — Make 25 counted comments.  
  Requirement: `comments>=25`
- **💬 50 Comments** — Make 50 counted comments.  
  Requirement: `comments>=50`
- **💬 100 Comments** — Make 100 counted comments.  
  Requirement: `comments>=100`
- **💬 250 Comments** — Make 250 counted comments.  
  Requirement: `comments>=250`
- **💬 500 Comments** — Make 500 counted comments.  
  Requirement: `comments>=500`
- **💬 1,000 Comments** — Make 1,000 counted comments.  
  Requirement: `comments>=1000`
- **💬 2,500 Comments** — Make 2,500 counted comments.  
  Requirement: `comments>=2500`
- **💬 5,000 Comments** — Make 5,000 counted comments.  
  Requirement: `comments>=5000`

## 📝 Posts

- **📝 First Post** — Make your first counted post.  
  Requirement: `posts>=1`
- **📝 5 Posts** — Make 5 counted posts.  
  Requirement: `posts>=5`
- **📝 10 Posts** — Make 10 counted posts.  
  Requirement: `posts>=10`
- **📝 25 Posts** — Make 25 counted posts.  
  Requirement: `posts>=25`
- **📝 50 Posts** — Make 50 counted posts.  
  Requirement: `posts>=50`
- **📝 100 Posts** — Make 100 counted posts.  
  Requirement: `posts>=100`
- **📝 250 Posts** — Make 250 counted posts.  
  Requirement: `posts>=250`
- **📝 500 Posts** — Make 500 counted posts.  
  Requirement: `posts>=500`
- **📝 1,000 Posts** — Make 1,000 counted posts.  
  Requirement: `posts>=1000`

## 🧭 Total Activity

- **🧭 10 Activities** — Make 10 counted posts and comments combined.  
  Requirement: `activities>=10`
- **🧭 25 Activities** — Make 25 counted posts and comments combined.  
  Requirement: `activities>=25`
- **🧭 50 Activities** — Make 50 counted posts and comments combined.  
  Requirement: `activities>=50`
- **🧭 100 Activities** — Make 100 counted posts and comments combined.  
  Requirement: `activities>=100`
- **🧭 250 Activities** — Make 250 counted posts and comments combined.  
  Requirement: `activities>=250`
- **🧭 500 Activities** — Make 500 counted posts and comments combined.  
  Requirement: `activities>=500`
- **🧭 1,000 Activities** — Make 1,000 counted posts and comments combined.  
  Requirement: `activities>=1000`
- **🧭 2,500 Activities** — Make 2,500 counted posts and comments combined.  
  Requirement: `activities>=2500`
- **🧭 5,000 Activities** — Make 5,000 counted posts and comments combined.  
  Requirement: `activities>=5000`
- **🧭 10,000 Activities** — Make 10,000 counted posts and comments combined.  
  Requirement: `activities>=10000`

## 🎬 Mixed Activity

- **🎬 Double Debut** — Make at least one counted post and one counted comment.  
  Requirement: `posts>=1,comments>=1`

## 📈 XP

- **🌱 Getting Started** — Reach 100 XP.  
  Requirement: `xp>=100`
- **⭐ Rising Star** — Reach 500 XP.  
  Requirement: `xp>=500`
- **🥈 Silver Momentum** — Reach 1,500 XP.  
  Requirement: `xp>=1500`
- **🥇 Gold Standard** — Reach 5,000 XP.  
  Requirement: `xp>=5000`
- **💎 Diamond Hands** — Reach 15,000 XP.  
  Requirement: `xp>=15000`
- **🚀 Elite Status** — Reach 50,000 XP.  
  Requirement: `xp>=50000`
- **🏅 Platinum Pace** — Reach 100,000 XP.  
  Requirement: `xp>=100000`
- **🏆 Champion** — Reach 200,000 XP.  
  Requirement: `xp>=200000`
- **👑 Legend** — Reach 300,000 XP.  
  Requirement: `xp>=300000`
- **🌌 Mythic** — Reach 500,000 XP.  
  Requirement: `xp>=500000`
- **✨ A League Of Their Own** — Reach 1,000,000 XP.  
  Requirement: `xp>=1000000`

## 🔥 Streaks

- **🔥 Two-Day Spark** — Reach a 2-day activity streak.  
  Requirement: `longestStreak>=2`
- **🔥 Three-Day Flame** — Reach a 3-day activity streak.  
  Requirement: `longestStreak>=3`
- **🔥 Week Warrior** — Reach a 7-day activity streak.  
  Requirement: `longestStreak>=7`
- **🔥 Two-Week Trek** — Reach a 14-day activity streak.  
  Requirement: `longestStreak>=14`
- **🔥 Month Strong** — Reach a 30-day activity streak.  
  Requirement: `longestStreak>=30`
- **🔥 Sixty Straight** — Reach a 60-day activity streak.  
  Requirement: `longestStreak>=60`
- **🔥 Quarter-Year Consistency** — Reach a 90-day activity streak.  
  Requirement: `longestStreak>=90`
- **💯 Unstoppable** — Reach a 100-day activity streak.  
  Requirement: `longestStreak>=100`
- **🔥 Half-Year Habit** — Reach a 180-day activity streak.  
  Requirement: `longestStreak>=180`
- **🏆 Year Long** — Reach a 365-day activity streak.  
  Requirement: `longestStreak>=365`
- **🔥 500-Day Fire** — Reach a 500-day activity streak.  
  Requirement: `longestStreak>=500`
- **🏆 Two Years Strong** — Reach a 730-day activity streak.  
  Requirement: `longestStreak>=730`
- **🏆 Three Years Strong** — Reach a 1,095-day activity streak.  
  Requirement: `longestStreak>=1095`

## 🪙 Coin Balance

- **🪙 First Coin** — Hold at least 1 VIP Coin.  
  Requirement: `coins>=1`
- **🪙 5 Coins** — Hold at least 5 VIP Coins.  
  Requirement: `coins>=5`
- **🪙 10 Coins** — Hold at least 10 VIP Coins.  
  Requirement: `coins>=10`
- **🪙 25 Coins** — Hold at least 25 VIP Coins.  
  Requirement: `coins>=25`
- **🪙 50 Coins** — Hold at least 50 VIP Coins.  
  Requirement: `coins>=50`
- **🪙 100 Coins** — Hold at least 100 VIP Coins.  
  Requirement: `coins>=100`
- **🪙 250 Coins** — Hold at least 250 VIP Coins.  
  Requirement: `coins>=250`
- **🪙 500 Coins** — Hold at least 500 VIP Coins.  
  Requirement: `coins>=500`
- **💰 1,000 Coins** — Hold at least 1,000 VIP Coins.  
  Requirement: `coins>=1000`
- **💰 2,500 Coins** — Hold at least 2,500 VIP Coins.  
  Requirement: `coins>=2500`
- **💰 5,000 Coins** — Hold at least 5,000 VIP Coins.  
  Requirement: `coins>=5000`
- **🏦 10,000 Coins** — Hold at least 10,000 VIP Coins.  
  Requirement: `coins>=10000`

## ⭐ Reputation

- **⭐ Known Around Here** — Reach 1 reputation.  
  Requirement: `reputation>=1`
- **⭐ Recognized** — Reach 3 reputation.  
  Requirement: `reputation>=3`
- **⭐ Well Regarded** — Reach 5 reputation.  
  Requirement: `reputation>=5`
- **⭐ Trusted Voice** — Reach 10 reputation.  
  Requirement: `reputation>=10`
- **⭐ Community Standout** — Reach 25 reputation.  
  Requirement: `reputation>=25`
- **🌟 Highly Regarded** — Reach 50 reputation.  
  Requirement: `reputation>=50`
- **🌟 Community Mainstay** — Reach 100 reputation.  
  Requirement: `reputation>=100`
- **🌟 Esteemed Member** — Reach 250 reputation.  
  Requirement: `reputation>=250`
- **🌟 Community Icon** — Reach 500 reputation.  
  Requirement: `reputation>=500`
- **🌠 Reputation Legend** — Reach 1,000 reputation.  
  Requirement: `reputation>=1000`

## 💎 VIP Points Received

- **💎 First VIP Point** — Receive your first VIP point.  
  Requirement: `vipPointsReceived>=1`
- **💎 5 VIP Points Received** — Receive 5 VIP points.  
  Requirement: `vipPointsReceived>=5`
- **💎 10 VIP Points Received** — Receive 10 VIP points.  
  Requirement: `vipPointsReceived>=10`
- **💎 25 VIP Points Received** — Receive 25 VIP points.  
  Requirement: `vipPointsReceived>=25`
- **💎 50 VIP Points Received** — Receive 50 VIP points.  
  Requirement: `vipPointsReceived>=50`
- **💎 100 VIP Points Received** — Receive 100 VIP points.  
  Requirement: `vipPointsReceived>=100`
- **💎 250 VIP Points Received** — Receive 250 VIP points.  
  Requirement: `vipPointsReceived>=250`
- **💎 500 VIP Points Received** — Receive 500 VIP points.  
  Requirement: `vipPointsReceived>=500`
- **💎 1,000 VIP Points Received** — Receive 1,000 VIP points.  
  Requirement: `vipPointsReceived>=1000`
- **💎 2,500 VIP Points Received** — Receive 2,500 VIP points.  
  Requirement: `vipPointsReceived>=2500`

## 🎁 VIP Points Given

- **🎁 First VIP Point Given** — Give your first VIP point.  
  Requirement: `vipPointsGiven>=1`
- **🎁 5 VIP Points Given** — Give 5 VIP points.  
  Requirement: `vipPointsGiven>=5`
- **🎁 10 VIP Points Given** — Give 10 VIP points.  
  Requirement: `vipPointsGiven>=10`
- **🎁 25 VIP Points Given** — Give 25 VIP points.  
  Requirement: `vipPointsGiven>=25`
- **🎁 50 VIP Points Given** — Give 50 VIP points.  
  Requirement: `vipPointsGiven>=50`
- **🎁 100 VIP Points Given** — Give 100 VIP points.  
  Requirement: `vipPointsGiven>=100`
- **🎁 250 VIP Points Given** — Give 250 VIP points.  
  Requirement: `vipPointsGiven>=250`
- **🎁 500 VIP Points Given** — Give 500 VIP points.  
  Requirement: `vipPointsGiven>=500`
- **🎁 1,000 VIP Points Given** — Give 1,000 VIP points.  
  Requirement: `vipPointsGiven>=1000`
- **🎁 2,500 VIP Points Given** — Give 2,500 VIP points.  
  Requirement: `vipPointsGiven>=2500`

## 🤝 Nominations Received

- **🤝 Community Favorite** — Receive your first VIP nomination.  
  Requirement: `nominationsReceived>=1`
- **🤝 3 Nominations Received** — Receive 3 VIP nominations over time.  
  Requirement: `nominationsReceived>=3`
- **🤝 5 Nominations Received** — Receive 5 VIP nominations over time.  
  Requirement: `nominationsReceived>=5`
- **🤝 10 Nominations Received** — Receive 10 VIP nominations over time.  
  Requirement: `nominationsReceived>=10`
- **🤝 25 Nominations Received** — Receive 25 VIP nominations over time.  
  Requirement: `nominationsReceived>=25`
- **🤝 50 Nominations Received** — Receive 50 VIP nominations over time.  
  Requirement: `nominationsReceived>=50`
- **🤝 100 Nominations Received** — Receive 100 VIP nominations over time.  
  Requirement: `nominationsReceived>=100`
- **🤝 250 Nominations Received** — Receive 250 VIP nominations over time.  
  Requirement: `nominationsReceived>=250`

## 🗳️ Nominations Made

- **🗳️ First Nomination Made** — Make your first VIP nomination.  
  Requirement: `nominationsGiven>=1`
- **🗳️ 3 Nominations Made** — Make 3 VIP nominations over time.  
  Requirement: `nominationsGiven>=3`
- **🗳️ 5 Nominations Made** — Make 5 VIP nominations over time.  
  Requirement: `nominationsGiven>=5`
- **🗳️ 10 Nominations Made** — Make 10 VIP nominations over time.  
  Requirement: `nominationsGiven>=10`
- **🗳️ 25 Nominations Made** — Make 25 VIP nominations over time.  
  Requirement: `nominationsGiven>=25`
- **🗳️ 50 Nominations Made** — Make 50 VIP nominations over time.  
  Requirement: `nominationsGiven>=50`
- **🗳️ 100 Nominations Made** — Make 100 VIP nominations over time.  
  Requirement: `nominationsGiven>=100`

## 🛍️ VIP Store Purchases

- **🛍️ First VIP Store Purchase** — Complete your first VIP Store purchase.  
  Requirement: `storePurchases>=1`
- **🛍️ 3 VIP Store Purchases** — Complete 3 VIP Store purchases.  
  Requirement: `storePurchases>=3`
- **🛍️ 5 VIP Store Purchases** — Complete 5 VIP Store purchases.  
  Requirement: `storePurchases>=5`
- **🛍️ 10 VIP Store Purchases** — Complete 10 VIP Store purchases.  
  Requirement: `storePurchases>=10`
- **🛍️ 25 VIP Store Purchases** — Complete 25 VIP Store purchases.  
  Requirement: `storePurchases>=25`
- **🛍️ 50 VIP Store Purchases** — Complete 50 VIP Store purchases.  
  Requirement: `storePurchases>=50`

## 👑 VIP Days Purchased

- **👑 First VIP Day Purchased** — Purchase at least 1 total day of VIP status.  
  Requirement: `vipDaysPurchased>=1`
- **👑 7 VIP Days Purchased** — Purchase at least 7 total days of VIP status.  
  Requirement: `vipDaysPurchased>=7`
- **👑 30 VIP Days Purchased** — Purchase at least 30 total days of VIP status.  
  Requirement: `vipDaysPurchased>=30`
- **👑 90 VIP Days Purchased** — Purchase at least 90 total days of VIP status.  
  Requirement: `vipDaysPurchased>=90`
- **👑 180 VIP Days Purchased** — Purchase at least 180 total days of VIP status.  
  Requirement: `vipDaysPurchased>=180`
- **👑 365 VIP Days Purchased** — Purchase at least 365 total days of VIP status.  
  Requirement: `vipDaysPurchased>=365`
- **👑 730 VIP Days Purchased** — Purchase at least 730 total days of VIP status.  
  Requirement: `vipDaysPurchased>=730`

## 💸 VIP Store Spending

- **💸 5 Store Coins Spent** — Spend at least 5 total coins in the VIP Store.  
  Requirement: `storeCoinsSpent>=5`
- **💸 25 Store Coins Spent** — Spend at least 25 total coins in the VIP Store.  
  Requirement: `storeCoinsSpent>=25`
- **💸 100 Store Coins Spent** — Spend at least 100 total coins in the VIP Store.  
  Requirement: `storeCoinsSpent>=100`
- **💸 250 Store Coins Spent** — Spend at least 250 total coins in the VIP Store.  
  Requirement: `storeCoinsSpent>=250`
- **💸 500 Store Coins Spent** — Spend at least 500 total coins in the VIP Store.  
  Requirement: `storeCoinsSpent>=500`
- **💸 1,000 Store Coins Spent** — Spend at least 1,000 total coins in the VIP Store.  
  Requirement: `storeCoinsSpent>=1000`
- **💸 2,500 Store Coins Spent** — Spend at least 2,500 total coins in the VIP Store.  
  Requirement: `storeCoinsSpent>=2500`

## 👑 VIP Status

- **👑 VIP Club** — Have active VIP status at least once while achievements are enabled.  
  Requirement: `hasVIP=true`

## 📤 Coins Sent

- **📤 First Coin Transfer Sent** — Complete your first /givecoins transfer.  
  Requirement: `coinTransfersSent>=1`
- **📤 5 Coin Transfers Sent** — Complete 5 /givecoins transfers.  
  Requirement: `coinTransfersSent>=5`
- **📤 10 Coin Transfers Sent** — Complete 10 /givecoins transfers.  
  Requirement: `coinTransfersSent>=10`
- **📤 25 Coin Transfers Sent** — Complete 25 /givecoins transfers.  
  Requirement: `coinTransfersSent>=25`
- **📤 50 Coin Transfers Sent** — Complete 50 /givecoins transfers.  
  Requirement: `coinTransfersSent>=50`
- **📤 100 Coin Transfers Sent** — Complete 100 /givecoins transfers.  
  Requirement: `coinTransfersSent>=100`

## 📥 Coins Received

- **📥 First Coin Transfer Received** — Receive your first /givecoins transfer.  
  Requirement: `coinTransfersReceived>=1`
- **📥 5 Coin Transfers Received** — Receive 5 /givecoins transfers.  
  Requirement: `coinTransfersReceived>=5`
- **📥 10 Coin Transfers Received** — Receive 10 /givecoins transfers.  
  Requirement: `coinTransfersReceived>=10`
- **📥 25 Coin Transfers Received** — Receive 25 /givecoins transfers.  
  Requirement: `coinTransfersReceived>=25`
- **📥 50 Coin Transfers Received** — Receive 50 /givecoins transfers.  
  Requirement: `coinTransfersReceived>=50`
- **📥 100 Coin Transfers Received** — Receive 100 /givecoins transfers.  
  Requirement: `coinTransfersReceived>=100`

## 💸 Coins Transferred Out

- **💸 First Coin Sent** — Send at least 1 total coin with /givecoins.  
  Requirement: `coinsTransferredSent>=1`
- **💸 10 Coins Sent** — Send at least 10 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=10`
- **💸 50 Coins Sent** — Send at least 50 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=50`
- **💸 100 Coins Sent** — Send at least 100 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=100`
- **💸 250 Coins Sent** — Send at least 250 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=250`
- **💸 500 Coins Sent** — Send at least 500 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=500`
- **💸 1,000 Coins Sent** — Send at least 1,000 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=1000`
- **💸 2,500 Coins Sent** — Send at least 2,500 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=2500`
- **💸 5,000 Coins Sent** — Send at least 5,000 total coins with /givecoins.  
  Requirement: `coinsTransferredSent>=5000`

## 🏦 Coins Transferred In

- **🏦 First Coin Received** — Receive at least 1 total coin through /givecoins.  
  Requirement: `coinsTransferredReceived>=1`
- **🏦 10 Coins Received** — Receive at least 10 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=10`
- **🏦 50 Coins Received** — Receive at least 50 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=50`
- **🏦 100 Coins Received** — Receive at least 100 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=100`
- **🏦 250 Coins Received** — Receive at least 250 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=250`
- **🏦 500 Coins Received** — Receive at least 500 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=500`
- **🏦 1,000 Coins Received** — Receive at least 1,000 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=1000`
- **🏦 2,500 Coins Received** — Receive at least 2,500 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=2500`
- **🏦 5,000 Coins Received** — Receive at least 5,000 total coins through /givecoins.  
  Requirement: `coinsTransferredReceived>=5000`

## 🪙 Coin Reply Awards

- **🪙 First Coin Reply Award Given** — Use the configured pointCommand reply-award command once.  
  Requirement: `coinReplyAwardsGiven>=1`
- **🪙 5 pointCommand Reply Awards Given** — Give 5 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=5`
- **🪙 10 pointCommand Reply Awards Given** — Give 10 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=10`
- **🪙 25 pointCommand Reply Awards Given** — Give 25 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=25`
- **🪙 50 pointCommand Reply Awards Given** — Give 50 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=50`
- **🪙 100 pointCommand Reply Awards Given** — Give 100 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=100`
- **🪙 250 pointCommand Reply Awards Given** — Give 250 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=250`
- **🪙 500 pointCommand Reply Awards Given** — Give 500 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=500`
- **🎉 First Coin Reply Award Received** — Receive a VIP-point + coin bundle through the configured pointCommand reply-award command.  
  Requirement: `coinReplyAwardsReceived>=1`
- **🎉 5 pointCommand Reply Awards Received** — Receive 5 pointCommand reply awards.  
  Requirement: `coinReplyAwardsReceived>=5`
- **🎉 10 pointCommand Reply Awards Received** — Receive 10 pointCommand reply awards.  
  Requirement: `coinReplyAwardsReceived>=10`
- **🎉 25 pointCommand Reply Awards Received** — Receive 25 pointCommand reply awards.  
  Requirement: `coinReplyAwardsReceived>=25`
- **🎉 50 pointCommand Reply Awards Received** — Receive 50 pointCommand reply awards.  
  Requirement: `coinReplyAwardsReceived>=50`
- **🎉 100 pointCommand Reply Awards Received** — Receive 100 pointCommand reply awards.  
  Requirement: `coinReplyAwardsReceived>=100`
- **🎉 250 pointCommand Reply Awards Received** — Receive 250 pointCommand reply awards.  
  Requirement: `coinReplyAwardsReceived>=250`
- **🎉 500 pointCommand Reply Awards Received** — Receive 500 pointCommand reply awards.  
  Requirement: `coinReplyAwardsReceived>=500`

## 🌟 Combined Challenges

- **🌈 Well Rounded** — Reach 10 posts, 50 comments, 500 XP, 25 coins, and a 7-day streak.  
  Requirement: `posts>=10,comments>=50,xp>=500,coins>=25,longestStreak>=7`
- **🏘️ Community Regular** — Reach 500 activities, 5,000 XP, and a 30-day streak.  
  Requirement: `activities>=500,xp>=5000,longestStreak>=30`
- **🏛️ Community Pillar** — Reach 2,500 activities, 50,000 XP, 25 reputation, and a 100-day streak.  
  Requirement: `activities>=2500,xp>=50000,reputation>=25,longestStreak>=100`
- **🧓 VIPBot Veteran** — Reach 5,000 activities, 100,000 XP, and a 180-day streak.  
  Requirement: `activities>=5000,xp>=100000,longestStreak>=180`
- **💝 Generous Spirit** — Give 25 VIP points and transfer 250 total coins to other users.  
  Requirement: `vipPointsGiven>=25,coinsTransferredSent>=250`
- **❤️ Community Builder** — Receive 25 VIP points, 5 nominations, and reach 10 reputation.  
  Requirement: `vipPointsReceived>=25,nominationsReceived>=5,reputation>=10`
- **🛒 Store Regular** — Complete 10 VIP Store purchases totaling at least 90 VIP days.  
  Requirement: `storePurchases>=10,vipDaysPurchased>=90`
- **🔄 Full Circle** — Give 25 pointCommand reply awards and receive 25 pointCommand reply awards.  
  Requirement: `coinReplyAwardsGiven>=25,coinReplyAwardsReceived>=25`
- **📊 Community Economist** — Hold 1,000 coins, transfer 1,000 total coins out, and spend 500 coins in the VIP Store.  
  Requirement: `coins>=1000,coinsTransferredSent>=1000,storeCoinsSpent>=500`
- **🌟 All-Around VIP** — Reach 100 posts, 500 comments, 50,000 XP, a 30-day streak, 25 reputation, 25 VIP points received, 500 coins, and active VIP status.  
  Requirement: `posts>=100,comments>=500,xp>=50000,longestStreak>=30,reputation>=25,vipPointsReceived>=25,coins>=500,hasVIP`

At least one valid achievement line is required in each category setting. If a persisted category value is unusable at runtime, VIPBot falls back to that category's built-in defaults. Already-earned achievement history remains stored on user profiles even when definitions are later edited.

`/achievements` re-evaluates the user's current eligible milestones before displaying the unlocked achievement list and shows the number unlocked out of the total catalog. Profile output also shows the unlocked count.

Activity/comment/post totals, nomination history totals, store-purchase totals, transfer totals, and `pointCommand` reply-award totals are lifetime counters maintained by this version of VIPBot. Existing installations cannot reconstruct actions that happened before those counters existed, so those particular counters begin accumulating when this version is installed. Existing XP, coin balance, reputation, longest streak, VIP-point totals, and active VIP status can still unlock their corresponding achievements immediately when the engine evaluates the user.

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

VIPBot has **two user-to-user reward paths**:

1. **Direct coin transfers with `/givecoins`**
   * Use `/givecoins u/username amount` to transfer VIP Coins directly to another user.
   * The amount is chosen by the sender and is limited by the configured maximum transfer setting.
   * `/givecoins` transfers coins only; it does not award VIP points.

2. **Reply awards with the configurable `pointCommand`**
   * Reply directly to another user's comment with the configured point command.
   * The default `pointCommand` is `/vip` when the global prefix is `/`.
   * Every successful `pointCommand` reply awards the **parent-comment author both VIP points and VIP Coins at the same time**.
   * By default, one successful reply awards **1 VIP point + 1 coin**.
   * The VIP-point amount is configurable with `AppSetting.PointCommandVIPPointAmount`.
   * The coin amount is configurable with `AppSetting.PointCommandCoinAmount`.
   * VIP points remain separate from the managed-flair score.
   * The reply command cannot be used on your own comment, must be the entire reply body, and each awarder can reward a particular parent comment only once. Existing award access controls and blocked-awarder rules still apply.

For example, with the defaults:

`/vip`

as a reply to another user's comment gives that comment author **1 VIP point and 1 VIP Coin**.

These reply-award amounts can be changed independently. For example, moderators could configure each successful `pointCommand` to award 2 VIP points and 3 coins instead.

Future versions may expand user rewards to include additional reward types such as XP, reputation, or temporary VIP status.

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

Moderator management is performed from VIPBot's **post and comment context menus**, rather than public text commands. This keeps administrative actions out of public view.

From a user's post or comment, moderators can use the VIPBot context-menu actions to:

* Grant VIP status or add VIP time
* Grant permanent VIP by using a duration of `0` when the VIP form supports it
* Remove VIP status
* Set a user's XP
* Set a user's coin balance
* Set a user's reputation
* Manage the legacy/public managed-flair score where that system is enabled

A user's level is **not set independently**. Setting XP automatically changes the user's derived level according to `AppSetting.LevelThresholds`.

Moderator context-menu actions can be recorded in the VIPBot audit system when audit logging is enabled.

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

## Key Progression & Reward Settings

The main VIPBot progression systems can be configured independently. Important settings include:

| Setting | Purpose |
| --- | --- |
| `LevelThresholds` | Authoritative `level|xp|rankName` definitions used to derive levels and rank titles from XP |
| `XPEnabled` | Enables or disables XP/level progression |
| `XPPerPost` / `XPPerComment` | XP granted for new post/comment activity |
| `CoinsEnabled` | Enables or disables VIP Coins |
| `DailyCoinReward` | Coins granted once per UTC day for qualifying activity |
| `MaxCoinGiftAmount` | Maximum amount transferable with `/givecoins`; `0` means no configured maximum |
| `PointCommand` | Configurable reply-command name used to award the parent-comment author both VIP points and VIP Coins; defaults to `vippoint` |
| `PointCommandVIPPointAmount` | VIP points awarded by each successful `pointCommand`; defaults to `1` |
| `PointCommandCoinAmount` | VIP Coins awarded by each successful `pointCommand`; defaults to `1` |
| `VIPStoreEnabled` | Enables or disables the VIP Store |
| `VIPStoreOptions` | Store options in `optionNumber|coinCost|duration` format; at least one valid option is required |
| `ReputationEnabled` | Enables or disables the separate reputation system |
| `NominationsEnabled` | Enables or disables VIP nominations |
| `NominationReputationReward` | Reputation added for a nomination when reputation is enabled |
| `StreaksEnabled` | Enables or disables activity streak tracking |
| `AchievementsEnabled` | Enables or disables achievement tracking |
| Achievement category settings | The 22 fields under **Achievements** (`Comment`, `Post`, `TotalActivity`, `MixedActivity`, `XP`, `Streak`, `CoinBalance`, `Reputation`, `VIPPointsReceived`, `VIPPointsGiven`, `NominationsReceived`, `NominationsMade`, `VIPStorePurchases`, `VIPDaysPurchased`, `VIPStoreSpending`, `VIPStatus`, `CoinsSent`, `CoinsReceived`, `CoinsTransferredOut`, `CoinsTransferredIn`, `CoinReplyAwards`, `CombinedChallenges`). Each field contains one achievement definition per new line. |
| `VIPEnabled` | Enables or disables VIP status features |
| `AutoVIPEnabled` / `AutoVIPXPThreshold` | Controls automatic VIP grants based on XP |
| `DefaultVIPDurationDays` | Default VIP duration; `0` represents permanent VIP |
| `VIPFlairEnabled` / `VIPFlairText` | Controls optional VIP flair behavior/text |
| `AuditLoggingEnabled` | Enables or disables VIPBot audit entries |
| `LeaderboardSize` | Number of users displayed by leaderboard commands |

The legacy/public managed-flair score remains a separate system with its own settings such as `PostIncrement` and `CommentIncrement`; it is not XP, Coins, or Reputation.

---

## Commands

The default command prefix is `/`.

The command prefix can be changed through the app settings.

### User Commands

| Command                   | Description                                 |
| ------------------------- | ------------------------------------------- |
| `/info`                   | Display an explanation of how the bot works |
| `/help`                   | Display available commands                  |
| `/profile`                | Display your VIPBot profile                 |
| `/rank`                   | Display your XP rank                        |
| `/rank u/username`        | Display another user's rank                 |
| `/balance`                | Display your coin balance                   |
| `/achievements`           | Display your achievements                   |
| `/leaderboard`            | Display the XP leaderboard                  |
| `/leaderboard xp`         | Display the XP leaderboard                  |
| `/leaderboard weeklyxp`   | Display the current weekly XP leaderboard   |
| `/leaderboard monthlyxp`  | Display the current monthly XP leaderboard  |
| `/leaderboard coins`      | Display the coin leaderboard                |
| `/leaderboard rep`        | Display the reputation leaderboard          |
| `/leaderboard level`      | Display users by XP-derived level           |
| `/leaderboard streak`     | Display the activity-streak leaderboard     |
| `/streak`                 | Display your activity streak                |
| `/vips`                   | Display current VIPs                        |
| `/store`                  | Display the configured VIP Store options    |
| `/store <option>`         | Buy the selected VIP Store option with coins |
| `/nominate u/username`    | Nominate another user                       |
| `/givecoins u/username amount` | Give another user coins                     |
| `/vippoint`               | Default `pointCommand`: when used as a reply, award the parent-comment author the configured VIP-point amount **and** configured coin amount |

`/vippoint` is the default only. The actual command name comes from `AppSetting.PointCommand`, and the configured global command prefix is prepended at runtime. With default settings, each successful reply gives **1 VIP point + 1 coin**. `AppSetting.PointCommandVIPPointAmount` and `AppSetting.PointCommandCoinAmount` control those values independently.

### Moderator Actions

VIPBot does not use public moderator text commands for user-stat administration. Moderator actions are exposed through the **post and comment context menus**. See the **Moderator Controls** section above.

Because levels are derived from XP using `AppSetting.LevelThresholds`, moderators change progression by setting XP rather than directly setting a stored level.

---

## Supported Placeholders

VIPBot supports placeholders in configurable messages and templates.

Placeholders can use either single or double curly braces (ie `{username}` or `{{username}}`).

NOTE: All placeholders are case-insensitive.

### User Information

* `prefix`: The prefix associated with all commands. Specified in "Command Prefix".
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

* `requester`: The user requesting information.
* `target`: The user being targeted.
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

### Command Information

* `command`: The command associated with an action.
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
* Accounts listed in `AccountsThatWillNotBeManaged` are excluded from automatic VIPBot activity/managed-score handling; VIPBot and AutoModerator are ignored by default.

---

## Suggestions

I strongly recommend installing and testing VIPBot on a test subreddit before deploying it to an actual community.

This is especially important when testing:

* Automatic VIP promotion
* VIP expiration
* Flair settings
* XP rewards
* Coin rewards
* VIP Store costs and durations
* Configurable combined `pointCommand` reply awards (VIP points + coins)
* Reputation rewards
* Moderator context-menu controls
* Leaderboards
* Nominations
* Automated messages

Start with conservative reward values and increase them after verifying that the system behaves as expected.

---

## Future Features

VIPBot is designed so additional community features can be added without replacing the existing XP, economy, reputation, or VIP systems.

Potential future features include:

### 🛒 VIP Store Expansion

The VIP Store already supports purchasing configurable lengths of temporary VIP status with VIP Coins. Future versions may expand the store beyond VIP time to support additional configurable rewards such as:

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

## Latest Changes
## v1.0.4
* Add change log file
* Change version formatting
## v1.0.3
* Add "Moderators Exempt From Flairing?" option (by default, mods are exempt from flair management)
## v1.0.2
* Update default settings
## v1.0.1
* Make README accurately reflect commands
* Remove subreddit rank from profile command
* Make all command responses send a dm to the user with a public response notifying the user that it did
* Change "Who can award points?" default to everyone
* Fix formatting of certain logic
## v1.0.0
* NOTE: As far as I can tell this should work fully. If it doesn't, please [message me](https://www.reddit.com/message/compose?to=u/ryry50583583&subject=VIP%20Bot%20Feature%20Missing&message=Error%20Details%3A%20%5BPlease%20provide%20me%20with%20as%20much%20detail%20as%20possible%20regarding%20what%20happened%5D%0A%0ALink%20to%20where%20the%20issue%20occurred%3A%20%5Bput%20link%20here%5D) to let me know and link to the original comment or post that made you aware of this.
* Bring the bot into an up-and-running state
* List all current placeholders in README
* Update README to list all features that exist currently
* Import [RepBot](https://github.com/the-gdmo/TheRepBot) code
* Create VIPBot
* Upload app image

For older versions, please see the [full changelog](https://github.com/the-gdmo/vipbot/blob/main/changelog.md).