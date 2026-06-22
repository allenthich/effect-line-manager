import { Schema } from "effect";
import { NonEmptyTrimmedString, PageQuery } from "../shared/domain.ts";

/**
 * Compatibility shim DTOs for the generic channel adapter methods.
 *
 * These schemas exist only to support the backward-compatible
 * `LineProviderManagementAdapter.listChannels()` / `createChannel()` /
 * `updateChannel()` / `deleteChannel()` / `getChannel()` shim methods that
 * combine the messaging + login aggregates into a unified view. New
 * consumers should prefer the aggregate-specific adapter methods
 * (`listMessagingChannels`, `createLoginChannel`, etc.).
 *
 * @deprecated use {@link CreateLineMessagingChannelInput},
 * {@link CreateLineLoginChannelInput}, etc. instead.
 */

/** Discriminated union of create-channel inputs for the shim surface. */
export const CreateChannelInput = Schema.Union([
  Schema.Struct({
    channelType: Schema.Literal("messaging"),
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

/** Partial update input accepted by the shim `updateChannel` method. */
export const UpdateChannelInput = Schema.Struct({
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
/** {@link UpdateChannelInput} type alias. */
export type UpdateChannelInput = typeof UpdateChannelInput.Type;

/** Query parameters for listing channels via the shim — pagination + optional provider filter. */
export const ListChannelsQuery = Schema.Struct({
  ...PageQuery.fields,
  providerId: Schema.optional(NonEmptyTrimmedString),
});
/** {@link ListChannelsQuery} type alias. */
export type ListChannelsQuery = typeof ListChannelsQuery.Type;
