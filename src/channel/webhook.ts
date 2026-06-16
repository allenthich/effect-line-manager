/**
 * Supported webhook event subset:
 * - Text message events
 * - Follow events
 * - Unfollow events
 * - Postback events
 *
 * Intentional SDK differences vs @line/bot-sdk 11.0.1:
 * - EventBase.deliveryContext: SDK requires it; local subset omits it.
 * - EventBase.source: SDK makes it optional; local subset requires it.
 * - UserSource.userId: SDK makes it optional; local subset requires it.
 * - Text messages: SDK includes quoteToken, emojis, mention, quotedMessageId, markAsReadToken; local subset keeps only id, type, text.
 * - FollowEvent: SDK includes follow.isUnblocked; local subset omits it.
 * - PostbackEvent.replyToken: SDK makes it optional; local subset requires it.
 * - Only text message, follow, unfollow, and postback events are supported. All other SDK event/message types are intentionally rejected.
 *
 * This is a stable external boundary. Do not widen without a separate design decision.
 */

import { Schema } from "effect";

export const LineUserSource = Schema.Struct({
  type: Schema.Literal("user"),
  userId: Schema.String,
});

export const LineGroupSource = Schema.Struct({
  type: Schema.Literal("group"),
  groupId: Schema.String,
  userId: Schema.optional(Schema.String),
});

export const LineRoomSource = Schema.Struct({
  type: Schema.Literal("room"),
  roomId: Schema.String,
  userId: Schema.optional(Schema.String),
});

export const LineEventSource = Schema.Union([LineUserSource, LineGroupSource, LineRoomSource]);

export const LineTextMessageEvent = Schema.Struct({
  type: Schema.Literal("message"),
  replyToken: Schema.String,
  source: LineEventSource,
  timestamp: Schema.Finite,
  mode: Schema.Literals(["active", "standby"]),
  webhookEventId: Schema.String,
  message: Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("text"),
    text: Schema.String,
  }),
});

export const LineFollowEvent = Schema.Struct({
  type: Schema.Literal("follow"),
  replyToken: Schema.String,
  source: LineEventSource,
  timestamp: Schema.Finite,
  mode: Schema.Literals(["active", "standby"]),
  webhookEventId: Schema.String,
});

export const LineUnfollowEvent = Schema.Struct({
  type: Schema.Literal("unfollow"),
  source: LineEventSource,
  timestamp: Schema.Finite,
  mode: Schema.Literals(["active", "standby"]),
  webhookEventId: Schema.String,
});

export const LinePostbackEvent = Schema.Struct({
  type: Schema.Literal("postback"),
  replyToken: Schema.String,
  source: LineEventSource,
  timestamp: Schema.Finite,
  mode: Schema.Literals(["active", "standby"]),
  webhookEventId: Schema.String,
  postback: Schema.Struct({
    data: Schema.String,
    params: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  }),
});

export const LineWebhookEvent = Schema.Union([
  LineTextMessageEvent,
  LineFollowEvent,
  LineUnfollowEvent,
  LinePostbackEvent,
]);

export const LineWebhookRequestBody = Schema.Struct({
  destination: Schema.String,
  events: Schema.Array(LineWebhookEvent),
});
