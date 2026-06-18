import { Context, type Effect, type Option } from "effect";
import type {
  CreateProviderRecordInput,
  LineProvider,
  LineProviderId,
  UpdateProviderRecordInput,
} from "./domain.ts";
import type { LineProviderDuplicateError, LineProviderNotFoundError } from "./errors.ts";
import type { LineRepositoryError } from "../shared/errors.ts";

/** Repository service for LINE provider data persistence. */
export class LineProviderRepository extends Context.Service<
  LineProviderRepository,
  {
    readonly createProvider: (
      input: CreateProviderRecordInput,
    ) => Effect.Effect<LineProvider, LineProviderDuplicateError | LineRepositoryError>;

    readonly updateProvider: (
      id: LineProviderId,
      input: UpdateProviderRecordInput,
    ) => Effect.Effect<LineProvider, LineProviderNotFoundError | LineRepositoryError>;

    readonly findProviderById: (
      id: LineProviderId,
    ) => Effect.Effect<Option.Option<LineProvider>, LineRepositoryError>;

    readonly listProviders: Effect.Effect<ReadonlyArray<LineProvider>, LineRepositoryError>;

    readonly deleteProvider: (
      id: LineProviderId,
    ) => Effect.Effect<void, LineProviderNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineProviderRepository") {}

/** Service type extracted from LineProviderRepository. */
export type LineProviderRepositoryService = LineProviderRepository["Service"];
