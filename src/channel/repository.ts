import { Context, type Effect, type Option } from "effect";
import type { LineProviderId } from "../provider/domain.ts";
import type {
  CreateChannelRecordInput,
  LineChannel,
  LineChannelId,
  LineChannelUid,
  UpdateChannelRecordInput,
} from "./domain.ts";
import type { ChannelDuplicateError, ChannelNotFoundError } from "./errors.ts";
import type { LineRepositoryError } from "../shared/errors.ts";

/**
 * Legacy generic repository contract retained for internal tests and
 * compatibility shims. Published consumers should use the domain-specific
 * channel APIs instead.
 */
export class LineChannelRepository extends Context.Service<
  LineChannelRepository,
  {
    readonly createChannel: (
      input: CreateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelDuplicateError | LineRepositoryError>;
    readonly updateChannel: (
      id: LineChannelUid,
      input: UpdateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelNotFoundError | LineRepositoryError>;
    readonly findChannelByLineChannelId: (
      channelId: LineChannelId,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;
    readonly findChannelByBotUserId: (
      botUserId: string,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;
    readonly listChannelsByProvider: (
      providerId: LineProviderId,
    ) => Effect.Effect<ReadonlyArray<LineChannel>, LineRepositoryError>;
    readonly deleteChannel: (
      id: LineChannelUid,
    ) => Effect.Effect<void, ChannelNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineChannelRepository") {}

export type LineChannelRepositoryService = LineChannelRepository["Service"];
