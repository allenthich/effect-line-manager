import { Context, type Effect, type Option } from "effect";
import type { LineProviderId } from "../provider/domain.ts";
import type {
  CreateChannelRecordInput,
  LineChannel,
  LineChannelId,
  LineChannelRecordId,
  UpdateChannelRecordInput,
} from "./domain.ts";
import type { ChannelDuplicateError, ChannelNotFoundError } from "./errors.ts";
import type { LineRepositoryError } from "../shared/errors.ts";

/** Repository service for LINE channel data persistence. */
export class LineChannelRepository extends Context.Service<
  LineChannelRepository,
  {
    readonly createChannel: (
      input: CreateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelDuplicateError | LineRepositoryError>;

    readonly updateChannel: (
      id: LineChannelRecordId,
      input: UpdateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelNotFoundError | LineRepositoryError>;

    /**
     * @deprecated Prefer `LineMessagingChannels.Repository.findByUid(...)` or
     * `LineLoginChannels.Repository.findByUid(...)` in public APIs.
     */
    readonly findChannelById: (
      id: LineChannelRecordId,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;

    /**
     * @deprecated Prefer `findByLineChannelId(...)` on a domain-specific
     * repository in public APIs.
     */
    readonly findChannelByMessagingId: (
      channelId: LineChannelId,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;

    readonly findChannelByBotUserId: (
      botUserId: string,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;

    readonly listChannelsByProvider: (
      providerId: LineProviderId,
    ) => Effect.Effect<ReadonlyArray<LineChannel>, LineRepositoryError>;

    readonly deleteChannel: (
      id: LineChannelRecordId,
    ) => Effect.Effect<void, ChannelNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineChannelRepository") {}

/** Service type extracted from LineChannelRepository. */
export type LineChannelRepositoryService = LineChannelRepository["Service"];
