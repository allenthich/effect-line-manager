import { Schema } from "effect";
import {
  LineChannelId,
  LineLoginChannelId as BaseLineLoginChannelId,
  type LoginChannel,
  type MessagingChannel,
} from "../channel/domain.ts";
import { NonEmptyTrimmedString } from "../shared/domain.ts";

export const LineMessagingChannelId = LineChannelId;
export type LineMessagingChannelId = typeof LineMessagingChannelId.Type;

export const LineLoginChannelId = BaseLineLoginChannelId;
export type LineLoginChannelId = typeof LineLoginChannelId.Type;

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
