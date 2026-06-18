/**
 * LINE Messaging API message type schemas.
 *
 * These define the outbound message types supported by the LINE Messaging API.
 * Extracted from the messaging client to allow independent consumption (e.g.
 * for webhook handling or message construction without importing the HTTP client).
 */

import { Schema } from "effect";

/** Schema for a LINE emoji used within text messages. */
export const LineEmoji = Schema.Struct({
  index: Schema.Number,
  productId: Schema.String,
  emojiId: Schema.String,
});

/** Type alias for {@link LineEmoji}. */
export type LineEmoji = typeof LineEmoji.Type;

/** Schema for a quick reply action item. */
export const LineQuickReplyItem = Schema.Struct({
  type: Schema.optional(Schema.Literal("action")),
  action: Schema.Unknown,
  imageUrl: Schema.optional(Schema.String),
});

/** Type alias for {@link LineQuickReplyItem}. */
export type LineQuickReplyItem = typeof LineQuickReplyItem.Type;

/** Schema for a quick reply configuration. */
export const LineQuickReply = Schema.Struct({
  items: Schema.optional(Schema.Array(LineQuickReplyItem)),
});

/** Type alias for {@link LineQuickReply}. */
export type LineQuickReply = typeof LineQuickReply.Type;

/** Schema for a message sender override. */
export const LineSender = Schema.Struct({
  name: Schema.optional(Schema.String),
  iconUrl: Schema.optional(Schema.String),
});

/** Type alias for {@link LineSender}. */
export type LineSender = typeof LineSender.Type;

/** Schema for an emoji substitution object used in textV2 messages. */
export const LineEmojiSubstitutionObject = Schema.Struct({
  type: Schema.Literal("emoji"),
  productId: Schema.String,
  emojiId: Schema.String,
});

/** Type alias for {@link LineEmojiSubstitutionObject}. */
export type LineEmojiSubstitutionObject = typeof LineEmojiSubstitutionObject.Type;

/** Schema for a user mention target in textV2 messages. */
export const LineUserMentionee = Schema.Struct({
  type: Schema.Literal("user"),
  userId: Schema.String,
});

/** Type alias for {@link LineUserMentionee}. */
export type LineUserMentionee = typeof LineUserMentionee.Type;

/** Schema for an all-members mention target in textV2 messages. */
export const LineAllMentionee = Schema.Struct({
  type: Schema.Literal("all"),
});

/** Type alias for {@link LineAllMentionee}. */
export type LineAllMentionee = typeof LineAllMentionee.Type;

/** Union of mention target types (user or all). */
export const LineMentionee = Schema.Union([LineUserMentionee, LineAllMentionee]);

/** Type alias for {@link LineMentionee}. */
export type LineMentionee = typeof LineMentionee.Type;

/** Schema for a mention substitution object used in textV2 messages. */
export const LineMentionSubstitutionObject = Schema.Struct({
  type: Schema.Literal("mention"),
  mentionee: LineMentionee,
});

/** Type alias for {@link LineMentionSubstitutionObject}. */
export type LineMentionSubstitutionObject = typeof LineMentionSubstitutionObject.Type;

/** Union of substitution object types (emoji or mention) for textV2 messages. */
export const LineSubstitutionObject = Schema.Union([
  LineEmojiSubstitutionObject,
  LineMentionSubstitutionObject,
]);

/** Type alias for {@link LineSubstitutionObject}. */
export type LineSubstitutionObject = typeof LineSubstitutionObject.Type;

/** Schema for a LINE text message. */
export const LineTextMessage = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  emojis: Schema.optional(Schema.Array(LineEmoji)),
  quoteToken: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineTextMessage}. */
export type LineTextMessage = typeof LineTextMessage.Type;

/** Schema for a LINE text message V2 with emoji and mention substitutions. */
export const LineTextMessageV2 = Schema.Struct({
  type: Schema.Literal("textV2"),
  text: Schema.String,
  substitution: Schema.optional(Schema.Record(Schema.String, LineSubstitutionObject)),
  quoteToken: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineTextMessageV2}. */
export type LineTextMessageV2 = typeof LineTextMessageV2.Type;

/** Schema for a LINE sticker message. */
export const LineStickerMessage = Schema.Struct({
  type: Schema.Literal("sticker"),
  packageId: Schema.String,
  stickerId: Schema.String,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
  quoteToken: Schema.optional(Schema.String),
});

/** Type alias for {@link LineStickerMessage}. */
export type LineStickerMessage = typeof LineStickerMessage.Type;

/** Schema for a LINE image message. */
export const LineImageMessage = Schema.Struct({
  type: Schema.Literal("image"),
  originalContentUrl: Schema.String,
  previewImageUrl: Schema.String,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineImageMessage}. */
export type LineImageMessage = typeof LineImageMessage.Type;

/** Schema for a LINE video message. */
export const LineVideoMessage = Schema.Struct({
  type: Schema.Literal("video"),
  originalContentUrl: Schema.String,
  previewImageUrl: Schema.String,
  trackingId: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineVideoMessage}. */
export type LineVideoMessage = typeof LineVideoMessage.Type;

/** Schema for a LINE audio message. */
export const LineAudioMessage = Schema.Struct({
  type: Schema.Literal("audio"),
  originalContentUrl: Schema.String,
  duration: Schema.Number,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineAudioMessage}. */
export type LineAudioMessage = typeof LineAudioMessage.Type;

/** Schema for a LINE location message. */
export const LineLocationMessage = Schema.Struct({
  type: Schema.Literal("location"),
  title: Schema.String,
  address: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineLocationMessage}. */
export type LineLocationMessage = typeof LineLocationMessage.Type;

/** Schema for a LINE imagemap message. */
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

/** Type alias for {@link LineImagemapMessage}. */
export type LineImagemapMessage = typeof LineImagemapMessage.Type;

/** Schema for a LINE template message. */
export const LineTemplateMessage = Schema.Struct({
  type: Schema.Literal("template"),
  altText: Schema.String,
  template: Schema.Unknown,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineTemplateMessage}. */
export type LineTemplateMessage = typeof LineTemplateMessage.Type;

/** Schema for a LINE flex message. */
export const LineFlexMessage = Schema.Struct({
  type: Schema.Literal("flex"),
  altText: Schema.String,
  contents: Schema.Unknown,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineFlexMessage}. */
export type LineFlexMessage = typeof LineFlexMessage.Type;

/** Schema for a LINE coupon message. */
export const LineCouponMessage = Schema.Struct({
  type: Schema.Literal("coupon"),
  couponId: Schema.String,
  deliveryTag: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

/** Type alias for {@link LineCouponMessage}. */
export type LineCouponMessage = typeof LineCouponMessage.Type;

/** Union of all outbound LINE message types. */
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

/** Type alias for {@link LineOutboundMessage}. */
export type LineOutboundMessage = typeof LineOutboundMessage.Type;

/** Tuple type for 1-5 LINE outbound messages that can be sent in a single request. */
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

/** Non-empty array of 1-5 LINE outbound messages. */
export const LineMessages = Schema.NonEmptyArray(LineOutboundMessage).check(Schema.isMaxLength(5));

/** Type alias for {@link LineMessages}. */
export type LineMessages = typeof LineMessages.Type;
