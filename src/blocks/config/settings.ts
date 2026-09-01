import {
    SettingsFormField,
    SettingsFormFieldValidatorEvent,
    TriggerContext,
} from "@devvit/public-api";

export enum AppSetting {
    PointTriggerWords = "pointTriggerWords",
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
    ModAwardCommand = "modAwardCommand",
    SuperUsers = "superUsers",
    NotifyOnAutoSuperuser = "notifyOnAutoSuperuser",
    AutoSuperuserThreshold = "autoSuperuserThreshold",
    AutoSuperuserTemplate = "autoSuperuserTemplate",
    NotifyOnTrustedUserAwardSuccess = "notifyOnTrustedUserAwardSuccess",
    TrustedUserAwardSuccessMessage = "trustedUserAwardSuccessMessage",
    NotifyOnModAwardSuccess = "notifyOnModAwardSuccess",
    ModAwardCommandSuccess = "modAwardCommandSuccess",
    NotifyOnModAwardFail = "notifyOnModAwardFail",
    ModAwardCommandFail = "modAwardCommandFail",
    ModAwardAlreadyGiven = "modAwardAlreadyGiven",
    UserPointsInitializedMessage = "UserPointsInitializedMessage",
}

export enum TemplateDefaults {
    FlairFormatting = "{total}{symbol} | #{place}",
    UnflairedPostMessage = "Points cannot be awarded on posts without flair. Please award only on flaired posts.",
    OPOnlyDisallowedMessage = "Only moderators, approved users, and Post Authors (OPs) can award {name}s.",
    LeaderboardHelpPageMessage = "[How to award points with VIP Bot.]({helpPage})",
    DisallowedFlairMessage = "Points cannot be awarded on posts with this flair. Please choose another post.",
    UsersWhoCannotAwardPointsMessage = `You do not have permission to award VIP points to users. [Message The Mods]({modmailLink}) if you have any questions.`,
    ModOnlyDisallowedMessage = "Only moderators allowed to award points.",
    ApprovedOnlyDisallowedMessage = "Only moderators and approved users can award points.",
    SelfAwardMessage = "You can't award yourself a {name}.",
    BotAwardMessage = "You can't award u/{awardee} {name}s.",
    SelfAwardTemplate = "Hello {awarder}, you cannot award a {name} to yourself.",
    NotifyOnNormalAwardSuccessTemplate = "+1 {name} awarded to u/{awardee} by u/{awarder}. Total: {total}{symbol}. {awardee}'s user page is located [here]({awardeePage}). Leaderboard is located [here]({leaderboard}).",
    NotifyOnSuperuserTemplate = "Hello {awardee},\n\nNow that you have reached {threshold} points you can now award points yourself, even if normal users do not have permission to. Please use the command `{command}` if you'd like to do this.",
    InitialMessageToRestrictedUsers = "***ATTENTION to OP:*** You must award at least {requirement} {name}s by replying to the successful comments. Valid command(s) are {commandsWithAnd}. Failure to do so may result in a ban.\n\n*^ To hide text, write it like this `>!Text goes here!<` = >!Text goes here!<. [Reddit Markdown Guide]({markdownGuide})*.",
    PointAlreadyAwardedToUserMessage = "{awardee} has already received a {name} for this post.",
    ModAwardCommandSuccessMessage = "Moderator u/{awarder} gave an award! u/{awardee} now has {total}{symbol} {name}s. {awardee}'s user page is located [here]({awardeePage}). Leaderboard is located [here]({leaderboard}).",
    ModAwardCommandFailMessage = "Hello {awarder}. You must be a moderator or trusted user to use {command}.",
    ModAwardAlreadyGivenMessage = "{awardee} has already received a mod award for this comment.",
    UsernameLengthMessage = "u/{awardee} is not valid. Reddit usernames are between 3 and 21 characters long.",
    InvalidUsernameMessage = "Your target is not valid. Reddit usernames contain only letters, numbers, hyphens, and underscores.",
    NoUsernameMentionMessage = "You must mention a user (eg u/{awardee}) to award specific users.",
    RestrictionLiftedMessage = "Your posting restriction has been removed. You now have permission to make a post again in r/{subreddit}!",
    PostAuthorAwardMessage = "OPs cannot be awarded points.",
    TrustedUserAwardSuccessMessage = "Superuser u/{awarder} gave an award! u/{awardee} now has {total}{symbol} {name}s. {awardee}'s user page is located [here]({awardeePage}). Leaderboard is located [here]({leaderboard}).",
    ModsAndPostAuthorDisallowedMessage = "Only moderators and Post Authors (OPs) can award {name}s.",
    UserPointsInitializedMessage = "Your {name} points have been initialized to 1. [Message the mods]({modmailLink}) if you have any questions.",
}

