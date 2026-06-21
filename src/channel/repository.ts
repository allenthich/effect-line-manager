import { Context, type Effect, type Option } from "effect";
import type { LineProviderId } from "../provider/domain.ts";
import type { NormalizedPageQuery, PageResult } from "../shared/domain.ts";
import type {
  CreateChannelRecordInput,
  LineChannel,
  LineChannelId,
  UpdateChannelRecordInput,
} from "./domain.ts";
import type { ChannelDuplicateError, ChannelNotFoundError } from "./errors.ts";
import type { LineRepositoryError } from "../shared/errors.ts";

/**
 * Persistence boundary for generic LINE channel records (messaging + login).
 *
 * Consumers implement this repository to back the domain-specific channel
 * services exported through `LineMessagingChannels` and `LineLoginChannels`.
 */
export class LineChannelRepository extends Context.Service<
  LineChannelRepository,
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
      query: NormalizedPageQuery,
    ) => Effect.Effect<PageResult<LineChannel>, LineRepositoryError>;
    readonly delete: (
      id: LineChannelId,
    ) => Effect.Effect<void, ChannelNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineChannelRepository") {}

export type LineChannelRepositoryService = LineChannelRepository["Service"];
