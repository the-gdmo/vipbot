import { TriggerContext, User } from "@devvit/public-api";

//------------------------
// Flair Setting Toggle
//------------------------
export async function flairToggleKeyExists(
    context: TriggerContext,
    userObj: User | undefined,
): Promise<number | undefined> {
    if (!userObj) return;
    const flairToggleKey = `flairToggle:${userObj.username}`;
    return await context.redis.exists(flairToggleKey);
}
export async function getFlairToggleKey(
    userObj: User | undefined,
): Promise<string> {
    if (!userObj) return "";
    return `flairToggle:${userObj.username}`;
}
export async function deleteFlairToggleKey(
    userObj: User | undefined,
    context: TriggerContext,
) {
    const flairToggleKey = await getFlairToggleKey(userObj);
    await context.redis.del(flairToggleKey);
}
export async function setFlairToggleKey(
    userObj: User | undefined,
    context: TriggerContext,
    value: string,
) {
    const flairToggleKey = await getFlairToggleKey(userObj);
    await context.redis.set(flairToggleKey, value);
}