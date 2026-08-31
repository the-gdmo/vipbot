import {
    SettingsFormField,
    SettingsFormFieldValidatorEvent,
    TriggerContext,
} from "@devvit/public-api";

export enum AppSetting {
    FlairFormatting = "flairFormatting",
    LeaderboardSize = "leaderboardSize",
    UsersWhoCannotAwardPoints = "usersWhoCannotAwardPoints",
    notifyOnNormalAwardFail = "notifyOnNormalAwardFail",
    UsersWhoCannotAwardPointsMessage = "usersWhoCannotAwardPointsMessage",
    PointName = "pointName",
    NotifyOnNormalAwardSuccess = "notifyOnNormalAwardSuccess",
    NormalAwardSuccessMessage = "normalAwardSuccessMessage",
}

export enum notifyOnNormalAwardFailReplyOptions {
    NoReply = "none",
    ReplyByPM = "replybypm",
    ReplyAsComment = "replybycomment",
}

const notifyOnNormalAwardFailOptionChoices = [
    {
        label: "No Notification",
        value: notifyOnNormalAwardFailReplyOptions.NoReply,
    },
    {
        label: "Send user a private message",
        value: notifyOnNormalAwardFailReplyOptions.ReplyByPM,
    },
    {
        label: "Reply as comment",
        value: notifyOnNormalAwardFailReplyOptions.ReplyAsComment,
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
                name: AppSetting.FlairFormatting,
                label: "Flair Formatting (All placeholders allow single or double curly braces)",
                helpText:
                    "The format for displaying flair information. Placeholders Supported: total, symbol, place",
                defaultValue: "{total}{symbol} | #{place}",
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
                name: AppSetting.notifyOnNormalAwardFail,
                label: "Notify users when they are not allowed to award VIP points",
                helpText: "",
                options: notifyOnNormalAwardFailOptionChoices,
                defaultValue: [
                    notifyOnNormalAwardFailReplyOptions.ReplyByPM,
                ],
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
                defaultValue: `You do not have permission to award VIP points to users. [Message The Mods]({modmailLink}) if you have any questions.`,
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
