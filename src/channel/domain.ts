import { Schema } from "effect";
import { LineProviderId } from "../provider/domain.ts";
import { NonEmptyTrimmedString, LineCredential, Pagination } from "../shared/domain.ts";

/** Branded type for the database record ID of a LINE channel. */
export const LineChannelRecordId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineChannelRecordId"),
);
/** {@link LineChannelRecordId} type alias. */
export type LineChannelRecordId = typeof LineChannelRecordId.Type;

/** Branded type for the LINE Messaging API channel ID. */
export const LineChannelId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineChannelId"),
);
/** {@link LineChannelId} type alias. */
export type LineChannelId = typeof LineChannelId.Type;

/** Branded type for the LINE Login channel ID. */
export const LineLoginChannelId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLoginChannelId"),
);
/** {@link LineLoginChannelId} type alias. */
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
/** {@link LineChannel} type alias. */
export type LineChannel = typeof LineChannel.Type;

/** Input type for creating a channel record in the repository layer. */
export const CreateChannelRecordInput = Schema.Union([
  Schema.Struct({
    channelType: Schema.Literal("messaging"),
    providerId: LineProviderId,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: LineCredential,
    channelAccessToken: LineCredential,
    displayName: Schema.optional(Schema.NullOr(Schema.String)),
    botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
    basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
    pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  }),
  Schema.Struct({
    channelType: Schema.Literal("login"),
    providerId: LineProviderId,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: LineCredential,
  }),
] as const);
/** {@link CreateChannelRecordInput} type alias. */
export type CreateChannelRecordInput = typeof CreateChannelRecordInput.Type;

/** Input type for updating a channel record in the repository layer. */
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

/** Input type for creating a channel through the management service. */
export const CreateChannelInput = Schema.Union([
  Schema.Struct({
    channelType: Schema.Literal("messaging"),
    providerId: NonEmptyTrimmedString,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: NonEmptyTrimmedString,
    channelAccessToken: NonEmptyTrimmedString,
    displayName: Schema.optional(Schema.NullOr(Schema.String)),
    botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
    basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
    pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  }),
  Schema.Struct({
    channelType: Schema.Literal("login"),
    providerId: NonEmptyTrimmedString,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: NonEmptyTrimmedString,
  }),
] as const);
/** {@link CreateChannelInput} type alias. */
export type CreateChannelInput = typeof CreateChannelInput.Type;

/** Input type for updating a channel through the management service. */
export const UpdateChannelInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
  channelAccessToken: Schema.optional(NonEmptyTrimmedString),
  isActive: Schema.optional(Schema.Boolean),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
});
/** {@link UpdateChannelInput} type alias. */
export type UpdateChannelInput = typeof UpdateChannelInput.Type;

/** Public-facing view of a Messaging API channel. */
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
  channelSecret: Schema.NullOr(NonEmptyTrimmedString),
  channelAccessToken: Schema.NullOr(NonEmptyTrimmedString),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});

/** Public-facing view of a LINE Login channel. */
export const LoginChannelView = Schema.Struct({
  id: NonEmptyTrimmedString,
  channelType: Schema.Literal("login"),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: Schema.NullOr(NonEmptyTrimmedString),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});

/** Discriminated union of channel views. */
export const ChannelView = Schema.Union([MessagingChannelView, LoginChannelView]);
/** {@link ChannelView} type alias. */
export type ChannelView = typeof ChannelView.Type;

/** Paginated list of channel views. */
export const ChannelListPage = Schema.Struct({
  data: Schema.Array(ChannelView),
  pagination: Pagination,
});
/** {@link ChannelListPage} type alias. */
export type ChannelListPage = typeof ChannelListPage.Type;
