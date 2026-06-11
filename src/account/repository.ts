import { Context, type Effect, type Option } from "effect";
import type {
  CreateLineAccountRecordInput,
  LineAccount,
  LineChannelId,
  LineChannelRecordId,
  UpdateLineAccountRecordInput,
} from "./domain.ts";
import type {
  LineAccountDuplicateChannelError,
  LineAccountNotFoundError,
  LineRepositoryError,
} from "./errors.ts";

export class LineRepository extends Context.Service<
  LineRepository,
  {
    readonly create: (
      input: CreateLineAccountRecordInput,
    ) => Effect.Effect<LineAccount, LineAccountDuplicateChannelError | LineRepositoryError>;

    readonly update: (
      id: LineChannelRecordId,
      input: UpdateLineAccountRecordInput,
    ) => Effect.Effect<
      LineAccount,
      LineAccountNotFoundError | LineAccountDuplicateChannelError | LineRepositoryError
    >;

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

    readonly deleteById: (
      id: LineChannelRecordId,
    ) => Effect.Effect<void, LineAccountNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineRepository") {}

export type LineRepositoryService = LineRepository["Service"];
