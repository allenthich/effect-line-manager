import { Schema } from "effect";
import { LineProviderId } from "../provider/domain.ts";
import {
  NonEmptyTrimmedString,
  LineCredential,
  LineChannelId,
  LineMessagingChannelId,
  LineLoginChannelId,
} from "../shared/domain.ts";

// All channel ID brands now live in `src/shared/domain.ts`. Re-exported here
// for the single-locality convenience of consumers of the `channels` module.
export {
  LineChannelId,
  LineMessagingChannelId,
  LineLoginChannelId,
  LineBotUserId,
} from "../shared/domain.ts";

/**
 * Messaging API Channel (used for bot messaging).
 *
 * Bot profile fields (`botUserId`, `botBasicId`, `botDisplayName`,
 * `botPictureUrl`) are auto-synced from LINE's `GET /v2/bot/info` —
 * they mirror the response shape, prefixed `bot*` for domain clarity.
 *
 * `addFriendUrl` and `addFriendQrCodeUrl` are user-supplied discovery
 * URLs (e.g. `https://lin.ee/...`, `https://qr-official.line.me/...`),
 * not returned by the LINE API.
 */
export class MessagingChannel extends Schema.Class<MessagingChannel>("MessagingChannel")({
  channelType: Schema.Literal("messaging"),
  id: LineChannelId,
  providerId: LineProviderId,
  name: NonEmptyTrimmedString,
  channelId: LineMessagingChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  // Auto-synced bot profile metadata (sourced from GET /v2/bot/info)
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botBasicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botDisplayName: Schema.optional(Schema.NullOr(Schema.String)),
  botPictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  // User-supplied friend-discovery URLs (not from LINE API)
  addFriendUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendQrCodeUrl: Schema.optional(Schema.NullOr(Schema.String)),
  isActive: Schema.Boolean,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** LINE Login Channel (used for social login / OAuth). */
export class LoginChannel extends Schema.Class<LoginChannel>("LoginChannel")({
  channelType: Schema.Literal("login"),
  id: LineChannelId,
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

export type LineMessagingChannel = MessagingChannel;
export type LineLoginChannel = LoginChannel;

export const isLineMessagingChannel = (
  channel: MessagingChannel | LoginChannel,
): channel is MessagingChannel => channel.channelType === "messaging";

export const isLineLoginChannel = (
  channel: MessagingChannel | LoginChannel,
): channel is LoginChannel => channel.channelType === "login";

//#region Repository-layer inputs (Option D)

/** Input type for creating a messaging channel record in the repository layer. */
export const CreateMessagingChannelInput = Schema.Struct({
  channelType: Schema.Literal("messaging"),
  providerId: LineProviderId,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  botDisplayName: Schema.optional(Schema.NullOr(Schema.String)),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botBasicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botPictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendQrCodeUrl: Schema.optional(Schema.NullOr(Schema.String)),
});
/** {@link CreateMessagingChannelInput} type alias. */
export type CreateMessagingChannelInput = typeof CreateMessagingChannelInput.Type;

/** Input type for updating a messaging channel record in the repository layer. */
export class UpdateMessagingChannelInput extends Schema.Class<UpdateMessagingChannelInput>(
  "UpdateMessagingChannelInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(LineCredential),
  channelAccessToken: Schema.optional(LineCredential),
  isActive: Schema.optional(Schema.Boolean),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botBasicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  botDisplayName: Schema.optional(Schema.NullOr(Schema.String)),
  botPictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendUrl: Schema.optional(Schema.NullOr(Schema.String)),
  addFriendQrCodeUrl: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

/** Input type for creating a login channel record in the repository layer. */
export const CreateLoginChannelInput = Schema.Struct({
  channelType: Schema.Literal("login"),
  providerId: LineProviderId,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: LineCredential,
});
/** {@link CreateLoginChannelInput} type alias. */
export type CreateLoginChannelInput = typeof CreateLoginChannelInput.Type;

/** Input type for updating a login channel record in the repository layer. */
export class UpdateLoginChannelInput extends Schema.Class<UpdateLoginChannelInput>(
  "UpdateLoginChannelInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(LineCredential),
}) {}

//#endregion
