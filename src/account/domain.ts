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

export const LineLoginChannelId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLoginChannelId"),
);
export type LineLoginChannelId = typeof LineLoginChannelId.Type;

export const LineLiffId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLiffId"),
);
export type LineLiffId = typeof LineLiffId.Type;

const LineCredential = Schema.Redacted(NonEmptyTrimmedString);

export class LineAccount extends Schema.Class<LineAccount>("LineAccount")({
  id: LineChannelRecordId,
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,

  // Automatically synced metadata
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),

  isActive: Schema.Boolean,

  // Login config
  loginChannelId: Schema.NullOr(LineLoginChannelId),
  loginChannelSecret: Schema.NullOr(LineCredential),

  // LIFF app ID
  liffId: Schema.NullOr(LineLiffId),

  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

export class CreateLineAccountInput extends Schema.Class<CreateLineAccountInput>(
  "CreateLineAccountInput",
)({
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  loginChannelId: Schema.NullOr(LineLoginChannelId),
  loginChannelSecret: Schema.NullOr(LineCredential),
  liffId: Schema.NullOr(LineLiffId),
}) {}

export class UpdateLineAccountInput extends Schema.Class<UpdateLineAccountInput>(
  "UpdateLineAccountInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(LineChannelId),
  channelSecret: Schema.optional(LineCredential),
  channelAccessToken: Schema.optional(LineCredential),
  loginChannelId: Schema.optional(Schema.NullOr(LineLoginChannelId)),
  loginChannelSecret: Schema.optional(Schema.NullOr(LineCredential)),
  liffId: Schema.optional(Schema.NullOr(LineLiffId)),
  isActive: Schema.optional(Schema.Boolean),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
}) {}
