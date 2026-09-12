import {
    SettingsFormField,
    SettingsFormFieldValidatorEvent,
    TriggerContext,
} from "@devvit/public-api";

export enum AppSetting {
    CommandPrefix = "commandPrefix",
    PointSymbol = "pointSymbol",
    AccessControl = "accessControl",
    FlairFormatting = "flairFormatting",
    LeaderboardSize = "leaderboardSize",
    UsersWhoCannotAwardPoints = "usersWhoCannotAwardPoints",
    NotifyOnNormalAwardFail = "notifyOnNormalAwardFail",
    UsersWhoCannotAwardPointsMessage = "usersWhoCannotAwardPointsMessage",
    PointName = "pointName",
    NotifyOnNormalAwardSuccess = "notifyOnNormalAwardSuccess",
    NormalAwardSuccessMessage = "normalAwardSuccessMessage",
    VIPUsers = "VIPUsers",
    NotifyOnAutoSuperuser = "notifyOnAutoSuperuser",
    AutoSuperuserThreshold = "autoSuperuserThreshold",
    AutoSuperuserTemplate = "autoSuperuserTemplate",
    NotifyOnTrustedUserAwardSuccess = "notifyOnTrustedUserAwardSuccess",
    TrustedUserAwardSuccessMessage = "trustedUserAwardSuccessMessage",
    NotifyOnModAwardSuccess = "notifyOnModAwardSuccess",
    ModAwardCommandSuccess = "modAwardCommandSuccess",
    NotifyOnModAwardFail = "notifyOnModAwardFail",
    ModAwardCommandFailMessage = "modAwardCommandFailMessage",
    ModAwardAlreadyGivenMessage = "modAwardAlreadyGiven",
    UserPointsInitializedMessage = "userPointsInitializedMessage",
    NotifyUsersWhenPointsAreInitialized = "notifyUsersWhenPointsAreInitialized",
    PointsAreInitializedMessage = "pointsAreInitializedMessage",
    AllowUnflairedPosts = "allowUnflairedPosts",
    NotifyOnUnflairedPost = "notifyOnUnflairedPost",
    UnflairedPostMessage = "unflairedPostMessage",
    NotifyOnPointAlreadyAwardedToUser = "notifyOnPointAlreadyAwardedToUser",
    PointAlreadyAwardedToUserMessage = "pointAlreadyAwardedToUserMessage",
    NotifyOnPostAuthorAward = "notifyOnPostAuthorAward",
    PostAuthorAwardMessage = "postAuthorAwardMessage",
    NotifyOnModOnlyDisallowed = "notifyOnModOnlyDisallowed",
    ModOnlyDisallowedMessage = "modOnlyDisallowedMessage",
    NotifyOnModsAndPostAuthorDisallowed = "notifyOnModsAndPostAuthorDisallowed",
    ModsAndPostAuthorDisallowedMessage = "modsAndPostAuthorDisallowedMessage",
    NotifyOnApprovedOnlyDisallowed = "notifyOnApprovedOnlyDisallowed",
    ApprovedOnlyDisallowedMessage = "approvedOnlyDisallowedMessage",
    NotifyOnOPOnlyDisallowed = "notifyOnOPOnlyDisallowed",
    OPOnlyDisallowedMessage = "opOnlyDisallowedMessage",
    NotifyOnDisallowedFlair = "notifyOnDisallowedFlair",
    DisallowedFlairs = "disallowedFlairs",
    DisallowedFlairMessage = "disallowedFlairMessage",
    NotifyOnSelfAward = "notifyOnSelfAward",
    NotifyUsersWhoCannotAwardPoints = "notifyUsersWhoCannotAwardPoints",
    NotifyOnBlockedUser = "notifyOnBlockedUser",
    LeaderboardMode = "leaderboardMode",
    DiscordServerLink = "discordServerLink",
    LeaderboardName = "leaderboardName",
    PointSystemHelpPage = "pointSystemHelpPage",
    DigestNewMessageEachDay = "digestNewMessageEachDay",
    DigestFrequency = "digestFrequency",
    DigestAsModNotification = "digestAsModNotification",
    UpgradeNotifier = "upgradeNotifier",
    ExistingFlairHandling = "existingFlairHandling",
    CSSClass = "CSSClass",
    FlairTemplate = "flairTemplate",
    LevelThresholds = "levelThresholds",
    XPEnabled = "xpEnabled",
    XPPerPost = "xpPerPost",
    XPPerComment = "xpPerComment",
    CoinsEnabled = "coinsEnabled",
    DailyCoinReward = "dailyCoinReward",
    MaxCoinGiftAmount = "maxCoinGiftAmount",
    PointCommand = "pointCommand",
    PointCommandVIPPointAmount = "pointCommandVipPointAmount",
    PointCommandCoinAmount = "pointCommandCoinAmount",
    ReputationEnabled = "reputationEnabled",
    NominationsEnabled = "nominationsEnabled",
    NominationReputationReward = "nominationReputationReward",
    StreaksEnabled = "streaksEnabled",
    AchievementsEnabled = "achievementsEnabled",
    Comment = "comment",
    Post = "post",
    TotalActivity = "totalActivity",
    MixedActivity = "mixedActivity",
    XP = "xp",
    Streak = "streak",
    CoinBalance = "coinBalance",
    Reputation = "reputation",
    VIPPointsReceived = "vipPointsReceived",
    VIPPointsGiven = "vipPointsGiven",
    NominationsReceived = "nominationsReceived",
    NominationsMade = "nominationsMade",
    VIPStorePurchases = "vipStorePurchases",
    VIPDaysPurchased = "vipDaysPurchased",
    VIPStoreSpending = "vipStoreSpending",
    VIPStatus = "vipStatus",
    CoinsSent = "coinsSent",
    CoinsReceived = "coinsReceived",
    CoinsTransferredOut = "coinsTransferredOut",
    CoinsTransferredIn = "coinsTransferredIn",
    CoinReplyAwards = "coinReplyAwards",
    CombinedChallenges = "combinedChallenges",
    VIPEnabled = "vipEnabled",
    AutoVIPEnabled = "autoVipEnabled",
    AutoVIPXPThreshold = "autoVipXpThreshold",
    DefaultVIPDurationDays = "defaultVipDurationDays",
    VIPStoreEnabled = "vipStoreEnabled",
    VIPStoreOptions = "vipStoreOptions",
    AuditLoggingEnabled = "auditLoggingEnabled",
    PostIncrement = "postIncrement",
    CommentIncrement = "commentIncrement",
    NewPostMessage = "newPostMessage",
    InfoMessageConfirmation = "infoMessageConfirmation",
    DMInfoMessage = "dmInfoMessage",
    HelpMessageConfirmation = "helpMessageConfirmation",
    DMHelpMessage = "dmHelpMessage",
    BotFlairText = "botFlairText",
    BotFlairTextColor = "botFlairTextColor",
    BotFlairBackgroundColor = "botFlairBackgroundColor",
    UserProfileSentMessage = "userProfileSentMessage",
    AccountsThatWillNotBeManaged = "accountsThatWillNotBeManaged",
    NominationsToBecomeVipUser = "nominationsToBecomeVipUser",
    UserBecameSuperuserFromNominationsMessage = "userBecameSuperuserFromNominationsMessage",
}

