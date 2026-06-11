import { Schema } from "effect";

const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());

export const LineChannelRecordId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineChannelRecordId"),
);

export type LineChannelRecordId = typeof LineChannelRecordId.Type;

export const LineChannelId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineChannelId"),
);

export type LineChannelId = typeof LineChannelId.Type;

const LineCredential = Schema.Redacted(NonEmptyTrimmedString);

export class LineChannel extends Schema.Class<LineChannel>("LineChannel")({
  id: LineChannelRecordId,
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  createdAt: Schema.DateValid,
}) {}

export class CreateLineChannelInput extends Schema.Class<CreateLineChannelInput>(
  "CreateLineChannelInput",
)({
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
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
