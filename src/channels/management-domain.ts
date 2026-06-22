import { Schema } from "effect";
import { NonEmptyTrimmedString, Pagination, PageQuery } from "../shared/domain.ts";

//#region Messaging management inputs

/** Input for creating a LINE Messaging channel through the management API. */
export const CreateLineMessagingChannelInput = Schema.Struct({
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: NonEmptyTrimmedString,
  channelAccessToken: NonEmptyTrimmedString,
  botDisplayName: Schema.optional(Schema.NullOr(Schema.String)),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botBasicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botPictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendQrCodeUrl: Schema.optional(Schema.NullOr(Schema.String)),
});
/** {@link CreateLineMessagingChannelInput} type alias. */
export type CreateLineMessagingChannelInput = typeof CreateLineMessagingChannelInput.Type;

/** Input for updating a LINE Messaging channel through the management API. */
export const UpdateLineMessagingChannelInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
  channelAccessToken: Schema.optional(NonEmptyTrimmedString),
  isActive: Schema.optional(Schema.Boolean),
  botDisplayName: Schema.optional(Schema.NullOr(Schema.String)),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botBasicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botPictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendQrCodeUrl: Schema.optional(Schema.NullOr(Schema.String)),
});
/** {@link UpdateLineMessagingChannelInput} type alias. */
export type UpdateLineMessagingChannelInput = typeof UpdateLineMessagingChannelInput.Type;

//#endregion

//#region Login management inputs

/** Input for creating a LINE Login channel through the management API. */
export const CreateLineLoginChannelInput = Schema.Struct({
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: NonEmptyTrimmedString,
});
/** {@link CreateLineLoginChannelInput} type alias. */
export type CreateLineLoginChannelInput = typeof CreateLineLoginChannelInput.Type;

/** Input for updating a LINE Login channel through the management API. */
export const UpdateLineLoginChannelInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
});
/** {@link UpdateLineLoginChannelInput} type alias. */
export type UpdateLineLoginChannelInput = typeof UpdateLineLoginChannelInput.Type;

//#endregion

//#region List query types

/** Query parameters for listing LINE Messaging channels. */
export const ListLineMessagingChannelsQuery = Schema.Struct({
  ...PageQuery.fields,
  providerId: Schema.optional(NonEmptyTrimmedString),
});
/** {@link ListLineMessagingChannelsQuery} type alias. */
export type ListLineMessagingChannelsQuery = typeof ListLineMessagingChannelsQuery.Type;

/** Query parameters for listing LINE Login channels. */
export const ListLineLoginChannelsQuery = Schema.Struct({
  ...PageQuery.fields,
  providerId: Schema.optional(NonEmptyTrimmedString),
});
/** {@link ListLineLoginChannelsQuery} type alias. */
export type ListLineLoginChannelsQuery = typeof ListLineLoginChannelsQuery.Type;

//#endregion

//#region Public-facing views (plain strings at transport layer)

/** Public-facing view of a LINE Messaging channel. */
export const LineMessagingChannelView = Schema.Struct({
  id: NonEmptyTrimmedString,
  channelType: Schema.Literal("messaging"),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  botUserId: Schema.NullOr(NonEmptyTrimmedString),
  botBasicId: Schema.NullOr(NonEmptyTrimmedString),
  botDisplayName: Schema.NullOr(Schema.String),
  botPictureUrl: Schema.NullOr(Schema.String),
  addFriendUrl: Schema.NullOr(Schema.String),
  addFriendQrCodeUrl: Schema.NullOr(Schema.String),
  isActive: Schema.Boolean,
  channelSecret: Schema.NullOr(NonEmptyTrimmedString),
  channelAccessToken: Schema.NullOr(NonEmptyTrimmedString),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
/** {@link LineMessagingChannelView} type alias. */
export type LineMessagingChannelView = typeof LineMessagingChannelView.Type;

/** Public-facing view of a LINE Login channel. */
export const LineLoginChannelView = Schema.Struct({
  id: NonEmptyTrimmedString,
  channelType: Schema.Literal("login"),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: Schema.NullOr(NonEmptyTrimmedString),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
/** {@link LineLoginChannelView} type alias. */
export type LineLoginChannelView = typeof LineLoginChannelView.Type;

//#endregion

//#region Paginated list pages

/** Paginated list of LINE Messaging channel views. */
export const LineMessagingChannelListPage = Schema.Struct({
  data: Schema.Array(LineMessagingChannelView),
  pagination: Pagination,
});
/** {@link LineMessagingChannelListPage} type alias. */
export type LineMessagingChannelListPage = typeof LineMessagingChannelListPage.Type;

/** Paginated list of LINE Login channel views. */
export const LineLoginChannelListPage = Schema.Struct({
  data: Schema.Array(LineLoginChannelView),
  pagination: Pagination,
});
/** {@link LineLoginChannelListPage} type alias. */
export type LineLoginChannelListPage = typeof LineLoginChannelListPage.Type;

//#endregion

//#region Combined channel view (adapter shim compatibility)

/**
 * Discriminated union of all LINE channel views.
 *
 * Used by the combined `LineProviderManagementAdapter.listChannels()` shim
 * that aggregates messaging + login channels into a single list. Per-aggregate
 * HTTP endpoints return only their own view — this union exists for the
 * transport shim only.
 */
export const ChannelView = Schema.Union([LineMessagingChannelView, LineLoginChannelView]);
/** {@link ChannelView} type alias. */
export type ChannelView = typeof ChannelView.Type;

/** Paginated list of all LINE channel views (messaging + login combined). */
export const ChannelListPage = Schema.Struct({
  data: Schema.Array(ChannelView),
  pagination: Pagination,
});
/** {@link ChannelListPage} type alias. */
export type ChannelListPage = typeof ChannelListPage.Type;

//#endregion

//#region Type guards

/** Narrows a {@link ChannelView} union to its messaging variant. */
export const isLineMessagingChannelView = (view: ChannelView): view is LineMessagingChannelView =>
  view.channelType === "messaging";

/** Narrows a {@link ChannelView} union to its login variant. */
export const isLineLoginChannelView = (view: ChannelView): view is LineLoginChannelView =>
  view.channelType === "login";

//#endregion