export enum TemplateDefaults {
    VIPStoreOptions = "1|5|1D\n2|12|3D\n3|18|5D\n4|24|1W\n5|45|2W\n6|65|3W\n7|90|1M",
    PointCommand = "vip",
    FirstComment = "Comments|💬 First Comment|Make your first counted comment.|comments>=1",
    TenComments = "Comments|💬 10 Comments|Make 10 counted comments.|comments>=10",
    TwentyFiveComments = "Comments|💬 25 Comments|Make 25 counted comments.|comments>=25",
    FiftyComments = "Comments|💬 50 Comments|Make 50 counted comments.|comments>=50",
    OneHundredComments = "Comments|💬 100 Comments|Make 100 counted comments.|comments>=100",
    TwoHundredFiftyComments = "Comments|💬 250 Comments|Make 250 counted comments.|comments>=250",
    FiveHundredComments = "Comments|💬 500 Comments|Make 500 counted comments.|comments>=500",
    OneThousandComments = "Comments|💬 1,000 Comments|Make 1,000 counted comments.|comments>=1000",
    TwoThousandFiveHundredComments = "Comments|💬 2,500 Comments|Make 2,500 counted comments.|comments>=2500",
    FiveThousandComments = "Comments|💬 5,000 Comments|Make 5,000 counted comments.|comments>=5000",
    FirstPost = "Posts|📝 First Post|Make your first counted post.|posts>=1",
    FivePosts = "Posts|📝 5 Posts|Make 5 counted posts.|posts>=5",
    TenPosts = "Posts|📝 10 Posts|Make 10 counted posts.|posts>=10",
    TwentyFivePosts = "Posts|📝 25 Posts|Make 25 counted posts.|posts>=25",
    FiftyPosts = "Posts|📝 50 Posts|Make 50 counted posts.|posts>=50",
    OneHundredPosts = "Posts|📝 100 Posts|Make 100 counted posts.|posts>=100",
    TwoHundredFiftyPosts = "Posts|📝 250 Posts|Make 250 counted posts.|posts>=250",
    FiveHundredPosts = "Posts|📝 500 Posts|Make 500 counted posts.|posts>=500",
    OneThousandPosts = "Posts|📝 1,000 Posts|Make 1,000 counted posts.|posts>=1000",
    TenActivities = "Total Activity|🧭 10 Activities|Make 10 counted posts and comments combined.|activities>=10",
    TwentyFiveActivities = "Total Activity|🧭 25 Activities|Make 25 counted posts and comments combined.|activities>=25",
    FiftyActivities = "Total Activity|🧭 50 Activities|Make 50 counted posts and comments combined.|activities>=50",
    OneHundredActivities = "Total Activity|🧭 100 Activities|Make 100 counted posts and comments combined.|activities>=100",
    TwoHundredFiftyActivities = "Total Activity|🧭 250 Activities|Make 250 counted posts and comments combined.|activities>=250",
    FiveHundredActivities = "Total Activity|🧭 500 Activities|Make 500 counted posts and comments combined.|activities>=500",
    OneThousandActivities = "Total Activity|🧭 1,000 Activities|Make 1,000 counted posts and comments combined.|activities>=1000",
    TwoThousandFiveHundredActivities = "Total Activity|🧭 2,500 Activities|Make 2,500 counted posts and comments combined.|activities>=2500",
    FiveThousandActivities = "Total Activity|🧭 5,000 Activities|Make 5,000 counted posts and comments combined.|activities>=5000",
    TenThousandActivities = "Total Activity|🧭 10,000 Activities|Make 10,000 counted posts and comments combined.|activities>=10000",
    DoubleDebut = "Mixed Activity|🎬 Double Debut|Make at least one counted post and one counted comment.|posts>=1,comments>=1",
    GettingStarted = "XP|🌱 Getting Started|Reach 100 XP.|xp>=100",
    RisingStar = "XP|⭐ Rising Star|Reach 500 XP.|xp>=500",
    SilverMomentum = "XP|🥈 Silver Momentum|Reach 1,500 XP.|xp>=1500",
    GoldStandard = "XP|🥇 Gold Standard|Reach 5,000 XP.|xp>=5000",
    DiamondHands = "XP|💎 Diamond Hands|Reach 15,000 XP.|xp>=15000",
    EliteStatus = "XP|🚀 Elite Status|Reach 50,000 XP.|xp>=50000",
    PlatinumPace = "XP|🏅 Platinum Pace|Reach 100,000 XP.|xp>=100000",
    Champion = "XP|🏆 Champion|Reach 200,000 XP.|xp>=200000",
    Legend = "XP|👑 Legend|Reach 300,000 XP.|xp>=300000",
    Mythic = "XP|🌌 Mythic|Reach 500,000 XP.|xp>=500000",
    ALeagueOfTheirOwn = "XP|✨ A League Of Their Own|Reach 1,000,000 XP.|xp>=1000000",
    TwoDaySpark = "Streaks|🔥 Two-Day Spark|Reach a 2-day activity streak.|longestStreak>=2",
    ThreeDayFlame = "Streaks|🔥 Three-Day Flame|Reach a 3-day activity streak.|longestStreak>=3",
    WeekWarrior = "Streaks|🔥 Week Warrior|Reach a 7-day activity streak.|longestStreak>=7",
    TwoWeekTrek = "Streaks|🔥 Two-Week Trek|Reach a 14-day activity streak.|longestStreak>=14",
    MonthStrong = "Streaks|🔥 Month Strong|Reach a 30-day activity streak.|longestStreak>=30",
    SixtyStraight = "Streaks|🔥 Sixty Straight|Reach a 60-day activity streak.|longestStreak>=60",
    QuarterYearConsistency = "Streaks|🔥 Quarter-Year Consistency|Reach a 90-day activity streak.|longestStreak>=90",
    Unstoppable = "Streaks|💯 Unstoppable|Reach a 100-day activity streak.|longestStreak>=100",
    HalfYearHabit = "Streaks|🔥 Half-Year Habit|Reach a 180-day activity streak.|longestStreak>=180",
    YearLong = "Streaks|🏆 Year Long|Reach a 365-day activity streak.|longestStreak>=365",
    FiveHundredDayFire = "Streaks|🔥 500-Day Fire|Reach a 500-day activity streak.|longestStreak>=500",
    TwoYearsStrong = "Streaks|🏆 Two Years Strong|Reach a 730-day activity streak.|longestStreak>=730",
    ThreeYearsStrong = "Streaks|🏆 Three Years Strong|Reach a 1,095-day activity streak.|longestStreak>=1095",
    FirstCoin = "Coin Balance|🪙 First Coin|Hold at least 1 VIP Coin.|coins>=1",
    FiveCoins = "Coin Balance|🪙 5 Coins|Hold at least 5 VIP Coins.|coins>=5",
    TenCoins = "Coin Balance|🪙 10 Coins|Hold at least 10 VIP Coins.|coins>=10",
    TwentyFiveCoins = "Coin Balance|🪙 25 Coins|Hold at least 25 VIP Coins.|coins>=25",
    FiftyCoins = "Coin Balance|🪙 50 Coins|Hold at least 50 VIP Coins.|coins>=50",
    OneHundredCoins = "Coin Balance|🪙 100 Coins|Hold at least 100 VIP Coins.|coins>=100",
    TwoHundredFiftyCoins = "Coin Balance|🪙 250 Coins|Hold at least 250 VIP Coins.|coins>=250",
    FiveHundredCoins = "Coin Balance|🪙 500 Coins|Hold at least 500 VIP Coins.|coins>=500",
    OneThousandCoins = "Coin Balance|💰 1,000 Coins|Hold at least 1,000 VIP Coins.|coins>=1000",
    TwoThousandFiveHundredCoins = "Coin Balance|💰 2,500 Coins|Hold at least 2,500 VIP Coins.|coins>=2500",
    FiveThousandCoins = "Coin Balance|💰 5,000 Coins|Hold at least 5,000 VIP Coins.|coins>=5000",
    TenThousandCoins = "Coin Balance|🏦 10,000 Coins|Hold at least 10,000 VIP Coins.|coins>=10000",
    KnownAroundHere = "Reputation|⭐ Known Around Here|Reach 1 reputation.|reputation>=1",
    Recognized = "Reputation|⭐ Recognized|Reach 3 reputation.|reputation>=3",
    WellRegarded = "Reputation|⭐ Well Regarded|Reach 5 reputation.|reputation>=5",
    TrustedVoice = "Reputation|⭐ Trusted Voice|Reach 10 reputation.|reputation>=10",
    CommunityStandout = "Reputation|⭐ Community Standout|Reach 25 reputation.|reputation>=25",
    HighlyRegarded = "Reputation|🌟 Highly Regarded|Reach 50 reputation.|reputation>=50",
    CommunityMainstay = "Reputation|🌟 Community Mainstay|Reach 100 reputation.|reputation>=100",
    EsteemedMember = "Reputation|🌟 Esteemed Member|Reach 250 reputation.|reputation>=250",
    CommunityIcon = "Reputation|🌟 Community Icon|Reach 500 reputation.|reputation>=500",
    ReputationLegend = "Reputation|🌠 Reputation Legend|Reach 1,000 reputation.|reputation>=1000",
    FirstVIPPoint = "VIP Points Received|💎 First VIP Point|Receive your first VIP point.|vipPointsReceived>=1",
    FiveVIPPointsReceived = "VIP Points Received|💎 5 VIP Points Received|Receive 5 VIP points.|vipPointsReceived>=5",
    TenVIPPointsReceived = "VIP Points Received|💎 10 VIP Points Received|Receive 10 VIP points.|vipPointsReceived>=10",
    TwentyFiveVIPPointsReceived = "VIP Points Received|💎 25 VIP Points Received|Receive 25 VIP points.|vipPointsReceived>=25",
    FiftyVIPPointsReceived = "VIP Points Received|💎 50 VIP Points Received|Receive 50 VIP points.|vipPointsReceived>=50",
    OneHundredVIPPointsReceived = "VIP Points Received|💎 100 VIP Points Received|Receive 100 VIP points.|vipPointsReceived>=100",
    TwoHundredFiftyVIPPointsReceived = "VIP Points Received|💎 250 VIP Points Received|Receive 250 VIP points.|vipPointsReceived>=250",
    FiveHundredVIPPointsReceived = "VIP Points Received|💎 500 VIP Points Received|Receive 500 VIP points.|vipPointsReceived>=500",
    OneThousandVIPPointsReceived = "VIP Points Received|💎 1,000 VIP Points Received|Receive 1,000 VIP points.|vipPointsReceived>=1000",
    TwoThousandFiveHundredVIPPointsReceived = "VIP Points Received|💎 2,500 VIP Points Received|Receive 2,500 VIP points.|vipPointsReceived>=2500",
    FirstVIPPointGiven = "VIP Points Given|🎁 First VIP Point Given|Give your first VIP point.|vipPointsGiven>=1",
    FiveVIPPointsGiven = "VIP Points Given|🎁 5 VIP Points Given|Give 5 VIP points.|vipPointsGiven>=5",
    TenVIPPointsGiven = "VIP Points Given|🎁 10 VIP Points Given|Give 10 VIP points.|vipPointsGiven>=10",
    TwentyFiveVIPPointsGiven = "VIP Points Given|🎁 25 VIP Points Given|Give 25 VIP points.|vipPointsGiven>=25",
    FiftyVIPPointsGiven = "VIP Points Given|🎁 50 VIP Points Given|Give 50 VIP points.|vipPointsGiven>=50",
    OneHundredVIPPointsGiven = "VIP Points Given|🎁 100 VIP Points Given|Give 100 VIP points.|vipPointsGiven>=100",
    TwoHundredFiftyVIPPointsGiven = "VIP Points Given|🎁 250 VIP Points Given|Give 250 VIP points.|vipPointsGiven>=250",
    FiveHundredVIPPointsGiven = "VIP Points Given|🎁 500 VIP Points Given|Give 500 VIP points.|vipPointsGiven>=500",
    OneThousandVIPPointsGiven = "VIP Points Given|🎁 1,000 VIP Points Given|Give 1,000 VIP points.|vipPointsGiven>=1000",
    TwoThousandFiveHundredVIPPointsGiven = "VIP Points Given|🎁 2,500 VIP Points Given|Give 2,500 VIP points.|vipPointsGiven>=2500",
    CommunityFavorite = "Nominations Received|🤝 Community Favorite|Receive your first VIP nomination.|nominationsReceived>=1",
    ThreeNominationsReceived = "Nominations Received|🤝 3 Nominations Received|Receive 3 VIP nominations over time.|nominationsReceived>=3",
    FiveNominationsReceived = "Nominations Received|🤝 5 Nominations Received|Receive 5 VIP nominations over time.|nominationsReceived>=5",
    TenNominationsReceived = "Nominations Received|🤝 10 Nominations Received|Receive 10 VIP nominations over time.|nominationsReceived>=10",
    TwentyFiveNominationsReceived = "Nominations Received|🤝 25 Nominations Received|Receive 25 VIP nominations over time.|nominationsReceived>=25",
    FiftyNominationsReceived = "Nominations Received|🤝 50 Nominations Received|Receive 50 VIP nominations over time.|nominationsReceived>=50",
    OneHundredNominationsReceived = "Nominations Received|🤝 100 Nominations Received|Receive 100 VIP nominations over time.|nominationsReceived>=100",
    TwoHundredFiftyNominationsReceived = "Nominations Received|🤝 250 Nominations Received|Receive 250 VIP nominations over time.|nominationsReceived>=250",
    FirstNominationMade = "Nominations Made|🗳️ First Nomination Made|Make your first VIP nomination.|nominationsGiven>=1",
    ThreeNominationsMade = "Nominations Made|🗳️ 3 Nominations Made|Make 3 VIP nominations over time.|nominationsGiven>=3",
    FiveNominationsMade = "Nominations Made|🗳️ 5 Nominations Made|Make 5 VIP nominations over time.|nominationsGiven>=5",
    TenNominationsMade = "Nominations Made|🗳️ 10 Nominations Made|Make 10 VIP nominations over time.|nominationsGiven>=10",
    TwentyFiveNominationsMade = "Nominations Made|🗳️ 25 Nominations Made|Make 25 VIP nominations over time.|nominationsGiven>=25",
    FiftyNominationsMade = "Nominations Made|🗳️ 50 Nominations Made|Make 50 VIP nominations over time.|nominationsGiven>=50",
    OneHundredNominationsMade = "Nominations Made|🗳️ 100 Nominations Made|Make 100 VIP nominations over time.|nominationsGiven>=100",
    FirstVIPStorePurchase = "VIP Store Purchases|🛍️ First VIP Store Purchase|Complete your first VIP Store purchase.|storePurchases>=1",
    ThreeVIPStorePurchases = "VIP Store Purchases|🛍️ 3 VIP Store Purchases|Complete 3 VIP Store purchases.|storePurchases>=3",
    FiveVIPStorePurchases = "VIP Store Purchases|🛍️ 5 VIP Store Purchases|Complete 5 VIP Store purchases.|storePurchases>=5",
    TenVIPStorePurchases = "VIP Store Purchases|🛍️ 10 VIP Store Purchases|Complete 10 VIP Store purchases.|storePurchases>=10",
    TwentyFiveVIPStorePurchases = "VIP Store Purchases|🛍️ 25 VIP Store Purchases|Complete 25 VIP Store purchases.|storePurchases>=25",
    FiftyVIPStorePurchases = "VIP Store Purchases|🛍️ 50 VIP Store Purchases|Complete 50 VIP Store purchases.|storePurchases>=50",
    FirstVIPDayPurchased = "VIP Days Purchased|👑 First VIP Day Purchased|Purchase at least 1 total day of VIP status.|vipDaysPurchased>=1",
    SevenVIPDaysPurchased = "VIP Days Purchased|👑 7 VIP Days Purchased|Purchase at least 7 total days of VIP status.|vipDaysPurchased>=7",
    ThirtyVIPDaysPurchased = "VIP Days Purchased|👑 30 VIP Days Purchased|Purchase at least 30 total days of VIP status.|vipDaysPurchased>=30",
    NinetyVIPDaysPurchased = "VIP Days Purchased|👑 90 VIP Days Purchased|Purchase at least 90 total days of VIP status.|vipDaysPurchased>=90",
    OneHundredEightyVIPDaysPurchased = "VIP Days Purchased|👑 180 VIP Days Purchased|Purchase at least 180 total days of VIP status.|vipDaysPurchased>=180",
    ThreeHundredSixtyFiveVIPDaysPurchased = "VIP Days Purchased|👑 365 VIP Days Purchased|Purchase at least 365 total days of VIP status.|vipDaysPurchased>=365",
    SevenHundredThirtyVIPDaysPurchased = "VIP Days Purchased|👑 730 VIP Days Purchased|Purchase at least 730 total days of VIP status.|vipDaysPurchased>=730",
    FiveStoreCoinsSpent = "VIP Store Spending|💸 5 Store Coins Spent|Spend at least 5 total coins in the VIP Store.|storeCoinsSpent>=5",
    TwentyFiveStoreCoinsSpent = "VIP Store Spending|💸 25 Store Coins Spent|Spend at least 25 total coins in the VIP Store.|storeCoinsSpent>=25",
    OneHundredStoreCoinsSpent = "VIP Store Spending|💸 100 Store Coins Spent|Spend at least 100 total coins in the VIP Store.|storeCoinsSpent>=100",
    TwoHundredFiftyStoreCoinsSpent = "VIP Store Spending|💸 250 Store Coins Spent|Spend at least 250 total coins in the VIP Store.|storeCoinsSpent>=250",
    FiveHundredStoreCoinsSpent = "VIP Store Spending|💸 500 Store Coins Spent|Spend at least 500 total coins in the VIP Store.|storeCoinsSpent>=500",
    OneThousandStoreCoinsSpent = "VIP Store Spending|💸 1,000 Store Coins Spent|Spend at least 1,000 total coins in the VIP Store.|storeCoinsSpent>=1000",
    TwoThousandFiveHundredStoreCoinsSpent = "VIP Store Spending|💸 2,500 Store Coins Spent|Spend at least 2,500 total coins in the VIP Store.|storeCoinsSpent>=2500",
    VIPClub = "VIP Status|👑 VIP Club|Have active VIP status at least once while achievements are enabled.|hasVIP=true",
    FirstCoinTransferSent = "Coins Sent|📤 First Coin Transfer Sent|Complete your first /givecoins transfer.|coinTransfersSent>=1",
    FiveCoinTransfersSent = "Coins Sent|📤 5 Coin Transfers Sent|Complete 5 /givecoins transfers.|coinTransfersSent>=5",
    TenCoinTransfersSent = "Coins Sent|📤 10 Coin Transfers Sent|Complete 10 /givecoins transfers.|coinTransfersSent>=10",
    TwentyFiveCoinTransfersSent = "Coins Sent|📤 25 Coin Transfers Sent|Complete 25 /givecoins transfers.|coinTransfersSent>=25",
    FiftyCoinTransfersSent = "Coins Sent|📤 50 Coin Transfers Sent|Complete 50 /givecoins transfers.|coinTransfersSent>=50",
    OneHundredCoinTransfersSent = "Coins Sent|📤 100 Coin Transfers Sent|Complete 100 /givecoins transfers.|coinTransfersSent>=100",
    FirstCoinTransferReceived = "Coins Received|📥 First Coin Transfer Received|Receive your first /givecoins transfer.|coinTransfersReceived>=1",
    FiveCoinTransfersReceived = "Coins Received|📥 5 Coin Transfers Received|Receive 5 /givecoins transfers.|coinTransfersReceived>=5",
    TenCoinTransfersReceived = "Coins Received|📥 10 Coin Transfers Received|Receive 10 /givecoins transfers.|coinTransfersReceived>=10",
    TwentyFiveCoinTransfersReceived = "Coins Received|📥 25 Coin Transfers Received|Receive 25 /givecoins transfers.|coinTransfersReceived>=25",
    FiftyCoinTransfersReceived = "Coins Received|📥 50 Coin Transfers Received|Receive 50 /givecoins transfers.|coinTransfersReceived>=50",
    OneHundredCoinTransfersReceived = "Coins Received|📥 100 Coin Transfers Received|Receive 100 /givecoins transfers.|coinTransfersReceived>=100",
    FirstCoinSent = "Coins Transferred Out|💸 First Coin Sent|Send at least 1 total coin with /givecoins.|coinsTransferredSent>=1",
    TenCoinsSent = "Coins Transferred Out|💸 10 Coins Sent|Send at least 10 total coins with /givecoins.|coinsTransferredSent>=10",
    FiftyCoinsSent = "Coins Transferred Out|💸 50 Coins Sent|Send at least 50 total coins with /givecoins.|coinsTransferredSent>=50",
    OneHundredCoinsSent = "Coins Transferred Out|💸 100 Coins Sent|Send at least 100 total coins with /givecoins.|coinsTransferredSent>=100",
    TwoHundredFiftyCoinsSent = "Coins Transferred Out|💸 250 Coins Sent|Send at least 250 total coins with /givecoins.|coinsTransferredSent>=250",
    FiveHundredCoinsSent = "Coins Transferred Out|💸 500 Coins Sent|Send at least 500 total coins with /givecoins.|coinsTransferredSent>=500",
    OneThousandCoinsSent = "Coins Transferred Out|💸 1,000 Coins Sent|Send at least 1,000 total coins with /givecoins.|coinsTransferredSent>=1000",
    TwoThousandFiveHundredCoinsSent = "Coins Transferred Out|💸 2,500 Coins Sent|Send at least 2,500 total coins with /givecoins.|coinsTransferredSent>=2500",
    FiveThousandCoinsSent = "Coins Transferred Out|💸 5,000 Coins Sent|Send at least 5,000 total coins with /givecoins.|coinsTransferredSent>=5000",
    FirstCoinReceived = "Coins Transferred In|🏦 First Coin Received|Receive at least 1 total coin through /givecoins.|coinsTransferredReceived>=1",
    TenCoinsReceived = "Coins Transferred In|🏦 10 Coins Received|Receive at least 10 total coins through /givecoins.|coinsTransferredReceived>=10",
    FiftyCoinsReceived = "Coins Transferred In|🏦 50 Coins Received|Receive at least 50 total coins through /givecoins.|coinsTransferredReceived>=50",
    OneHundredCoinsReceived = "Coins Transferred In|🏦 100 Coins Received|Receive at least 100 total coins through /givecoins.|coinsTransferredReceived>=100",
    TwoHundredFiftyCoinsReceived = "Coins Transferred In|🏦 250 Coins Received|Receive at least 250 total coins through /givecoins.|coinsTransferredReceived>=250",
    FiveHundredCoinsReceived = "Coins Transferred In|🏦 500 Coins Received|Receive at least 500 total coins through /givecoins.|coinsTransferredReceived>=500",
    OneThousandCoinsReceived = "Coins Transferred In|🏦 1,000 Coins Received|Receive at least 1,000 total coins through /givecoins.|coinsTransferredReceived>=1000",
    TwoThousandFiveHundredCoinsReceived = "Coins Transferred In|🏦 2,500 Coins Received|Receive at least 2,500 total coins through /givecoins.|coinsTransferredReceived>=2500",
    FiveThousandCoinsReceived = "Coins Transferred In|🏦 5,000 Coins Received|Receive at least 5,000 total coins through /givecoins.|coinsTransferredReceived>=5000",
    FirstCoinReplyAwardGiven = "Coin Reply Awards|🪙 First Coin Reply Award Given|Use the configured pointCommand reply-award command once.|coinReplyAwardsGiven>=1",
    FivePointCommandReplyAwardsGiven = "Coin Reply Awards|🪙 5 pointCommand Reply Awards Given|Give 5 pointCommand reply awards.|coinReplyAwardsGiven>=5",
    TenPointCommandReplyAwardsGiven = "Coin Reply Awards|🪙 10 pointCommand Reply Awards Given|Give 10 pointCommand reply awards.|coinReplyAwardsGiven>=10",
    TwentyFivePointCommandReplyAwardsGiven = "Coin Reply Awards|🪙 25 pointCommand Reply Awards Given|Give 25 pointCommand reply awards.|coinReplyAwardsGiven>=25",
    FiftyPointCommandReplyAwardsGiven = "Coin Reply Awards|🪙 50 pointCommand Reply Awards Given|Give 50 pointCommand reply awards.|coinReplyAwardsGiven>=50",
    OneHundredPointCommandReplyAwardsGiven = "Coin Reply Awards|🪙 100 pointCommand Reply Awards Given|Give 100 pointCommand reply awards.|coinReplyAwardsGiven>=100",
    TwoHundredFiftyPointCommandReplyAwardsGiven = "Coin Reply Awards|🪙 250 pointCommand Reply Awards Given|Give 250 pointCommand reply awards.|coinReplyAwardsGiven>=250",
    FiveHundredPointCommandReplyAwardsGiven = "Coin Reply Awards|🪙 500 pointCommand Reply Awards Given|Give 500 pointCommand reply awards.|coinReplyAwardsGiven>=500",
    FirstCoinReplyAwardReceived = "Coin Reply Awards|🎉 First Coin Reply Award Received|Receive a VIP-point + coin bundle through the configured pointCommand reply-award command.|coinReplyAwardsReceived>=1",
    FivePointCommandReplyAwardsReceived = "Coin Reply Awards|🎉 5 pointCommand Reply Awards Received|Receive 5 pointCommand reply awards.|coinReplyAwardsReceived>=5",
    TenPointCommandReplyAwardsReceived = "Coin Reply Awards|🎉 10 pointCommand Reply Awards Received|Receive 10 pointCommand reply awards.|coinReplyAwardsReceived>=10",
    TwentyFivePointCommandReplyAwardsReceived = "Coin Reply Awards|🎉 25 pointCommand Reply Awards Received|Receive 25 pointCommand reply awards.|coinReplyAwardsReceived>=25",
    FiftyPointCommandReplyAwardsReceived = "Coin Reply Awards|🎉 50 pointCommand Reply Awards Received|Receive 50 pointCommand reply awards.|coinReplyAwardsReceived>=50",
    OneHundredPointCommandReplyAwardsReceived = "Coin Reply Awards|🎉 100 pointCommand Reply Awards Received|Receive 100 pointCommand reply awards.|coinReplyAwardsReceived>=100",
    TwoHundredFiftyPointCommandReplyAwardsReceived = "Coin Reply Awards|🎉 250 pointCommand Reply Awards Received|Receive 250 pointCommand reply awards.|coinReplyAwardsReceived>=250",
    FiveHundredPointCommandReplyAwardsReceived = "Coin Reply Awards|🎉 500 pointCommand Reply Awards Received|Receive 500 pointCommand reply awards.|coinReplyAwardsReceived>=500",
    WellRounded = "Combined Challenges|🌈 Well Rounded|Reach 10 posts, 50 comments, 500 XP, 25 coins, and a 7-day streak.|posts>=10,comments>=50,xp>=500,coins>=25,longestStreak>=7",
    CommunityRegular = "Combined Challenges|🏘️ Community Regular|Reach 500 activities, 5,000 XP, and a 30-day streak.|activities>=500,xp>=5000,longestStreak>=30",
    CommunityPillar = "Combined Challenges|🏛️ Community Pillar|Reach 2,500 activities, 50,000 XP, 25 reputation, and a 100-day streak.|activities>=2500,xp>=50000,reputation>=25,longestStreak>=100",
    VIPBotVeteran = "Combined Challenges|🧓 VIPBot Veteran|Reach 5,000 activities, 100,000 XP, and a 180-day streak.|activities>=5000,xp>=100000,longestStreak>=180",
    GenerousSpirit = "Combined Challenges|💝 Generous Spirit|Give 25 VIP points and transfer 250 total coins to other users.|vipPointsGiven>=25,coinsTransferredSent>=250",
    CommunityBuilder = "Combined Challenges|❤️ Community Builder|Receive 25 VIP points, 5 nominations, and reach 10 reputation.|vipPointsReceived>=25,nominationsReceived>=5,reputation>=10",
    StoreRegular = "Combined Challenges|🛒 Store Regular|Complete 10 VIP Store purchases totaling at least 90 VIP days.|storePurchases>=10,vipDaysPurchased>=90",
    FullCircle = "Combined Challenges|🔄 Full Circle|Give 25 pointCommand reply awards and receive 25 pointCommand reply awards.|coinReplyAwardsGiven>=25,coinReplyAwardsReceived>=25",
    CommunityEconomist = "Combined Challenges|📊 Community Economist|Hold 1,000 coins, transfer 1,000 total coins out, and spend 500 coins in the VIP Store.|coins>=1000,coinsTransferredSent>=1000,storeCoinsSpent>=500",
    AllAroundVIP = "Combined Challenges|🌟 All-Around VIP|Reach 100 posts, 500 comments, 50,000 XP, a 30-day streak, 25 reputation, 25 VIP points received, 500 coins, and active VIP status.|posts>=100,comments>=500,xp>=50000,longestStreak>=30,reputation>=25,vipPointsReceived>=25,coins>=500,hasVIP",
    LevelThresholds = "1|0|Newcomer\n2|100|Supporter\n3|500|Bronze\n4|1500|Silver\n5|5000|Gold\n6|15000|Diamond\n7|50000|Elite\n8|100000|Platinum\n9|200000|Champion\n10|300000|Legend\n11|500000|Mythic\n12|1000000|A League Of Their Own",
    FlairFormatting = `Level {level}[#{place}] | Rank "{rank}" | {total}{symbol}`,
    UnflairedPostMessage = "Points cannot be awarded on posts without flair. Please award only on flaired posts.",
    OPOnlyDisallowedMessage = "Only moderators, approved users, and Post Authors (OPs) can award {name}s.",
    LeaderboardHelpPageMessage = "[How to award points with VIP Bot.]({helpPage})",
    DisallowedFlairMessage = "Points cannot be awarded on posts with this flair. Please choose another post.",
    UsersWhoCannotAwardPointsMessage = `You do not have permission to award VIP points to users. [Message The Mods]({modmailLink}) if you have any questions`,
    ModOnlyDisallowedMessage = "Only moderators allowed to award points.",
    ApprovedOnlyDisallowedMessage = "Only moderators and approved users can award points.",
    SelfAwardMessage = "You can't award yourself a {name}.",
    AutoSuperuserTemplate = "Hello {awardee},\n\n" +
        "Now that you have reached {threshold} points you can now use all commands yourself, even if normal users do not have permission to.",
    InitialMessageToRestrictedUsers = "***ATTENTION to OP:*** You must award at least {requirement} {name}s by replying to the successful comments." +
        " Valid command(s) are {commandsWithAnd}. Failure to do so may result in a ban.\n\n" +
        "*^ To hide text, write it like this `>!Text goes here!<` = >!Text goes here!<. [Reddit Markdown Guide]({markdownGuide})*.",
    PointAlreadyAwardedToUserMessage = "{awardee} has already received a {name} for this post.",
    ModAwardCommandSuccessMessage = "Moderator u/{awarder} gave an award! " +
        "u/{awardee} now has {total}{symbol} {name}s. {awardee}'s user page is located [here]({awardeePage}). " +
        "Leaderboard is located [here]({leaderboard}).",
    ModAwardCommandFailMessage = "Hello {awarder}. You must be a moderator or trusted user to use {command}.",
    ModAwardAlreadyGivenMessage = "{awardee} has already received a mod award for this comment.",
    UsernameLengthMessage = "u/{awardee} is not valid. Reddit usernames are between 3 and 21 characters long.",
    InvalidUsernameMessage = "Your target is not valid. Reddit usernames contain only letters, numbers, hyphens, and underscores.",
    NoUsernameMentionMessage = "You must mention a user (eg u/{awardee}) to award specific users.",
    RestrictionLiftedMessage = "Your posting restriction has been removed. You now have permission to make a post again in r/{subreddit}!",
    PostAuthorAwardMessage = "OPs cannot be awarded points.",
    TrustedUserAwardSuccessMessage = "Superuser u/{awarder} gave an award! u/{awardee} now has {total}{symbol} {name}s. " +
        "{awardee}'s user page is located [here]({awardeePage}). Leaderboard is located [here]({leaderboard}).",
    ModsAndPostAuthorDisallowedMessage = "Only moderators and Post Authors (OPs) can award {name}s.",
    UserPointsInitializedMessage = "Your {name} points have been initialized to 1. [Message the mods]({modmailLink}) if you have any questions.",
    NewPostMessage = "To all commentors/OP, if this is your first time experiencing u/vipbot2, " +
        "use `{prefix}info` to get information in your dms about how to use this bot.\n\n***NOTE: All commands are case-insensitive.***",
    DMInfoMessage = "Hey u/{username}!\n\nI see you are curious as to how to use me in r/{subreddit}.\n\n" +
        "Please use the `{prefix}help` command on [the post you used this on]({permalink}) to get another message listing all usable bot commands.",
    InfoMessageConfirmation = "I just sent you a dm with all the info about the bot itself.",
    NormalUserDMHelpMessage = "The commands available to you are:\n\n`{prefix}info`\n\n" +
        "`{prefix}help`\n\n`{prefix}profile`\n\n`{prefix}rank`\n\n`{prefix}rank u/<username>`\n\n`{prefix}balance`\n\n" +
        "`{prefix}achievements`\n\n`{prefix}leaderboard`\n\n`{prefix}leaderboard xp`\n\n`{prefix}leaderboard weeklyxp`\n\n" +
        "`{prefix}leaderboard monthlyxp`\n\n`{prefix}leaderboard coins`\n\n`{prefix}leaderboard rep`\n\n`{prefix}leaderboard level`\n\n" +
        "`{prefix}leaderboard streak`\n\n`{prefix}streak`\n\n`{prefix}vips`\n\n`{prefix}store [option]`\n\n`{prefix}nominate u/<username>`\n\n" +
        "`{prefix}givecoins u/<username> <amount>`\n\n`{prefix}{pointCommand}` Awards parent commenter {vipPoints} VIP point(s) + {coins} coin(s)",
    NormalUserHelpMessageConfirmation = "I just sent you a dm with all the info about the commands that you have access to with me.",
    ModDMHelpMessage = "The commands available to you are:\n\n`{prefix}info`\n\n" +
        "`{prefix}help`\n\n`{prefix}profile`\n\n`{prefix}rank`\n\n`{prefix}rank u/<username>`\n\n`{prefix}balance`\n\n" +
        "`{prefix}achievements`\n\n`{prefix}leaderboard [xp|weeklyxp|monthlyxp|coins|rep|level|streak]`\n\n" +
        "`{prefix}streak`\n\n`{prefix}vips`\n\n`{prefix}store [option]`\n\n`{prefix}nominate u/<username>`\n\n`{prefix}givecoins u/<username> <amount>`\n\n" +
        "`{prefix}{pointCommand}` Awards parent commenter {vipPoints} VIP point(s) + {coins} coin(s)\n\n" +
        "Moderator controls are available through post and comment context menus.\n\n" +
        "Use those menus to grant or remove VIP, set XP, set coins, set reputation, and manage the score for the user's flair.\n\n" +
        "Levels are derived from XP using the configured XP Level Thresholds and are not set independently.",
    HelpMessageConfirmation = "I just sent you a dm with all the info about the commands that you have access to with me.",
    BotFlairTextColor = "light",
    BotFlairBackgroundColor = "#00AA00",
    UserProfileSentMessage = "I just sent you a dm with {target}'s VIP Bot profile info.",
    AccountsThatWillNotBeManaged = "vipbot2\nAutoModerator",
    UserBecameSuperuserFromNominationsMessage = "userBecameSuperuserFromNominationsMessage",
}

