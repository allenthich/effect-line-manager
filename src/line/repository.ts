import { Context, type Effect, type Option } from "effect";
import type { CreateLineChannelInput, LineChannel } from "./domain.ts";
import type { LineRepositoryError } from "./errors.ts";

export interface LineRepositoryShape {
  readonly create: (
    input: CreateLineChannelInput,
  ) => Effect.Effect<LineChannel, LineRepositoryError>;
  readonly findByChannelId: (
    channelId: string,
  ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;
  readonly listAll: () => Effect.Effect<ReadonlyArray<LineChannel>, LineRepositoryError>;
  readonly deleteByChannelId: (channelId: string) => Effect.Effect<void, LineRepositoryError>;
}

export class LineRepository extends Context.Service<LineRepository, LineRepositoryShape>()(
  "effect-line-manager/LineRepository",
) {}
