import { Schema } from "effect";
import { LineProviderId } from "../provider/domain.ts";
import { NonEmptyTrimmedString, LineCredential, Pagination } from "../shared/domain.ts";

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

/** Messaging API Channel (used for bot messaging). */
export class MessagingChannel extends Schema.Class<MessagingChannel>("MessagingChannel")({
  channelType: Schema.Literal("messaging"),
  id: LineChannelRecordId,
  providerId: LineProviderId,
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  // Auto-synced bot profile metadata
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  isActive: Schema.Boolean,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** LINE Login Channel (used for social login / OAuth). */
export class LoginChannel extends Schema.Class<LoginChannel>("LoginChannel")({
  channelType: Schema.Literal("login"),
  id: LineChannelRecordId,
  providerId: LineProviderId,
  name: NonEmptyTrimmedString,
  channelId: LineLoginChannelId,
  channelSecret: LineCredential,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** Discriminated union of channel types. */
export const LineChannel = Schema.Union([MessagingChannel, LoginChannel]);
export type LineChannel = typeof LineChannel.Type;

export const CreateChannelRecordInput = Schema.Union([
  Schema.Struct({
    channelType: Schema.Literal("messaging"),
    providerId: LineProviderId,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: LineCredential,
    channelAccessToken: LineCredential,
  }),
  Schema.Struct({
    channelType: Schema.Literal("login"),
    providerId: LineProviderId,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: LineCredential,
  }),
] as const);
export type CreateChannelRecordInput = typeof CreateChannelRecordInput.Type;

export class UpdateChannelRecordInput extends Schema.Class<UpdateChannelRecordInput>(
  "UpdateChannelRecordInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(LineCredential),
  channelAccessToken: Schema.optional(LineCredential),
  isActive: Schema.optional(Schema.Boolean),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

export const CreateChannelInput = Schema.Union([
  Schema.Struct({
    channelType: Schema.Literal("messaging"),
    providerId: NonEmptyTrimmedString,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: NonEmptyTrimmedString,
    channelAccessToken: NonEmptyTrimmedString,
  }),
  Schema.Struct({
    channelType: Schema.Literal("login"),
    providerId: NonEmptyTrimmedString,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: NonEmptyTrimmedString,
  }),
] as const);
export type CreateChannelInput = typeof CreateChannelInput.Type;

export const UpdateChannelInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
  channelAccessToken: Schema.optional(NonEmptyTrimmedString),
  isActive: Schema.optional(Schema.Boolean),
});
export type UpdateChannelInput = typeof UpdateChannelInput.Type;

export const MessagingChannelView = Schema.Struct({
  id: NonEmptyTrimmedString,
  channelType: Schema.Literal("messaging"),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  botUserId: Schema.NullOr(NonEmptyTrimmedString),
  basicId: Schema.NullOr(NonEmptyTrimmedString),
  displayName: Schema.NullOr(Schema.String),
  pictureUrl: Schema.NullOr(Schema.String),
  isActive: Schema.Boolean,
  hasChannelSecret: Schema.Boolean,
  hasChannelAccessToken: Schema.Boolean,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});

export const LoginChannelView = Schema.Struct({
  id: NonEmptyTrimmedString,
  channelType: Schema.Literal("login"),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  hasChannelSecret: Schema.Boolean,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});

export const ChannelView = Schema.Union([MessagingChannelView, LoginChannelView]);
export type ChannelView = typeof ChannelView.Type;

export const ChannelListPage = Schema.Struct({
  data: Schema.Array(ChannelView),
  pagination: Pagination,
});
export type ChannelListPage = typeof ChannelListPage.Type;