export enum AutoSuperuserReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnModOnlyDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnModAndPostAuthorDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnPostAuthorAwardReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnApprovedOnlyDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnOPOnlyDisallowedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnDisallowedFlairReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnUnflairedPostReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnSuccessReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum PointAwardedReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnSelfAwardReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnBlockedUserReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyUsersWhoCannotAwardPointsReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnBotAwardReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum LeaderboardMode {
    SubredditPermissions = "subredditpermissions",
    ModOnly = "modonly",
    ApprovedContributorsOnly = "approvedcontributorsonly",
    Off = "off",
    CurrentWikiSettings = "currentwikisettings",
}

export enum AccessControlOptions {
    ModsOnly = "moderators-only",
    ModsAndSuperusers = "moderators-and-superusers",
    ModsSuperusersAndPostAuthor = "moderators-superusers-and-op",
    ModsAndPostAuthor = "moderators-and-op",
    Everyone = "everyone",
}

export enum NotifyOnPointAlreadyAwardedToUserReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnModAwardSuccessReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnTrustedUserAwardSuccessReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

export enum NotifyOnModAwardFailReplyOptions {
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

const NotifyOnBotAwardReplyOptionChoices = [
    {
        label: "Send user a private message",
        value: NotifyOnBotAwardReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnBotAwardReplyOptions.ReplyAsComment,
    },
];

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

const NotifyOnSuccessReplyOptionChoices = [
    { label: "No Notification", value: NotifyOnSuccessReplyOptions.NoReply },
    {
        label: "Send user a private message",
        value: NotifyOnSuccessReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: NotifyOnSuccessReplyOptions.ReplyAsComment,
    },
];

const AccessControlOptionChoices = [
    {
        label: "Moderators Only",
        value: AccessControlOptions.ModsOnly,
    },
    {
        label: "Moderators and Superusers",
        value: AccessControlOptions.ModsAndSuperusers,
    },
    {
        label: "Moderators and Post Author (OP)",
        value: AccessControlOptions.ModsAndPostAuthor,
    },
    {
        label: "Moderators, Superusers, and Post Author (OP)",
        value: AccessControlOptions.ModsSuperusersAndPostAuthor,
    },
    {
        label: "Everyone",
        value: AccessControlOptions.Everyone,
    },
];

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

export const appSettings: SettingsFormField[] = [
    // === POINT SYSTEM ===
    {
        type: "group",
        label: "General Settings",
        helpText: "",
        fields: [
            {
                type: "select",
                name: AppSetting.AccessControl,
                label: "Who can award points?",
                helpText: "Choose who is allowed to award points",
                options: AccessControlOptionChoices,
                defaultValue: [AccessControlOptions.ModsAndSuperusers],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.PointTriggerWords,
                label: "Trigger Words",
                helpText:
                    "List of trigger words users can type to award points (e.g., !award, .point). Each command should be on a new line.",
                defaultValue: "!award\n.award",
                onValidate: validateTriggerWords,
            },
            {
                type: "string",
                name: AppSetting.PointName,
                label: "VIP Point Name",
                helpText:
                    "What you want the VIP point to be called. It is recmommended to keep this lowercase",
                defaultValue: "trophy",
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                type: "string",
                name: AppSetting.PointSymbol,
                label: "Point Symbol",
                helpText: "Optional emoji or character to show alongside point totals. Leave empty for no symbol",
            },
            {
                type: "string",
                name: AppSetting.FlairFormatting,
                label: "Flair Formatting (All placeholders allow single or double curly braces)",
                helpText:
                    "The format for displaying flair information. Placeholders Supported: total, symbol, place",
                defaultValue: TemplateDefaults.FlairFormatting,
                onValidate: stringOrParagraphFieldContainsText,
            },
        ],
    },
    {
        type: "group",
        label: "User Settings",
        helpText: "User specific settings",
        fields: [
            {
                type: "select",
                name: AppSetting.NotifyOnNormalAwardFail,
                label: "Notify users when they are not allowed to award VIP points",
                helpText: "",
                options: NotifyOnBlockedUserReplyOptionChoices,
                defaultValue: [NotifyOnBlockedUserReplyOptions.ReplyByPM],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "paragraph",
                name: AppSetting.UsersWhoCannotAwardPoints,
                label: "Users Who Cannot Award Points",
                helpText:
                    "A list of users who aren't allowed to award VIP points, each username should be on a new line (no 'u/')",
            },
            {
                type: "paragraph",
                name: AppSetting.UsersWhoCannotAwardPointsMessage,
                label: "Users Who Cannot Be Awarded Points Message (All placeholders allow single or double curly braces)",
                helpText:
                    "Message to send users if they aren't allowed to award VIP Points. Placeholders Supported: modmailLink",
                defaultValue: TemplateDefaults.UsersWhoCannotAwardPointsMessage,
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
                name: AppSetting.SuperUsers,
                label: "A list of trusted users other than mods who can award points",
                helpText: "Each username should be on a new line",
            },
            {
                name: AppSetting.ModAwardCommand,
                type: "string",
                label: "Trusted User/Mod award command",
                helpText:
                    "Optional. Alternate command for mods and trusted users to award reputation points",
                defaultValue: "!modaward",
                onValidate: validateModTriggerCommand,
            },
            {
                type: "select",
                name: AppSetting.NotifyOnAutoSuperuser,
                label: "Notify users who reach the auto trusted user threshold",
                options: NotifyOnAutoSuperuserReplyOptionChoices,
                multiSelect: false,
                defaultValue: [AutoSuperuserReplyOptions.NoReply],
                onValidate: selectFieldHasOptionChosen,
            },
            {
                type: "number",
                name: AppSetting.AutoSuperuserThreshold,
                label: "Treat users with this many points as automatically a trusted user",
                helpText:
                    "If zero, only explicitly named users above will be treated as trusted users",
                onValidate: numberFieldHasValidOption,
            },
            {
                type: "paragraph",
                name: AppSetting.AutoSuperuserTemplate,
                label: "Message sent when a user reaches the trusted user threshold (All placeholders allow single or double curly braces)",
                helpText: "Placeholders Supported: name, threshold, command",
                defaultValue: TemplateDefaults.NotifyOnSuperuserTemplate,
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
                defaultValue: [NotifyOnModAwardSuccessReplyOptions.NoReply],
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
                helpText: "",
                options: NotifyOnModAwardFailOptionChoices,
                onValidate: selectFieldHasOptionChosen,
            },
            {
                name: AppSetting.ModAwardCommandFail,
                type: "paragraph",
                label: "Mod Award Fail Message (All placeholders allow single or double curly braces)",
                helpText: `Optional. Message to send users when they aren't allowed to use the "Trusted User/Mod award command". Placeholders Supported: command, name, awarder, awardee`,
                defaultValue: TemplateDefaults.ModAwardCommandFailMessage,
                onValidate: stringOrParagraphFieldContainsText,
            },
            {
                name: AppSetting.ModAwardAlreadyGiven,
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
        label: "Misc Settings",
        helpText: "Settings that don't fall under any other category",
        fields: [
            {
                type: "number",
                name: AppSetting.LeaderboardSize,
                label: "Wiki Leaderboard Size",
                helpText: `How many people to display on the "Leaderboard Wiki Page". Set to 0 to disable`,
                defaultValue: 50,
                onValidate: numberFieldHasValidOption,
            },
        ],
    },
];

function isFlairTemplateValid(event: SettingsFormFieldValidatorEvent<string>) {
    const flairTemplateRegex = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){4}[0-9a-f]{8}$/gi;
    if (event.value && !flairTemplateRegex.test(event.value)) {
        return "Invalid flair template ID";
    }
}

function selectFieldHasOptionChosen(
    event: SettingsFormFieldValidatorEvent<string[]>,
) {
    if (!event.value || event.value.length !== 1) {
        return "You must choose an option (even if this is an irrelevant setting)";
    }
}

function validateTriggerWords(event: SettingsFormFieldValidatorEvent<string>) {
    if (!event.value || event.value.trim() === "") {
        return "You must specify at least one trigger word";
    }
    const lines = event.value.split("\n").map((line) => line.trim());
    if (lines.length === 0 || lines.some((line) => line === "")) {
        return "You must specify at least one trigger word";
    }

    if (!lines.some((line) => line.match(/^[\x20-\x7E]+$/gim))) {
        return "Trigger words may only contain characters that exist on a standard computer keyboard";
    }
}

function validateModTriggerCommand(
    event: SettingsFormFieldValidatorEvent<string>,
) {
    if (!event.value || event.value.trim() === "") {
        return "You must specify a command (even if you don't intend to use it)";
    }
    if (!event.value.match(/^[\x20-\x7E]+$/gi)) {
        return "Command may only contain characters that exist on a standard computer keyboard";
    }
}

// 🧮 Validate "Awards Required To Create New Posts"
export function numberFieldHasValidOption(
    event: SettingsFormFieldValidatorEvent<number>,
) {
    if (typeof event.value !== "number" || isNaN(event.value)) {
        return "Value must be a number.";
    }

    if (event.value < 0) {
        return "Value must be greater than 0.";
    }
    if (event.value > 10_000) {
        return "Value must be less than 10,000";
    }
}

function stringOrParagraphFieldContainsText(
    event: SettingsFormFieldValidatorEvent<string>,
    _context: TriggerContext,
): string | void {
    if (typeof event.value !== "string") {
        return "Value must be a string.";
    }

    if (event.value.length === 0) {
        return "Field cannot be empty (even if this is an irrelevant setting).";
    }
}
