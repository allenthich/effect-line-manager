import { Context, Effect, Layer, Option } from "effect";
import {
  type CreateProviderInput,
  type UpdateProviderInput,
  type LineProvider,
  LineProviderId,
  type ProviderView,
  ProviderListPage,
} from "./domain.ts";
import { LineProviderNotFoundError, LineProviderDuplicateError } from "./errors.ts";
import { LineAccountPersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import { LineClientRegistry } from "../channel/registry.ts";
import { LineProviderRepository } from "./repository.ts";

export interface LineProviderManagementService {
  readonly listProviders: Effect.Effect<ProviderListPage, LineAccountPersistenceError>;
  readonly getProvider: (
    id: LineProviderId,
  ) => Effect.Effect<ProviderView, LineProviderNotFoundError | LineAccountPersistenceError>;
  readonly createProvider: (
    input: CreateProviderInput,
  ) => Effect.Effect<ProviderView, LineProviderDuplicateError | LineAccountPersistenceError>;
  readonly updateProvider: (
    id: LineProviderId,
    input: UpdateProviderInput,
  ) => Effect.Effect<ProviderView, LineProviderNotFoundError | LineAccountPersistenceError>;
  readonly deleteProvider: (
    id: LineProviderId,
  ) => Effect.Effect<void, LineProviderNotFoundError | LineAccountPersistenceError>;
}

export class LineProviderManagement extends Context.Service<
  LineProviderManagement,
  LineProviderManagementService
>()("effect-line-manager/LineProviderManagement") {
  static get layer() {
    return Layer.effect(LineProviderManagement)(makeLineProviderManagement);
  }
}

export const toProviderView = (provider: LineProvider): ProviderView => ({
  id: provider.id,
  name: provider.name,
  createdAt: provider.createdAt,
  updatedAt: provider.updatedAt,
});

export const toProviderListPage = (providers: ReadonlyArray<LineProvider>): ProviderListPage => ({
  data: providers.map(toProviderView),
  pagination: {
    page: 1,
    pageSize: providers.length,
    totalItems: providers.length,
    totalPages: providers.length === 0 ? 0 : 1,
  },
});

const toCreateProviderRecordInput = (input: CreateProviderInput) => ({
  name: input.name,
});

const toUpdateProviderRecordInput = (input: UpdateProviderInput) =>
  input.name === undefined ? {} : { name: input.name };

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE provider repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LineAccountPersistenceError({ operation: error.operation }))),
  );

export const makeLineProviderManagement = Effect.gen(function* () {
  const repository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  return LineProviderManagement.of({
    listProviders: repository.listProviders.pipe(
      Effect.catchTag("LineRepositoryError", persistenceFailure),
      Effect.map(toProviderListPage),
      Effect.withSpan("LineProviderManagement.listProviders"),
    ),

    getProvider: Effect.fn("LineProviderManagement.getProvider")((id: LineProviderId) =>
      Effect.gen(function* () {
        const option = yield* repository.findProviderById(id);
        if (Option.isNone(option)) {
          return yield* new LineProviderNotFoundError({ providerId: id });
        }
        return toProviderView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    createProvider: Effect.fn("LineProviderManagement.createProvider")(
      (input: CreateProviderInput) =>
        repository
          .createProvider(toCreateProviderRecordInput(input))
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(toProviderView),
          ),
    ),

    updateProvider: Effect.fn("LineProviderManagement.updateProvider")(
      (id: LineProviderId, input: UpdateProviderInput) =>
        repository
          .updateProvider(id, toUpdateProviderRecordInput(input))
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(toProviderView),
          ),
    ),

    deleteProvider: Effect.fn("LineProviderManagement.deleteProvider")((id: LineProviderId) =>
      Effect.gen(function* () {
        yield* repository.deleteProvider(id);
        // Provider deletion cascades to child channels and LIFF apps.
        yield* registry.invalidateAll;
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),
  });
});