export enum AutoSuperuserReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnAutoSuperuserReplyOptionChoices = [
    { label: "No Notification", value: AutoSuperuserReplyOptions.NoReply },
    {
        label: "Send user a private message",
        value: AutoSuperuserReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: AutoSuperuserReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnModOnlyDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnModOnlyDisallowedReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnModOnlyDisallowedReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnModOnlyDisallowedReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnModOnlyDisallowedReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnModAndPostAuthorDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnModAndPostAuthorDisallowedReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnModAndPostAuthorDisallowedReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnModAndPostAuthorDisallowedReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnModAndPostAuthorDisallowedReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnPostAuthorAwardReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export const NotifyOnPostAuthorAwardReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnPostAuthorAwardReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnPostAuthorAwardReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnPostAuthorAwardReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnApprovedOnlyDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnApprovedOnlyDisallowedReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnApprovedOnlyDisallowedReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnApprovedOnlyDisallowedReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnApprovedOnlyDisallowedReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnOPOnlyDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnOPOnlyDisallowedReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnOPOnlyDisallowedReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnOPOnlyDisallowedReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnOPOnlyDisallowedReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnDisallowedFlairReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnDisallowedFlairReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnDisallowedFlairReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnDisallowedFlairReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnDisallowedFlairReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnUnflairedPostReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnUnflairedPostReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnUnflairedPostReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnUnflairedPostReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnUnflairedPostReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnSelfAwardReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnSelfAwardReplyOptionChoices = [
    { label: "No Notification", value: NotifyOnSelfAwardReplyOptions.NoReply },
    {
        label: "Send user a private message",
        value: NotifyOnSelfAwardReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnSelfAwardReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnBlockedUserReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export const NotifyOnBlockedUserReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnBlockedUserReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnBlockedUserReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnBlockedUserReplyOptions.ReplyAsComment,
    },
];

export enum NotifyUsersWhoCannotAwardPointsReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyUsersWhoCannotAwardPointsReplyOptionChoices = [
    {
        label: "No Notification",
        value: NotifyUsersWhoCannotAwardPointsReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyUsersWhoCannotAwardPointsReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyUsersWhoCannotAwardPointsReplyOptions.ReplyAsComment,
    },
];

export enum LeaderboardMode {
    SubredditPermissions = "subredditpermissions",
    ModOnly = "modonly",
    ApprovedContributorsOnly = "approvedcontributorsonly",
    Off = "off",
    CurrentWikiSettings = "currentwikisettings",
}

const LeaderboardModeOptionChoices = [
    { label: "Off", value: LeaderboardMode.Off },
    {
        label: "Current Wiki Settings",
        value: LeaderboardMode.CurrentWikiSettings,
    },
    { label: "Mod Only", value: LeaderboardMode.ModOnly },
    {
        label: "Approved Contributors Only",
        value: LeaderboardMode.ApprovedContributorsOnly,
    },
    {
        label: "Default settings for wiki",
        value: LeaderboardMode.SubredditPermissions,
    },
];

export enum AccessControlOptions {
    ModsOnly = "moderators-only",
    ModsAndVIPS = "moderators-and-vips",
    ModsVIPSAndPostAuthor = "moderators-vips-and-op",
    ModsAndPostAuthor = "moderators-and-op",
    Everyone = "everyone",
}

const AccessControlOptionChoices = [
    {
        label: "Moderators Only",
        value: AccessControlOptions.ModsOnly,
    },
    {
        label: "Moderators and VIPS",
        value: AccessControlOptions.ModsAndVIPS,
    },
    {
        label: "Moderators and Post Author (OP)",
        value: AccessControlOptions.ModsAndPostAuthor,
    },
    {
        label: "Moderators, VIPS, and Post Author (OP)",
        value: AccessControlOptions.ModsVIPSAndPostAuthor,
    },
    {
        label: "Everyone",
        value: AccessControlOptions.Everyone,
    },
];

export enum NotifyOnPointAlreadyAwardedToUserReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnPointAlreadyAwardedToUserOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnPointAlreadyAwardedToUserReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnPointAlreadyAwardedToUserReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnPointAlreadyAwardedToUserReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnModAwardSuccessReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnModAwardSuccessOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnModAwardSuccessReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnModAwardSuccessReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnModAwardSuccessReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnTrustedUserAwardSuccessReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnTrustedUserAwardSuccessOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnTrustedUserAwardSuccessReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnTrustedUserAwardSuccessReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnTrustedUserAwardSuccessReplyOptions.ReplyAsComment,
    },
];

export enum NotifyOnModAwardFailReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const NotifyOnModAwardFailOptionChoices = [
    {
        label: "No Notification",
        value: NotifyOnModAwardFailReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: NotifyOnModAwardFailReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnModAwardFailReplyOptions.ReplyAsComment,
    },
];

export enum ExistingFlairOverwriteHandling {
    OverwriteNumericSymbol = "overwritenumericsymbol",
    OverwriteNumeric = "overwritenumeric",
    NeverSet = "neverset",
}

export type AchievementCategorySpec = {
    key: AppSetting;
    label: string;
    definitionCategory: string;
    allowedStats: readonly string[];
    statHelp: string;
    defaultValue: string;
};

/**
 * Achievement settings are grouped by the 22 user-facing achievement families.
 * Each family setting is a newline-delimited list: one achievement definition per line.
 * Every built-in line is sourced from a named TemplateDefaults.<AchievementName> constant.
 */
export const ACHIEVEMENT_CATEGORY_SPECS: readonly AchievementCategorySpec[] = [
    {
        key: AppSetting.Comment,
        label: "💬 Comments",
        definitionCategory: "Comments",
        allowedStats: ["comments"],
        statHelp: "comment count",
        defaultValue: [
            TemplateDefaults.FirstComment,
            TemplateDefaults.TenComments,
            TemplateDefaults.TwentyFiveComments,
            TemplateDefaults.FiftyComments,
            TemplateDefaults.OneHundredComments,
            TemplateDefaults.TwoHundredFiftyComments,
            TemplateDefaults.FiveHundredComments,
            TemplateDefaults.OneThousandComments,
            TemplateDefaults.TwoThousandFiveHundredComments,
            TemplateDefaults.FiveThousandComments,
        ].join("\n"),
    },
    {
        key: AppSetting.Post,
        label: "📝 Posts",
        definitionCategory: "Posts",
        allowedStats: ["posts"],
        statHelp: "post count",
        defaultValue: [
            TemplateDefaults.FirstPost,
            TemplateDefaults.FivePosts,
            TemplateDefaults.TenPosts,
            TemplateDefaults.TwentyFivePosts,
            TemplateDefaults.FiftyPosts,
            TemplateDefaults.OneHundredPosts,
            TemplateDefaults.TwoHundredFiftyPosts,
            TemplateDefaults.FiveHundredPosts,
            TemplateDefaults.OneThousandPosts,
        ].join("\n"),
    },
    {
        key: AppSetting.TotalActivity,
        label: "🧭 Total Activity",
        definitionCategory: "Total Activity",
        allowedStats: ["activities"],
        statHelp: "combined counted post/comment activity",
        defaultValue: [
            TemplateDefaults.TenActivities,
            TemplateDefaults.TwentyFiveActivities,
            TemplateDefaults.FiftyActivities,
            TemplateDefaults.OneHundredActivities,
            TemplateDefaults.TwoHundredFiftyActivities,
            TemplateDefaults.FiveHundredActivities,
            TemplateDefaults.OneThousandActivities,
            TemplateDefaults.TwoThousandFiveHundredActivities,
            TemplateDefaults.FiveThousandActivities,
            TemplateDefaults.TenThousandActivities,
        ].join("\n"),
    },
    {
        key: AppSetting.MixedActivity,
        label: "🎬 Mixed Activity",
        definitionCategory: "Mixed Activity",
        allowedStats: ["posts", "comments"],
        statHelp: "both post and comment activity",
        defaultValue: [TemplateDefaults.DoubleDebut].join("\n"),
    },
    {
        key: AppSetting.XP,
        label: "📈 XP",
        definitionCategory: "XP",
        allowedStats: ["xp"],
        statHelp: "XP",
        defaultValue: [
            TemplateDefaults.GettingStarted,
            TemplateDefaults.RisingStar,
            TemplateDefaults.SilverMomentum,
            TemplateDefaults.GoldStandard,
            TemplateDefaults.DiamondHands,
            TemplateDefaults.EliteStatus,
            TemplateDefaults.PlatinumPace,
            TemplateDefaults.Champion,
            TemplateDefaults.Legend,
            TemplateDefaults.Mythic,
            TemplateDefaults.ALeagueOfTheirOwn,
        ].join("\n"),
    },
    {
        key: AppSetting.Streak,
        label: "🔥 Streaks",
        definitionCategory: "Streaks",
        allowedStats: ["longestStreak"],
        statHelp: "longest activity streak in days",
        defaultValue: [
            TemplateDefaults.TwoDaySpark,
            TemplateDefaults.ThreeDayFlame,
            TemplateDefaults.WeekWarrior,
            TemplateDefaults.TwoWeekTrek,
            TemplateDefaults.MonthStrong,
            TemplateDefaults.SixtyStraight,
            TemplateDefaults.QuarterYearConsistency,
            TemplateDefaults.Unstoppable,
            TemplateDefaults.HalfYearHabit,
            TemplateDefaults.YearLong,
            TemplateDefaults.FiveHundredDayFire,
            TemplateDefaults.TwoYearsStrong,
            TemplateDefaults.ThreeYearsStrong,
        ].join("\n"),
    },
    {
        key: AppSetting.CoinBalance,
        label: "🪙 Coin Balance",
        definitionCategory: "Coin Balance",
        allowedStats: ["coins"],
        statHelp: "current VIP Coin balance",
        defaultValue: [
            TemplateDefaults.FirstCoin,
            TemplateDefaults.FiveCoins,
            TemplateDefaults.TenCoins,
            TemplateDefaults.TwentyFiveCoins,
            TemplateDefaults.FiftyCoins,
            TemplateDefaults.OneHundredCoins,
            TemplateDefaults.TwoHundredFiftyCoins,
            TemplateDefaults.FiveHundredCoins,
            TemplateDefaults.OneThousandCoins,
            TemplateDefaults.TwoThousandFiveHundredCoins,
            TemplateDefaults.FiveThousandCoins,
            TemplateDefaults.TenThousandCoins,
        ].join("\n"),
    },
    {
        key: AppSetting.Reputation,
        label: "⭐ Reputation",
        definitionCategory: "Reputation",
        allowedStats: ["reputation"],
        statHelp: "reputation",
        defaultValue: [
            TemplateDefaults.KnownAroundHere,
            TemplateDefaults.Recognized,
            TemplateDefaults.WellRegarded,
            TemplateDefaults.TrustedVoice,
            TemplateDefaults.CommunityStandout,
            TemplateDefaults.HighlyRegarded,
            TemplateDefaults.CommunityMainstay,
            TemplateDefaults.EsteemedMember,
            TemplateDefaults.CommunityIcon,
            TemplateDefaults.ReputationLegend,
        ].join("\n"),
    },
    {
        key: AppSetting.VIPPointsReceived,
        label: "💎 VIP Points Received",
        definitionCategory: "VIP Points Received",
        allowedStats: ["vipPointsReceived"],
        statHelp: "VIP points received",
        defaultValue: [
            TemplateDefaults.FirstVIPPoint,
            TemplateDefaults.FiveVIPPointsReceived,
            TemplateDefaults.TenVIPPointsReceived,
            TemplateDefaults.TwentyFiveVIPPointsReceived,
            TemplateDefaults.FiftyVIPPointsReceived,
            TemplateDefaults.OneHundredVIPPointsReceived,
            TemplateDefaults.TwoHundredFiftyVIPPointsReceived,
            TemplateDefaults.FiveHundredVIPPointsReceived,
            TemplateDefaults.OneThousandVIPPointsReceived,
            TemplateDefaults.TwoThousandFiveHundredVIPPointsReceived,
        ].join("\n"),
    },
    {
        key: AppSetting.VIPPointsGiven,
        label: "🎁 VIP Points Given",
        definitionCategory: "VIP Points Given",
        allowedStats: ["vipPointsGiven"],
        statHelp: "VIP points given",
        defaultValue: [
            TemplateDefaults.FirstVIPPointGiven,
            TemplateDefaults.FiveVIPPointsGiven,
            TemplateDefaults.TenVIPPointsGiven,
            TemplateDefaults.TwentyFiveVIPPointsGiven,
            TemplateDefaults.FiftyVIPPointsGiven,
            TemplateDefaults.OneHundredVIPPointsGiven,
            TemplateDefaults.TwoHundredFiftyVIPPointsGiven,
            TemplateDefaults.FiveHundredVIPPointsGiven,
            TemplateDefaults.OneThousandVIPPointsGiven,
            TemplateDefaults.TwoThousandFiveHundredVIPPointsGiven,
        ].join("\n"),
    },
    {
        key: AppSetting.NominationsReceived,
        label: "🤝 Nominations Received",
        definitionCategory: "Nominations Received",
        allowedStats: ["nominationsReceived"],
        statHelp: "nominations received",
        defaultValue: [
            TemplateDefaults.CommunityFavorite,
            TemplateDefaults.ThreeNominationsReceived,
            TemplateDefaults.FiveNominationsReceived,
            TemplateDefaults.TenNominationsReceived,
            TemplateDefaults.TwentyFiveNominationsReceived,
            TemplateDefaults.FiftyNominationsReceived,
            TemplateDefaults.OneHundredNominationsReceived,
            TemplateDefaults.TwoHundredFiftyNominationsReceived,
        ].join("\n"),
    },
    {
        key: AppSetting.NominationsMade,
        label: "🗳️ Nominations Made",
        definitionCategory: "Nominations Made",
        allowedStats: ["nominationsGiven"],
        statHelp: "nominations made",
        defaultValue: [
            TemplateDefaults.FirstNominationMade,
            TemplateDefaults.ThreeNominationsMade,
            TemplateDefaults.FiveNominationsMade,
            TemplateDefaults.TenNominationsMade,
            TemplateDefaults.TwentyFiveNominationsMade,
            TemplateDefaults.FiftyNominationsMade,
            TemplateDefaults.OneHundredNominationsMade,
        ].join("\n"),
    },
    {
        key: AppSetting.VIPStorePurchases,
        label: "🛍️ VIP Store Purchases",
        definitionCategory: "VIP Store Purchases",
        allowedStats: ["storePurchases"],
        statHelp: "successful VIP Store purchases",
        defaultValue: [
            TemplateDefaults.FirstVIPStorePurchase,
            TemplateDefaults.ThreeVIPStorePurchases,
            TemplateDefaults.FiveVIPStorePurchases,
            TemplateDefaults.TenVIPStorePurchases,
            TemplateDefaults.TwentyFiveVIPStorePurchases,
            TemplateDefaults.FiftyVIPStorePurchases,
        ].join("\n"),
    },
    {
        key: AppSetting.VIPDaysPurchased,
        label: "👑 VIP Days Purchased",
        definitionCategory: "VIP Days Purchased",
        allowedStats: ["vipDaysPurchased"],
        statHelp: "total VIP days purchased",
        defaultValue: [
            TemplateDefaults.FirstVIPDayPurchased,
            TemplateDefaults.SevenVIPDaysPurchased,
            TemplateDefaults.ThirtyVIPDaysPurchased,
            TemplateDefaults.NinetyVIPDaysPurchased,
            TemplateDefaults.OneHundredEightyVIPDaysPurchased,
            TemplateDefaults.ThreeHundredSixtyFiveVIPDaysPurchased,
            TemplateDefaults.SevenHundredThirtyVIPDaysPurchased,
        ].join("\n"),
    },
    {
        key: AppSetting.VIPStoreSpending,
        label: "💸 VIP Store Spending",
        definitionCategory: "VIP Store Spending",
        allowedStats: ["storeCoinsSpent"],
        statHelp: "total coins spent in the VIP Store",
        defaultValue: [
            TemplateDefaults.FiveStoreCoinsSpent,
            TemplateDefaults.TwentyFiveStoreCoinsSpent,
            TemplateDefaults.OneHundredStoreCoinsSpent,
            TemplateDefaults.TwoHundredFiftyStoreCoinsSpent,
            TemplateDefaults.FiveHundredStoreCoinsSpent,
            TemplateDefaults.OneThousandStoreCoinsSpent,
            TemplateDefaults.TwoThousandFiveHundredStoreCoinsSpent,
        ].join("\n"),
    },
    {
        key: AppSetting.VIPStatus,
        label: "👑 VIP Status",
        definitionCategory: "VIP Status",
        allowedStats: ["hasVIP"],
        statHelp: "active VIP status",
        defaultValue: [TemplateDefaults.VIPClub].join("\n"),
    },
    {
        key: AppSetting.CoinsSent,
        label: "📤 Coins Sent",
        definitionCategory: "Coins Sent",
        allowedStats: ["coinTransfersSent"],
        statHelp: "successful /givecoins transfers sent",
        defaultValue: [
            TemplateDefaults.FirstCoinTransferSent,
            TemplateDefaults.FiveCoinTransfersSent,
            TemplateDefaults.TenCoinTransfersSent,
            TemplateDefaults.TwentyFiveCoinTransfersSent,
            TemplateDefaults.FiftyCoinTransfersSent,
            TemplateDefaults.OneHundredCoinTransfersSent,
        ].join("\n"),
    },
    {
        key: AppSetting.CoinsReceived,
        label: "📥 Coins Received",
        definitionCategory: "Coins Received",
        allowedStats: ["coinTransfersReceived"],
        statHelp: "successful /givecoins transfers received",
        defaultValue: [
            TemplateDefaults.FirstCoinTransferReceived,
            TemplateDefaults.FiveCoinTransfersReceived,
            TemplateDefaults.TenCoinTransfersReceived,
            TemplateDefaults.TwentyFiveCoinTransfersReceived,
            TemplateDefaults.FiftyCoinTransfersReceived,
            TemplateDefaults.OneHundredCoinTransfersReceived,
        ].join("\n"),
    },
    {
        key: AppSetting.CoinsTransferredOut,
        label: "💸 Coins Transferred Out",
        definitionCategory: "Coins Transferred Out",
        allowedStats: ["coinsTransferredSent"],
        statHelp: "total coins sent through /givecoins",
        defaultValue: [
            TemplateDefaults.FirstCoinSent,
            TemplateDefaults.TenCoinsSent,
            TemplateDefaults.FiftyCoinsSent,
            TemplateDefaults.OneHundredCoinsSent,
            TemplateDefaults.TwoHundredFiftyCoinsSent,
            TemplateDefaults.FiveHundredCoinsSent,
            TemplateDefaults.OneThousandCoinsSent,
            TemplateDefaults.TwoThousandFiveHundredCoinsSent,
            TemplateDefaults.FiveThousandCoinsSent,
        ].join("\n"),
    },
    {
        key: AppSetting.CoinsTransferredIn,
        label: "🏦 Coins Transferred In",
        definitionCategory: "Coins Transferred In",
        allowedStats: ["coinsTransferredReceived"],
        statHelp: "total coins received through /givecoins",
        defaultValue: [
            TemplateDefaults.FirstCoinReceived,
            TemplateDefaults.TenCoinsReceived,
            TemplateDefaults.FiftyCoinsReceived,
            TemplateDefaults.OneHundredCoinsReceived,
            TemplateDefaults.TwoHundredFiftyCoinsReceived,
            TemplateDefaults.FiveHundredCoinsReceived,
            TemplateDefaults.OneThousandCoinsReceived,
            TemplateDefaults.TwoThousandFiveHundredCoinsReceived,
            TemplateDefaults.FiveThousandCoinsReceived,
        ].join("\n"),
    },
    {
        key: AppSetting.CoinReplyAwards,
        label: "🪙 Coin Reply Awards",
        definitionCategory: "Coin Reply Awards",
        allowedStats: ["coinReplyAwardsGiven", "coinReplyAwardsReceived"],
        statHelp: "pointCommand reply awards given or received",
        defaultValue: [
            TemplateDefaults.FirstCoinReplyAwardGiven,
            TemplateDefaults.FivePointCommandReplyAwardsGiven,
            TemplateDefaults.TenPointCommandReplyAwardsGiven,
            TemplateDefaults.TwentyFivePointCommandReplyAwardsGiven,
            TemplateDefaults.FiftyPointCommandReplyAwardsGiven,
            TemplateDefaults.OneHundredPointCommandReplyAwardsGiven,
            TemplateDefaults.TwoHundredFiftyPointCommandReplyAwardsGiven,
            TemplateDefaults.FiveHundredPointCommandReplyAwardsGiven,
            TemplateDefaults.FirstCoinReplyAwardReceived,
            TemplateDefaults.FivePointCommandReplyAwardsReceived,
            TemplateDefaults.TenPointCommandReplyAwardsReceived,
            TemplateDefaults.TwentyFivePointCommandReplyAwardsReceived,
            TemplateDefaults.FiftyPointCommandReplyAwardsReceived,
            TemplateDefaults.OneHundredPointCommandReplyAwardsReceived,
            TemplateDefaults.TwoHundredFiftyPointCommandReplyAwardsReceived,
            TemplateDefaults.FiveHundredPointCommandReplyAwardsReceived,
        ].join("\n"),
    },
    {
        key: AppSetting.CombinedChallenges,
        label: "🌟 Combined Challenges",
        definitionCategory: "Combined Challenges",
        allowedStats: [
            "comments",
            "posts",
            "activities",
            "xp",
            "coins",
            "reputation",
            "longestStreak",
            "vipPointsGiven",
            "vipPointsReceived",
            "nominationsGiven",
            "nominationsReceived",
            "storePurchases",
            "vipDaysPurchased",
            "storeCoinsSpent",
            "coinTransfersSent",
            "coinTransfersReceived",
            "coinsTransferredSent",
            "coinsTransferredReceived",
            "coinReplyAwardsGiven",
            "coinReplyAwardsReceived",
            "hasVIP",
        ],
        statHelp: "multiple VIPBot statistics",
        defaultValue: [
            TemplateDefaults.WellRounded,
            TemplateDefaults.CommunityRegular,
            TemplateDefaults.CommunityPillar,
            TemplateDefaults.VIPBotVeteran,
            TemplateDefaults.GenerousSpirit,
            TemplateDefaults.CommunityBuilder,
            TemplateDefaults.StoreRegular,
            TemplateDefaults.FullCircle,
            TemplateDefaults.CommunityEconomist,
            TemplateDefaults.AllAroundVIP,
        ].join("\n"),
    },
];

