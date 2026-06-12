import { Context, type Effect, type Option } from "effect";
import type {
  CreateLineAccountInput,
  LineAccount,
  LineChannelId,
  LineChannelRecordId,
  UpdateLineAccountInput,
} from "./domain.ts";
import type { LineRepositoryError } from "./errors.ts";

export class LineRepository extends Context.Service<
  LineRepository,
  {
    readonly create: (
      input: CreateLineAccountInput,
    ) => Effect.Effect<LineAccount, LineRepositoryError>;

    readonly update: (
      id: LineChannelRecordId,
      input: UpdateLineAccountInput,
    ) => Effect.Effect<LineAccount, LineRepositoryError>;

    readonly findById: (
      id: LineChannelRecordId,
    ) => Effect.Effect<Option.Option<LineAccount>, LineRepositoryError>;

    readonly findByChannelId: (
      channelId: LineChannelId,
    ) => Effect.Effect<Option.Option<LineAccount>, LineRepositoryError>;

    readonly findByBotUserId: (
      botUserId: string,
    ) => Effect.Effect<Option.Option<LineAccount>, LineRepositoryError>;

    readonly listAll: () => Effect.Effect<ReadonlyArray<LineAccount>, LineRepositoryError>;

    readonly deleteById: (id: LineChannelRecordId) => Effect.Effect<void, LineRepositoryError>;
  }
>()("effect-line-manager/LineRepository") {}

export type LineRepositoryService = LineRepository["Service"];
