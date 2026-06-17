/**
 * LINE Messaging API message type schemas.
 *
 * These define the outbound message types supported by the LINE Messaging API.
 * Extracted from the messaging client to allow independent consumption (e.g.
 * for webhook handling or message construction without importing the HTTP client).
 */

import { Schema } from "effect";

export const LineEmoji = Schema.Struct({
  index: Schema.Number,
  productId: Schema.String,
  emojiId: Schema.String,
});

export type LineEmoji = typeof LineEmoji.Type;

export const LineQuickReplyItem = Schema.Struct({
  type: Schema.optional(Schema.Literal("action")),
  action: Schema.Unknown,
  imageUrl: Schema.optional(Schema.String),
});

export type LineQuickReplyItem = typeof LineQuickReplyItem.Type;

export const LineQuickReply = Schema.Struct({
  items: Schema.optional(Schema.Array(LineQuickReplyItem)),
});

export type LineQuickReply = typeof LineQuickReply.Type;

export const LineSender = Schema.Struct({
  name: Schema.optional(Schema.String),
  iconUrl: Schema.optional(Schema.String),
});

export type LineSender = typeof LineSender.Type;

export const LineEmojiSubstitutionObject = Schema.Struct({
  type: Schema.Literal("emoji"),
  productId: Schema.String,
  emojiId: Schema.String,
});

export type LineEmojiSubstitutionObject = typeof LineEmojiSubstitutionObject.Type;

export const LineUserMentionee = Schema.Struct({
  type: Schema.Literal("user"),
  userId: Schema.String,
});

export type LineUserMentionee = typeof LineUserMentionee.Type;

export const LineAllMentionee = Schema.Struct({
  type: Schema.Literal("all"),
});

export type LineAllMentionee = typeof LineAllMentionee.Type;

export const LineMentionee = Schema.Union([LineUserMentionee, LineAllMentionee]);

export type LineMentionee = typeof LineMentionee.Type;

export const LineMentionSubstitutionObject = Schema.Struct({
  type: Schema.Literal("mention"),
  mentionee: LineMentionee,
});

export type LineMentionSubstitutionObject = typeof LineMentionSubstitutionObject.Type;

export const LineSubstitutionObject = Schema.Union([
  LineEmojiSubstitutionObject,
  LineMentionSubstitutionObject,
]);

export type LineSubstitutionObject = typeof LineSubstitutionObject.Type;

export const LineTextMessage = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  emojis: Schema.optional(Schema.Array(LineEmoji)),
  quoteToken: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineTextMessage = typeof LineTextMessage.Type;

export const LineTextMessageV2 = Schema.Struct({
  type: Schema.Literal("textV2"),
  text: Schema.String,
  substitution: Schema.optional(Schema.Record(Schema.String, LineSubstitutionObject)),
  quoteToken: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineTextMessageV2 = typeof LineTextMessageV2.Type;

export const LineStickerMessage = Schema.Struct({
  type: Schema.Literal("sticker"),
  packageId: Schema.String,
  stickerId: Schema.String,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
  quoteToken: Schema.optional(Schema.String),
});

export type LineStickerMessage = typeof LineStickerMessage.Type;

export const LineImageMessage = Schema.Struct({
  type: Schema.Literal("image"),
  originalContentUrl: Schema.String,
  previewImageUrl: Schema.String,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineImageMessage = typeof LineImageMessage.Type;

export const LineVideoMessage = Schema.Struct({
  type: Schema.Literal("video"),
  originalContentUrl: Schema.String,
  previewImageUrl: Schema.String,
  trackingId: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineVideoMessage = typeof LineVideoMessage.Type;

export const LineAudioMessage = Schema.Struct({
  type: Schema.Literal("audio"),
  originalContentUrl: Schema.String,
  duration: Schema.Number,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineAudioMessage = typeof LineAudioMessage.Type;

export const LineLocationMessage = Schema.Struct({
  type: Schema.Literal("location"),
  title: Schema.String,
  address: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineLocationMessage = typeof LineLocationMessage.Type;

export const LineImagemapMessage = Schema.Struct({
  type: Schema.Literal("imagemap"),
  baseUrl: Schema.String,
  altText: Schema.String,
  baseSize: Schema.Struct({
    width: Schema.Number,
    height: Schema.Number,
  }),
  actions: Schema.Array(Schema.Unknown),
  video: Schema.optional(Schema.Unknown),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineImagemapMessage = typeof LineImagemapMessage.Type;

export const LineTemplateMessage = Schema.Struct({
  type: Schema.Literal("template"),
  altText: Schema.String,
  template: Schema.Unknown,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineTemplateMessage = typeof LineTemplateMessage.Type;

export const LineFlexMessage = Schema.Struct({
  type: Schema.Literal("flex"),
  altText: Schema.String,
  contents: Schema.Unknown,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineFlexMessage = typeof LineFlexMessage.Type;

export const LineCouponMessage = Schema.Struct({
  type: Schema.Literal("coupon"),
  couponId: Schema.String,
  deliveryTag: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineCouponMessage = typeof LineCouponMessage.Type;

export const LineOutboundMessage = Schema.Union([
  LineTextMessage,
  LineTextMessageV2,
  LineStickerMessage,
  LineImageMessage,
  LineVideoMessage,
  LineAudioMessage,
  LineLocationMessage,
  LineImagemapMessage,
  LineTemplateMessage,
  LineFlexMessage,
  LineCouponMessage,
]);

export type LineOutboundMessage = typeof LineOutboundMessage.Type;

export type LineMessageTuple =
  | readonly [LineOutboundMessage]
  | readonly [LineOutboundMessage, LineOutboundMessage]
  | readonly [LineOutboundMessage, LineOutboundMessage, LineOutboundMessage]
  | readonly [LineOutboundMessage, LineOutboundMessage, LineOutboundMessage, LineOutboundMessage]
  | readonly [
      LineOutboundMessage,
      LineOutboundMessage,
      LineOutboundMessage,
      LineOutboundMessage,
      LineOutboundMessage,
    ];

export const LineMessages = Schema.NonEmptyArray(LineOutboundMessage).check(Schema.isMaxLength(5));

export type LineMessages = typeof LineMessages.Type;
