import { Context, type Effect, type Option } from "effect";
import type { LineProviderId } from "../provider/domain.ts";
import type {
  CreateChannelRecordInput,
  LineChannel,
  LineChannelId,
  UpdateChannelRecordInput,
} from "../channel/domain.ts";
import type { ChannelDuplicateError, ChannelNotFoundError } from "../channel/errors.ts";
import type { LineRepositoryError } from "../shared/errors.ts";

/**
 * Internal persistence boundary for generic channel records.
 *
 * Public consumers should use the domain-specific channel services exported
 * through `LineMessagingChannels` and `LineLoginChannels`.
 */
export class InternalLineChannelStore extends Context.Service<
  InternalLineChannelStore,
  {
    readonly create: (
      input: CreateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelDuplicateError | LineRepositoryError>;
    readonly update: (
      id: LineChannelId,
      input: UpdateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelNotFoundError | LineRepositoryError>;
    readonly findByLineChannelId: (
      channelId: LineChannelId,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;
    readonly findByBotUserId: (
      botUserId: string,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;
    readonly listByProvider: (
      providerId: LineProviderId,
    ) => Effect.Effect<ReadonlyArray<LineChannel>, LineRepositoryError>;
    readonly delete: (
      id: LineChannelId,
    ) => Effect.Effect<void, ChannelNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/internal/InternalLineChannelStore") {}

export type InternalLineChannelStoreService = InternalLineChannelStore["Service"];
