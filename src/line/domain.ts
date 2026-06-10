import { Schema } from "effect";

export class LineChannel extends Schema.Class<LineChannel>("LineChannel")({
  id: Schema.String,
  name: Schema.String,
  channelId: Schema.String,
  channelSecret: Schema.Redacted(Schema.String),
  channelAccessToken: Schema.Redacted(Schema.String),
  createdAt: Schema.DateValid,
}) {}

export class CreateLineChannelInput extends Schema.Class<CreateLineChannelInput>(
  "CreateLineChannelInput",
)({
  name: Schema.String,
  channelId: Schema.String,
  channelSecret: Schema.Redacted(Schema.String),
  channelAccessToken: Schema.Redacted(Schema.String),
}) {}

export const LineTextMessage = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
});

export type LineTextMessage = typeof LineTextMessage.Type;

export type LineMessageTuple =
  | readonly [LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage, LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage, LineTextMessage, LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage, LineTextMessage, LineTextMessage, LineTextMessage];

export const LineMessages = Schema.NonEmptyArray(LineTextMessage).check(Schema.isMaxLength(5));

export type LineMessages = typeof LineMessages.Type;
