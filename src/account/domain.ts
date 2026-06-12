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

export class CreateLineAccountRecordInput extends Schema.Class<CreateLineAccountRecordInput>(
  "CreateLineAccountRecordInput",
)({
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  loginChannelId: Schema.NullOr(LineLoginChannelId),
  loginChannelSecret: Schema.NullOr(LineCredential),
  liffId: Schema.NullOr(LineLiffId),
}) {}

export class UpdateLineAccountRecordInput extends Schema.Class<UpdateLineAccountRecordInput>(
  "UpdateLineAccountRecordInput",
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

export const LineAccountView = Schema.Struct({
  id: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  botUserId: Schema.NullOr(NonEmptyTrimmedString),
  basicId: Schema.NullOr(NonEmptyTrimmedString),
  displayName: Schema.NullOr(Schema.String),
  pictureUrl: Schema.NullOr(Schema.String),
  isActive: Schema.Boolean,
  loginChannelId: Schema.NullOr(NonEmptyTrimmedString),
  liffId: Schema.NullOr(NonEmptyTrimmedString),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
  hasChannelSecret: Schema.Boolean,
  hasChannelAccessToken: Schema.Boolean,
  hasLoginChannelSecret: Schema.Boolean,
});
export type LineAccountView = typeof LineAccountView.Type;

export const CreateLineAccountInput = Schema.Struct({
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: NonEmptyTrimmedString,
  channelAccessToken: NonEmptyTrimmedString,
  loginChannelId: Schema.NullOr(NonEmptyTrimmedString),
  loginChannelSecret: Schema.NullOr(NonEmptyTrimmedString),
  liffId: Schema.NullOr(NonEmptyTrimmedString),
});
export type CreateLineAccountInput = typeof CreateLineAccountInput.Type;

export const UpdateLineAccountInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
  channelAccessToken: Schema.optional(NonEmptyTrimmedString),
  loginChannelId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  loginChannelSecret: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  liffId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  isActive: Schema.optional(Schema.Boolean),
});
export type UpdateLineAccountInput = typeof UpdateLineAccountInput.Type;

export interface LineAccountManagementAdapter {
  readonly list: () => Promise<ReadonlyArray<LineAccountView>>;
  readonly create: (input: CreateLineAccountInput) => Promise<LineAccountView>;
  readonly update: (id: string, input: UpdateLineAccountInput) => Promise<LineAccountView>;
  readonly delete: (id: string) => Promise<void>;
}
