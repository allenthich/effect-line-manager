import { Context, type Effect, type Option } from "effect";
import type { CreateLineChannelInput, LineChannel, LineChannelId } from "./domain.ts";
import type { LineRepositoryError } from "./errors.ts";

export class LineRepository extends Context.Service<
  LineRepository,
  {
    readonly create: (
      input: CreateLineChannelInput,
    ) => Effect.Effect<LineChannel, LineRepositoryError>;
    readonly findByChannelId: (
      channelId: LineChannelId,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;
    readonly listAll: () => Effect.Effect<ReadonlyArray<LineChannel>, LineRepositoryError>;
    readonly deleteByChannelId: (
      channelId: LineChannelId,
    ) => Effect.Effect<void, LineRepositoryError>;
  }
>()("effect-line-manager/LineRepository") {}

export type LineRepositoryService = LineRepository["Service"];