export const DEFAULT_ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_CATEGORY_SPECS.map(
    (spec) => spec.defaultValue
).join("\n");

export const appSettings: SettingsFormField[] = [
    {
        type: "group",
        label: "VIPBot Progression & Rewards",
        fields: [
            {
                type: "paragraph",
                name: AppSetting.LevelThresholds,
                label: "XP Level Thresholds",
                helpText: `Authoritative XP level configuration. Format: "<level>|<xp>|<rankName>" (for example, "2|100|Supporter"). Current level, next level, rank name, and XP-to-next-level are derived from this setting. Put one level on each line.`,
                defaultValue: TemplateDefaults.LevelThresholds,
                onValidate: levelThresholdIsValid,
            },
            {
                type: "boolean",
                name: AppSetting.XPEnabled,
                label: "Enable XP and Levels",
                helpText:
                    "Track XP from subreddit activity and derive levels from XP Level Thresholds.",
                defaultValue: true,
            },
            {
                type: "number",
                name: AppSetting.XPPerPost,
                label: "XP Per New Post",
                helpText:
                    "XP awarded when a user creates a new post. Set to 0 to disable post XP.",
                defaultValue: 10,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "number",
                name: AppSetting.XPPerComment,
                label: "XP Per New Comment",
                helpText:
                    "XP awarded when a user creates a new comment. Edited comments do not earn XP. Set to 0 to disable comment XP.",
                defaultValue: 2,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "boolean",
                name: AppSetting.CoinsEnabled,
                label: "Enable VIP Coins",
                defaultValue: true,
            },
            {
                type: "number",
                name: AppSetting.DailyCoinReward,
                label: "Daily Activity Coin Reward",
                helpText:
                    "Coins awarded once per UTC day when a user participates. Set to 0 to disable the daily coin reward.",
                defaultValue: 1,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "number",
                name: AppSetting.MaxCoinGiftAmount,
                label: "Maximum /givecoins Transfer",
                helpText:
                    "Maximum number of coins a user may transfer with /givecoins in one command. Set to 0 for no maximum.",
                defaultValue: 1000,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "string",
                name: AppSetting.PointCommand,
                label: "Point Reply Award Command",
                helpText:
                    "Command name without the configured prefix. When used as the entire body of a reply to another user's comment, the parent-comment author receives both the configured VIP-point award and the configured coin award. Example: vippoint becomes /vippoint with the default prefix.",
                defaultValue: TemplateDefaults.PointCommand,
                onValidate: rewardCommandIsValid,
            },
            {
                type: "number",
                name: AppSetting.PointCommandVIPPointAmount,
                label: "VIP Points Per Point Command",
                helpText:
                    "Number of VIP points awarded to the parent-comment author each time the configured pointCommand succeeds.",
                defaultValue: 1,
                onValidate: positiveWholeNumberFieldHasValidOption,
            },
            {
                type: "number",
                name: AppSetting.PointCommandCoinAmount,
                label: "Coins Per Point Command",
                helpText:
                    "Number of VIP Coins awarded to the parent-comment author each time the configured pointCommand succeeds.",
                defaultValue: 1,
                onValidate: positiveWholeNumberFieldHasValidOption,
            },
            {
                type: "boolean",
                name: AppSetting.ReputationEnabled,
                label: "Enable Reputation",
                defaultValue: true,
            },
            {
                type: "boolean",
                name: AppSetting.NominationsEnabled,
                label: "Enable VIP Nominations",
                defaultValue: true,
            },
            {
                type: "number",
                name: AppSetting.NominationReputationReward,
                label: "Reputation Per Nomination",
                helpText:
                    "Reputation added to a user when they receive a nomination. Set to 0 if nominations should not change reputation.",
                defaultValue: 1,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "number",
                name: AppSetting.NominationsToBecomeVipUser,
                label: "Nominations for a user to become a vip user",
                helpText:
                    "Amount of nominations necessary for a user to become a VIP. Set value to 0 to disable",
                defaultValue: 100,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "paragraph",
                name: AppSetting.UserBecameSuperuserFromNominationsMessage,
                label: "User became vip from nominations message",
                helpText:
                    "Message sent if a user becomes a vip from nominations and isn't already a VIP",
                defaultValue:
                    TemplateDefaults.UserBecameSuperuserFromNominationsMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "boolean",
                name: AppSetting.StreaksEnabled,
                label: "Enable Activity Streaks",
                defaultValue: true,
            },
            {
                type: "boolean",
                name: AppSetting.VIPEnabled,
                label: "Enable VIP Status",
                defaultValue: true,
            },
            {
                type: "boolean",
                name: AppSetting.AutoVIPEnabled,
                label: "Automatically Grant VIP From XP",
                defaultValue: false,
            },
            {
                type: "number",
                name: AppSetting.AutoVIPXPThreshold,
                label: "Automatic VIP XP Threshold",
                helpText:
                    "Users at or above this XP amount can automatically receive VIP when automatic VIP is enabled.",
                defaultValue: 50000,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "number",
                name: AppSetting.DefaultVIPDurationDays,
                label: "Default VIP Duration (Days)",
                helpText:
                    "Default duration for automatic VIP grants and the moderator VIP context-menu form. Use 0 for permanent VIP.",
                defaultValue: 0,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "boolean",
                name: AppSetting.AuditLoggingEnabled,
                label: "Enable VIPBot Audit Logging",
                helpText:
                    "Store important VIPBot actions such as VIP changes, moderator stat changes, nominations, and coin transfers.",
                defaultValue: true,
            },
        ],
    },
    {
        type: "group",
        label: "Achievements",
        fields: [
            {
                type: "boolean",
                name: AppSetting.AchievementsEnabled,
                label: "Enable Achievements",
                helpText:
                    "Automatically evaluate and permanently unlock configured VIPBot achievements.",
                defaultValue: true,
            },
            ...ACHIEVEMENT_CATEGORY_SPECS.map(
                (spec): SettingsFormField => ({
                    type: "paragraph",
                    name: spec.key,
                    label: spec.label,
                    helpText:
                        `Configure ${spec.label} achievements here. Put EACH achievement on its own NEW LINE. ` +
                        `Format every line as "<category>|<name>|<description>|<requirements>". ` +
                        `This category is evaluated from ${spec.statHelp}. Requirements are comma-separated AND conditions. ` +
                        `Do not put two achievement definitions on the same line. At least one valid achievement is required for this category.`,
                    defaultValue: spec.defaultValue,
                    onValidate: (event) =>
                        achievementCategorySettingIsValid(event, spec),
                })
            ),
        ],
    },
    {
        type: "group",
        label: "VIP Store Settings",
        fields: [
            {
                type: "boolean",
                name: AppSetting.VIPStoreEnabled,
                label: "Enable VIP Store",
                helpText:
                    "Allow users to spend VIP Coins on temporary VIP status with the /store command.",
                defaultValue: true,
            },
            {
                type: "paragraph",
                name: AppSetting.VIPStoreOptions,
                label: "VIP Store Duration / Cost Options",
                helpText:
                    `Configure at least one store option per line using "<optionNumber>|<coinCost>|<duration>".` +
                    `\nUnits are case-sensitive: S = second, m = minute, H = hour, D = day, W = week, M = month, Y = year.` +
                    `\nExamples: "1|5|1D", "2|24|1W", "3|90|1M", etc.` +
                    `\nUsers purchase by option number shown by /store.`,
                defaultValue: TemplateDefaults.VIPStoreOptions,
                onValidate: vipStoreOptionsAreValid,
            },
        ],
    },
    {
        type: "group",
        label: "Managed Flair / Legacy Point System Settings",
        fields: [
            {
                type: "select",
                name: AppSetting.AccessControl,
                label: "Who can award points?",
                helpText: "Choose who is allowed to award points",
                options: AccessControlOptionChoices,
                defaultValue: [AccessControlOptions.ModsAndVIPS],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "string",
                name: AppSetting.CommandPrefix,
                label: "Command Prefix",
                helpText: `What all commands should start with (eg "/")`,
                defaultValue: "/",
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                name: AppSetting.CSSClass,
                type: "string",
                label: "CSS class to use for points flairs",
                helpText:
                    "Optional. Please choose either a CSS class or flair template, not both",
            },
            {
                name: AppSetting.FlairTemplate,
                type: "string",
                label: "Flair template ID to use for points flairs",
                helpText:
                    "Optional. Please choose either a CSS class or flair template, not both",
                onValidate: isFlairTemplateValid,
            },
            {
                type: "number",
                name: AppSetting.PostIncrement,
                label: "Increment User Score When Posting",
                helpText:
                    "How much to increment a user's score by when they make a new post. Set to 0 to disable",
                defaultValue: 0,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "number",
                name: AppSetting.CommentIncrement,
                label: "Increment User Score When Commenting",
                helpText:
                    "How much to increment a user's score by when they make a new comment. Set to 0 to disable",
                defaultValue: 0,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "string",
                name: AppSetting.FlairFormatting,
                label: "Flair Formatting (All placeholders allow single or double curly braces)",
                helpText:
                    "How the flair should be formatted. Placeholders Supported: place, total, symbol, level, rank",
                defaultValue: TemplateDefaults.FlairFormatting,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "boolean",
                name: AppSetting.AllowUnflairedPosts,
                label: "Allow awarding points on unflaired posts?",
                defaultValue: true,
            },
            {
                type: "select",
                name: AppSetting.NotifyOnUnflairedPost,
                label: "Notify users when they try to award points on a post without flair if it's not allowed",
                options: NotifyOnUnflairedPostReplyOptionChoices,
                defaultValue: [
                    NotifyOnUnflairedPostReplyOptions.ReplyAsComment,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.UnflairedPostMessage,
                label: "Unflaired post message (All placeholders allow single or double curly braces)",
                helpText:
                    "Message shown when a user tries to award points on a post without flair. Placeholders Supported: name",
                defaultValue: TemplateDefaults.UnflairedPostMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                name: AppSetting.NotifyOnPointAlreadyAwardedToUser,
                type: "select",
                label: "Notify on point already awarded to user",
                helpText:
                    "How to notify the user when they try to use the normal command on a user who has already received a point for that comment",
                options: NotifyOnPointAlreadyAwardedToUserOptionChoices,
                defaultValue: [
                    NotifyOnPointAlreadyAwardedToUserReplyOptions.ReplyAsComment,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                name: AppSetting.PointAlreadyAwardedToUserMessage,
                type: "paragraph",
                label: "Message to send users when they use the Normal Award Command, but the comment author has already received a point for the comment (All placeholders allow single or double curly braces)",
                helpText: "Placeholders Supported: awarder, awardee, name",
                defaultValue: TemplateDefaults.PointAlreadyAwardedToUserMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                name: AppSetting.NotifyOnPostAuthorAward,
                type: "select",
                label: "Notify on post author award",
                helpText:
                    "How to notify the user when they try to award a point to the Post Author (OP)",
                options: NotifyOnPostAuthorAwardReplyOptionChoices,
                defaultValue: [
                    NotifyOnPostAuthorAwardReplyOptions.ReplyAsComment,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                name: AppSetting.PostAuthorAwardMessage,
                type: "paragraph",
                label: "Message to send when someone tries to award the Post Author (OP)",
                defaultValue: TemplateDefaults.PostAuthorAwardMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "string",
                name: AppSetting.PointName,
                label: "Point Name",
                helpText:
                    "Singular form of the name shown in award messages, like 'point', 'kudo', etc. Lowercase is recommended",
                defaultValue: "point",
            },
            {
                type: "string",
                name: AppSetting.PointSymbol,
                label: "Point Symbol",
                helpText:
                    "Optional emoji or character to show alongside point totals. Leave empty for no symbol",
            },
            {
                type: "select",
                name: AppSetting.NotifyOnModOnlyDisallowed,
                label: "Notify users when only moderators can award points",
                options: NotifyOnModOnlyDisallowedReplyOptionChoices,
                defaultValue: [
                    NotifyOnModOnlyDisallowedReplyOptions.ReplyAsComment,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.ModOnlyDisallowedMessage,
                label: "Mod Only Disallowed Message",
                helpText:
                    "Message shown when a user tries to award a point but only moderators can award points",
                defaultValue: TemplateDefaults.ModOnlyDisallowedMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "select",
                name: AppSetting.NotifyOnModsAndPostAuthorDisallowed,
                label: "Notify users when only moderators and the Post Author (OP) can award points",
                options: NotifyOnModAndPostAuthorDisallowedReplyOptionChoices,
                defaultValue: [
                    NotifyOnModAndPostAuthorDisallowedReplyOptions.NoReply,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.ModsAndPostAuthorDisallowedMessage,
                label: "Mods and Post Author Disallowed Message",
                helpText:
                    "Message shown when a user tries to award a point but only moderators and the Post Author (OP) can award points",
                defaultValue:
                    TemplateDefaults.ModsAndPostAuthorDisallowedMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "select",
                name: AppSetting.NotifyOnApprovedOnlyDisallowed,
                label: "Notify users when only moderators and approved users can award points",
                options: NotifyOnApprovedOnlyDisallowedReplyOptionChoices,
                defaultValue: [
                    NotifyOnApprovedOnlyDisallowedReplyOptions.NoReply,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.ApprovedOnlyDisallowedMessage,
                label: "Approved Only Disallowed Message",
                helpText:
                    "Message shown when a user tries to award a point but only mods and approved users can award points",
                defaultValue: TemplateDefaults.ApprovedOnlyDisallowedMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "select",
                name: AppSetting.NotifyOnOPOnlyDisallowed,
                label: "Notify Users When Only OP, Approved Users, And Moderators Can Award Points",
                options: NotifyOnOPOnlyDisallowedReplyOptionChoices,
                defaultValue: [
                    NotifyOnOPOnlyDisallowedReplyOptions.ReplyAsComment,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.OPOnlyDisallowedMessage,
                label: "OP Only Disallowed Message",
                helpText:
                    "Message shown when a user tries to award a point but only mods, approved users, and Post Authors (OPs) can award points",
                defaultValue: TemplateDefaults.OPOnlyDisallowedMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "select",
                name: AppSetting.NotifyOnDisallowedFlair,
                label: "Notify users when they try to award points on a post with a disallowed flair",
                options: NotifyOnDisallowedFlairReplyOptionChoices,
                defaultValue: [
                    NotifyOnDisallowedFlairReplyOptions.ReplyAsComment,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.DisallowedFlairs,
                label: "Disallowed Flairs",
                helpText:
                    "Flairs where points cannot be awarded. Each flair should be on a new line",
            },
            {
                type: "paragraph",
                name: AppSetting.DisallowedFlairMessage,
                label: "Disallowed Flair Message",
                helpText:
                    "Message shown when a user tries to award points on a post with a disallowed flair",
                defaultValue: TemplateDefaults.DisallowedFlairMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
        ],
    },
    {
        type: "group",
        label: "Moderator/Trusted User Settings",
        fields: [
            {
                type: "paragraph",
                name: AppSetting.VIPUsers,
                label: "A list of trusted users other than mods who can award points",
                helpText: "Each username should be on a new line",
            },
            {
                type: "select",
                name: AppSetting.NotifyOnAutoSuperuser,
                label: "Notify users who reach the auto trusted user threshold",
                options: NotifyOnAutoSuperuserReplyOptionChoices,
                multiSelect: false,
                defaultValue: [AutoSuperuserReplyOptions.ReplyByPM],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "number",
                name: AppSetting.AutoSuperuserThreshold,
                label: "Treat users with this many points as automatically a trusted user",
                helpText:
                    "If zero, only explicitly named users above will be treated as trusted users",
                defaultValue: 0,
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "paragraph",
                name: AppSetting.AutoSuperuserTemplate,
                label: "Message sent when a user reaches the trusted user threshold (All placeholders allow single or double curly braces)",
                helpText: "Placeholders Supported: name, threshold, command",
                defaultValue: TemplateDefaults.AutoSuperuserTemplate,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "select",
                label: "Notify on trusted user award success",
                name: AppSetting.NotifyOnTrustedUserAwardSuccess,
                options: NotifyOnTrustedUserAwardSuccessOptionChoices,
                defaultValue: [
                    NotifyOnTrustedUserAwardSuccessReplyOptions.NoReply,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.TrustedUserAwardSuccessMessage,
                label: "Trusted User Award Success Message (All placeholders allow single or double curly braces)",
                helpText: `Optional. Message to send users when a trusted user awards a point. Placeholders Supported: awardeePage, awarderPage, awardee, awarder, symbol, total, name, leaderboard`,
                defaultValue: TemplateDefaults.TrustedUserAwardSuccessMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                name: AppSetting.NotifyOnModAwardSuccess,
                type: "select",
                label: "Notify on mod award success",
                helpText:
                    "How to notify users when a moderator or trusted user awards a point",
                options: NotifyOnModAwardSuccessOptionChoices,
                defaultValue: [
                    NotifyOnModAwardSuccessReplyOptions.ReplyAsComment,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                name: AppSetting.ModAwardCommandSuccess,
                type: "paragraph",
                label: "Mod Award Success Message (All placeholders allow single or double curly braces)",
                helpText: `Optional. Message to send users when they successfully award a message with the "Trusted User/Mod award command". Placeholders Supported: awardeePage, awarderPage, awardee, awarder, symbol, total, name, leaderboard`,
                defaultValue: TemplateDefaults.ModAwardCommandSuccessMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                name: AppSetting.NotifyOnModAwardFail,
                type: "select",
                label: "Notify on mod award fail",
                helpText: `Applicable to both "Mod Award Fail Message" and "Message to send user when the "Trusted User/Mod award command" has already been used on the comment."`,
                options: NotifyOnModAwardFailOptionChoices,
                defaultValue: [NotifyOnModAwardFailReplyOptions.ReplyAsComment],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                name: AppSetting.ModAwardCommandFailMessage,
                type: "paragraph",
                label: "Mod Award Fail Message (All placeholders allow single or double curly braces)",
                helpText: `Optional. Message to send users when they aren't allowed to use the "Trusted User/Mod award command". Placeholders Supported: command, name, awarder, awardee`,
                defaultValue: TemplateDefaults.ModAwardCommandFailMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                name: AppSetting.ModAwardAlreadyGivenMessage,
                type: "paragraph",
                label: `Message to send user when the "Trusted User/Mod award command" has already been used on the comment (All placeholders allow single or double curly braces)`,
                helpText:
                    "Optional. Placeholders Supported: awarder, awardee, name",
                defaultValue: TemplateDefaults.ModAwardAlreadyGivenMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
        ],
    },
    {
        type: "group",
        label: "Bot Management Settings",
        fields: [
            {
                type: "string",
                name: AppSetting.BotFlairText,
                label: "Bot Flair Text (All placeholders allow single or double curly braces)",
                helpText: "Placeholders Supported: prefix",
                defaultValue: "VIP Bot | {prefix}info",
            },
            {
                type: "string",
                name: AppSetting.BotFlairBackgroundColor,
                label: "Bot Flair Background Color",
                helpText: "Must be a valid hex id (eg #00AA00)",
                defaultValue: "#00AA00",
                onValidate: flairHexIsValid,
            },
            {
                type: "select",
                name: AppSetting.BotFlairTextColor,
                label: "Bot Flair Text Color",
                options: [
                    {
                        label: "White Text",
                        value: "light",
                    },
                    {
                        label: "Black Text",
                        value: "dark",
                    },
                ],
                defaultValue: ["light"],
                onValidate: selectFieldHasOptionChosen,
            },
        ],
    },
    {
        type: "group",
        label: "Notification Settings",
        fields: [
            {
                type: "paragraph",
                name: AppSetting.NewPostMessage,
                label: "New Post Message",
                helpText:
                    "Message displayed on every new post and pinned by bot",
                defaultValue: TemplateDefaults.NewPostMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "paragraph",
                name: AppSetting.DMInfoMessage,
                label: "DM Info Message",
                helpText: `Message to be dmed to a user any time they run the "info" command`,
                defaultValue: TemplateDefaults.DMInfoMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "select",
                name: AppSetting.NotifyOnSelfAward,
                label: "Notify users when they try to award themselves",
                options: NotifyOnSelfAwardReplyOptionChoices,
                defaultValue: [NotifyOnSelfAwardReplyOptions.ReplyAsComment],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "select",
                name: AppSetting.NotifyUsersWhoCannotAwardPoints,
                label: "Notify a user if they are not allowed to award points",
                options: NotifyUsersWhoCannotAwardPointsReplyOptionChoices,
                defaultValue: [
                    NotifyUsersWhoCannotAwardPointsReplyOptions.NoReply,
                ],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.UsersWhoCannotAwardPoints,
                label: "Users Who Cannot Award Points",
                helpText:
                    "List of usernames who cannot award points, even if they are mods or approved users. Each username should be on a new line",
            },
            {
                type: "select",
                name: AppSetting.NotifyOnBlockedUser,
                label: "How to notify users when they are blocked from awarding points",
                options: NotifyOnBlockedUserReplyOptionChoices,
                defaultValue: [NotifyOnBlockedUserReplyOptions.ReplyAsComment],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.UsersWhoCannotAwardPointsMessage,
                label: "User Cannot Award Points Message (All placeholders allow single or double curly braces)",
                helpText: `Message shown when a user specified in the "Users Who Cannot Award Points" setting tries to award points but is not allowed to. Placeholders Supported: name`,
                defaultValue: TemplateDefaults.UsersWhoCannotAwardPointsMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
        ],
    },
    {
        type: "group",
        label: "Misc Settings",
        fields: [
            {
                type: "paragraph",
                name: AppSetting.AccountsThatWillNotBeManaged,
                label: "Ignored Accounts",
                helpText:
                    "Accounts that will not be managed by VIP Bot. No u/",
                defaultValue: TemplateDefaults.AccountsThatWillNotBeManaged,
            },
            {
                name: AppSetting.LeaderboardMode,
                type: "select",
                label: "Wiki Leaderboard Mode",
                options: LeaderboardModeOptionChoices,
                multiSelect: false,
                defaultValue: [LeaderboardMode.CurrentWikiSettings],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                name: AppSetting.LeaderboardSize,
                type: "number",
                label: "Leaderboard Size",
                helpText:
                    "Number of users to show on the leaderboard (1-1,000)",
                defaultValue: 50,
                onValidate: leaderboardSizeIsValid,
            },
            {
                //DiscordServerLink
                name: AppSetting.DiscordServerLink,
                type: "string",
                label: "Discord Server Link",
                helpText:
                    "Optional. Link to your subreddit's discord server. A non-expiring link is recommended.",
            },
            {
                name: AppSetting.LeaderboardName,
                type: "string",
                label: "Leaderboard Wiki Name",
                helpText:
                    "Name of the wiki page for your subreddit's leaderboard (e.g. leaderboard). Singular form is recommended as there is only one leaderboard per subreddit",
                defaultValue: "leaderboard",
                onValidate: ({ value }) => {
                    if (!value || value.trim() === "") {
                        return "You must specify a wiki page name";
                    }
                },
            },
            {
                name: AppSetting.PointSystemHelpPage,
                type: "string",
                label: "Point System Help Page",
                helpText:
                    "Optional. Name of the wiki page for explaining your subreddit's point system (e.g. pointsystem).",
            },
        ],
    },
    {
        type: "group",
        label: "Summary Message Settings",
        fields: [
            {
                type: "boolean",
                label: "Create a new Modmail conversation for each summary",
                name: AppSetting.DigestNewMessageEachDay,
                helpText:
                    "If enabled, a new modmail conversation will be created for each summary message. If disabled, the bot will reply to the previous summary message when sending a new summary.",
                defaultValue: true,
            },
            {
                type: "select",
                label: "Frequency of summary messages",
                name: AppSetting.DigestFrequency,
                helpText:
                    "Choose how often you would like to receive the summary messages",
                options: [
                    { label: "Daily", value: "Daily" },
                    { label: "Weekly", value: "Weekly" },
                ],
                multiSelect: false,
                defaultValue: ["Weekly"],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "boolean",
                label: "Send summary to the 'Mod Notifications' section of modmail",
                helpText:
                    "If set, the daily digest will be sent to the 'Mod Notifications' section of modmail, otherwise it will go into the main inbox.",
                name: AppSetting.DigestAsModNotification,
                defaultValue: false,
            },
        ],
    },
    {
        type: "group",
        label: "Upgrade Notification Settings",
        fields: [
            {
                type: "boolean",
                label: "Upgrade notifications",
                name: AppSetting.UpgradeNotifier,
                helpText:
                    "Receive a message when a new version of VIPBot is released. This is currently a placeholder",
                defaultValue: true,
            },
        ],
        // },
    },
];

function isFlairTemplateValid(event: SettingsFormFieldValidatorEvent<string>) {
    const flairTemplateRegex =
        /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/gi;
    if (event.value && !flairTemplateRegex.test(event.value)) {
        return "Invalid flair template ID";
    }
}

function selectFieldHasOptionChosen(
    event: SettingsFormFieldValidatorEvent<string[]>
) {
    if (!event.value || event.value.length !== 1) {
        return "You must choose an option";
    }
}

// 🧮 Validate "Awards Required To Create New Posts"
export function numberFieldHasValidOption(
    event: SettingsFormFieldValidatorEvent<number>
) {
    if (typeof event.value !== "number" || isNaN(event.value)) {
        return "Value must be a number";
    }

    if (event.value < 0) {
        return "Value must be 0 or greater";
    }
}

function stringOrParagraphFieldContainsText(
    event: SettingsFormFieldValidatorEvent<string>,
    _context: TriggerContext
) {
    if (typeof event.value !== "string") {
        return "Value must be a string";
    }

    if (event.value.length === 0) {
        return "Field cannot be empty";
    }
}

export function positiveWholeNumberFieldHasValidOption(
    event: SettingsFormFieldValidatorEvent<number>
) {
    if (typeof event.value !== "number" || !Number.isSafeInteger(event.value)) {
        return "Value must be a whole number";
    }

    if (event.value < 1) {
        return "Value must be 1 or greater";
    }
}

export function leaderboardSizeIsValid(
    event: SettingsFormFieldValidatorEvent<number>
) {
    if (typeof event.value !== "number" || isNaN(event.value)) {
        return "Value must be a number";
    }

    if (event.value < 1 || event.value > 1000) {
        return "Value must be between 1 and 1,000";
    }
}

function levelThresholdIsValid(event: SettingsFormFieldValidatorEvent<string>) {
    if (typeof event.value !== "string" || event.value.trim().length === 0) {
        return "You must specify at least one level threshold";
    }

    const lines = event.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const parsed: { level: number; xp: number; name: string }[] = [];

    for (const line of lines) {
        const match = line.match(/^(\d+)\|(\d+)\|(.+)$/);
        if (!match) {
            return `Each level threshold must be formatted as "<level>|<xp>|<rankName>"`;
        }

        const level = Number(match[1]);
        const xp = Number(match[2]);
        const name = match[3]?.trim() ?? "";

        if (!Number.isSafeInteger(level) || level < 1) {
            return "Level numbers must be positive whole numbers";
        }
        if (!Number.isSafeInteger(xp) || xp < 0) {
            return "XP thresholds must be non-negative whole numbers";
        }
        if (!name) {
            return "Every level must have a rank name";
        }

        parsed.push({ level, xp, name });
    }

    parsed.sort((a, b) => a.level - b.level);
    if (parsed[0]?.level !== 1 || parsed[0]?.xp !== 0) {
        return "Level 1 must exist and must require 0 XP";
    }

    for (let i = 1; i < parsed.length; i++) {
        const current = parsed[i]!;
        const previous = parsed[i - 1]!;

        if (current.level <= previous.level) {
            return "Level numbers must be unique and increase";
        }
        if (current.xp <= previous.xp) {
            return "XP thresholds must strictly increase with each level";
        }
    }
}

export type VIPStoreDurationUnit = "S" | "m" | "H" | "D" | "W" | "M" | "Y";

export type VIPStoreOption = {
    order: number;
    duration: number;
    unit: VIPStoreDurationUnit;
    durationToken: string;
    cost: number;
    label: string;
};

export function parseVIPStoreDurationToken(
    value: string
): { duration: number; unit: VIPStoreDurationUnit; token: string } | undefined {
    const match = value.trim().match(/^(\d+)(S|m|H|D|W|M|Y)$/);
    if (!match) return undefined;

    const duration = Number(match[1]);
    const unit = match[2] as VIPStoreDurationUnit;

    if (!Number.isSafeInteger(duration) || duration <= 0) return undefined;

    return {
        duration,
        unit,
        token: `${duration}${unit}`,
    };
}

export function formatVIPStoreDuration(
    duration: number,
    unit: VIPStoreDurationUnit
): string {
    const names: Record<VIPStoreDurationUnit, string> = {
        S: "second",
        m: "minute",
        H: "hour",
        D: "day",
        W: "week",
        M: "month",
        Y: "year",
    };
    const name = names[unit];
    return `${duration} ${name}${duration === 1 ? "" : "s"}`;
}

export function parseVIPStoreOptions(raw: string): VIPStoreOption[] {
    if (typeof raw !== "string") return [];

    const options: VIPStoreOption[] = [];
    const seenOrders = new Set<number>();
    const seenDurations = new Set<string>();

    for (const line of raw
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)) {
        const match = line.match(/^(\d+)\|(\d+)\|([^|]+)$/);
        if (!match) continue;

        const order = Number(match[1]);
        const cost = Number(match[2]);
        const durationToken = match[3]?.trim() ?? "";
        const parsedDuration = parseVIPStoreDurationToken(durationToken);

        if (
            !Number.isSafeInteger(order) ||
            order <= 0 ||
            !Number.isSafeInteger(cost) ||
            cost <= 0 ||
            !parsedDuration ||
            seenOrders.has(order) ||
            seenDurations.has(parsedDuration.token)
        ) {
            continue;
        }

        seenOrders.add(order);
        seenDurations.add(parsedDuration.token);
        options.push({
            order,
            duration: parsedDuration.duration,
            unit: parsedDuration.unit,
            durationToken: parsedDuration.token,
            cost,
            label: formatVIPStoreDuration(
                parsedDuration.duration,
                parsedDuration.unit
            ),
        });
    }

    return options.sort((a, b) => a.order - b.order || a.cost - b.cost);
}

function vipStoreOptionsAreValid(
    event: SettingsFormFieldValidatorEvent<string>
) {
    if (typeof event.value !== "string" || event.value.trim().length === 0) {
        return "You must specify at least one VIP store option";
    }

    const lines = event.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const seenOrders = new Set<number>();
    const seenDurations = new Set<string>();

    if (!lines.length) {
        return "You must specify at least one VIP store option";
    }

    for (const line of lines) {
        const match = line.match(/^(\d+)\|(\d+)\|([^|]+)$/);
        if (!match) {
            return `Each VIP store option must be formatted as "<optionNumber>|<coinCost>|<duration>"`;
        }

        const order = Number(match[1]);
        const cost = Number(match[2]);
        const durationToken = match[3]?.trim() ?? "";
        const parsedDuration = parseVIPStoreDurationToken(durationToken);

        if (!Number.isSafeInteger(order) || order <= 0) {
            return "VIP store option order values must be positive whole numbers";
        }
        if (seenOrders.has(order)) {
            return "VIP store option order values must be unique";
        }
        if (!Number.isSafeInteger(cost) || cost <= 0) {
            return "VIP store costs must be positive whole numbers of coins";
        }
        if (!parsedDuration) {
            return 'VIP store duration must be the final argument and use a positive whole number followed by one case-sensitive unit: S, m, H, D, W, M, or Y. Examples: "30S", "15m", "6H", "1D", "1W", "1M", "1Y"';
        }
        if (seenDurations.has(parsedDuration.token)) {
            return "VIP store durations must be unique";
        }

        seenOrders.add(order);
        seenDurations.add(parsedDuration.token);
    }

    if (parseVIPStoreOptions(event.value).length !== lines.length) {
        return "Every VIP store line must be a valid, unique store option";
    }
}

export const ACHIEVEMENT_NUMERIC_STATS = [
    "comments",
    "posts",
    "activities",
    "xp",
    "coins",
    "reputation",
    "longestStreak",
    "vipPointsGiven",
    "vipPointsReceived",
    "nominationsGiven",
    "nominationsReceived",
    "storePurchases",
    "vipDaysPurchased",
    "storeCoinsSpent",
    "coinTransfersSent",
    "coinTransfersReceived",
    "coinsTransferredSent",
    "coinsTransferredReceived",
    "coinReplyAwardsGiven",
    "coinReplyAwardsReceived",
] as const;

export type AchievementNumericStat = (typeof ACHIEVEMENT_NUMERIC_STATS)[number];
export type AchievementRequirement =
    | { stat: AchievementNumericStat; minimum: number }
    | { stat: "hasVIP"; expected: boolean };

export type ConfiguredAchievement = {
    category: string;
    name: string;
    description: string;
    requirements: AchievementRequirement[];
};

const ACHIEVEMENT_NUMERIC_STAT_SET = new Set<string>(ACHIEVEMENT_NUMERIC_STATS);

function parseAchievementRequirements(
    raw: string
): AchievementRequirement[] | undefined {
    const requirements: AchievementRequirement[] = [];
    const tokens = raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    if (!tokens.length) return undefined;

    for (const token of tokens) {
        if (/^hasVIP(?:=true)?$/i.test(token)) {
            requirements.push({ stat: "hasVIP", expected: true });
            continue;
        }
        if (/^hasVIP=false$/i.test(token)) {
            requirements.push({ stat: "hasVIP", expected: false });
            continue;
        }

        const match = token.match(/^([A-Za-z][A-Za-z0-9]*)>=(\d+)$/);
        if (!match) return undefined;

        const stat = match[1] ?? "";
        const minimum = Number(match[2]);
        if (
            !ACHIEVEMENT_NUMERIC_STAT_SET.has(stat) ||
            !Number.isSafeInteger(minimum) ||
            minimum < 0
        ) {
            return undefined;
        }

        requirements.push({
            stat: stat as AchievementNumericStat,
            minimum,
        });
    }

    return requirements;
}

export function parseAchievementDefinitions(
    raw: string
): ConfiguredAchievement[] {
    if (typeof raw !== "string") return [];

    const achievements: ConfiguredAchievement[] = [];
    const seenNames = new Set<string>();

    for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        const parts = line.split("|");
        if (parts.length !== 4) continue;

        const [categoryRaw, nameRaw, descriptionRaw, requirementsRaw] = parts;
        const category = categoryRaw?.trim() ?? "";
        const name = nameRaw?.trim() ?? "";
        const description = descriptionRaw?.trim() ?? "";
        const requirements = parseAchievementRequirements(
            requirementsRaw?.trim() ?? ""
        );
        const normalizedName = name.toLowerCase();

        if (
            !category ||
            !name ||
            !description ||
            !requirements?.length ||
            seenNames.has(normalizedName)
        ) {
            continue;
        }

        seenNames.add(normalizedName);
        achievements.push({ category, name, description, requirements });
    }

    return achievements;
}

function achievementCategorySettingIsValid(
    event: SettingsFormFieldValidatorEvent<string>,
    spec: AchievementCategorySpec
) {
    if (typeof event.value !== "string") {
        return `${spec.label} achievement definitions must be text`;
    }

    const lines = event.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) {
        return `${spec.label} must contain at least one valid achievement. Put each achievement on its own new line.`;
    }

    const seenNames = new Set<string>();
    const allowedStats = new Set(spec.allowedStats);

    for (const [index, line] of lines.entries()) {
        const parts = line.split("|");
        if (parts.length !== 4) {
            return `Line ${index + 1} in ${
                spec.label
            } must use "<category>|<name>|<description>|<requirements>". Put each new achievement on a new line.`;
        }

        const [categoryRaw, nameRaw, descriptionRaw, requirementsRaw] = parts;
        const category = categoryRaw?.trim() ?? "";
        const name = nameRaw?.trim() ?? "";
        const description = descriptionRaw?.trim() ?? "";
        const requirementsText = requirementsRaw?.trim() ?? "";

        if (!category || !name || !description || !requirementsText) {
            return `Line ${index + 1} in ${
                spec.label
            } must include a category, name, description, and requirements.`;
        }

        if (category.toLowerCase() !== spec.definitionCategory.toLowerCase()) {
            return `Line ${
                index + 1
            } belongs to "${category}", but this setting only accepts the "${
                spec.definitionCategory
            }" category.`;
        }

        const requirements = parseAchievementRequirements(requirementsText);
        if (!requirements?.length) {
            return `Invalid requirements on line ${
                index + 1
            } for "${name}". Use comma-separated AND conditions such as comments>=10,xp>=500 or hasVIP=true.`;
        }

        for (const requirement of requirements) {
            if (!allowedStats.has(requirement.stat)) {
                return `"${name}" uses ${requirement.stat}, but ${spec.label} achievements must be based on ${spec.statHelp}.`;
            }
        }

        const normalizedName = name.toLowerCase();
        if (seenNames.has(normalizedName)) {
            return `Duplicate achievement name "${name}" in ${spec.label}.`;
        }
        seenNames.add(normalizedName);
    }

    const parsed = parseAchievementDefinitions(lines.join("\n"));
    if (parsed.length !== lines.length) {
        return `${spec.label} contains an invalid achievement. Put one valid achievement on each new line.`;
    }
}

function rewardCommandIsValid(event: SettingsFormFieldValidatorEvent<string>) {
    if (typeof event.value !== "string") {
        return "Command must be text";
    }

    const command = event.value.trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,32}$/.test(command)) {
        return "Command must be 1-32 letters, numbers, underscores, or hyphens, without the command prefix";
    }

    const reserved = new Set([
        "info",
        "help",
        "profile",
        "rank",
        "balance",
        "achievements",
        "leaderboard",
        "streak",
        "vips",
        "nominate",
        "givecoins",
        "store",
    ]);

    if (reserved.has(command)) {
        return `"${command}" is reserved by a built-in VIPBot command`;
    }
}

function flairHexIsValid(event: SettingsFormFieldValidatorEvent<string>) {
    if (typeof event.value !== "string") {
        return "Value must be a string.";
    }

    if (event.value.length === 0) {
        return "Field cannot be empty";
    }

    if (!/^#[0-9a-f]{6}$/i.test(event.value)) {
        return `Field must contain a valid hex value (# is required)`;
    }
}
