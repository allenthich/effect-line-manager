import { Schema } from "effect";
import { type LoginChannel, type MessagingChannel } from "../channel/domain.ts";
import { NonEmptyTrimmedString } from "../shared/domain.ts";

// Re-export the shared channel ID brands so consumers of the channels module
// can import them from a single locality. Pure re-export (not re-aliasing)
// keeps the runtime identity stable and avoids TS2308 collisions at the root.
export { LineMessagingChannelId, LineLoginChannelId } from "../channel/domain.ts";

export const LineBotUserId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineBotUserId"),
);
export type LineBotUserId = typeof LineBotUserId.Type;

export type LineMessagingChannel = MessagingChannel;
export type LineLoginChannel = LoginChannel;

export const isLineMessagingChannel = (
  channel: MessagingChannel | LoginChannel,
): channel is MessagingChannel => channel.channelType === "messaging";

export const isLineLoginChannel = (
  channel: MessagingChannel | LoginChannel,
): channel is LoginChannel => channel.channelType === "login";
