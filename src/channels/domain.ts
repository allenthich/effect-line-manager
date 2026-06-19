import { Schema } from "effect";
import { NonEmptyTrimmedString } from "../shared/domain.ts";
import {
  LineChannelId,
  LineChannelRecordId,
  LineLoginChannelId as BaseLineLoginChannelId,
  LoginChannel,
  MessagingChannel,
} from "../channel/domain.ts";

export const LineMessagingChannelUid = LineChannelRecordId;
export type LineMessagingChannelUid = typeof LineMessagingChannelUid.Type;

export const LineLoginChannelUid = LineChannelRecordId;
export type LineLoginChannelUid = typeof LineLoginChannelUid.Type;

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
