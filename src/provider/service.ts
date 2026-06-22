import { Context, Effect, Layer, Option } from "effect";
import {
  type CreateProviderInput,
  type UpdateProviderInput,
  type LineProvider,
  LineProviderId,
  type ProviderView,
  ProviderListPage,
  type ListProvidersQuery,
} from "./domain.ts";
import { LineProviderNotFoundError, LineProviderDuplicateError } from "./errors.ts";
import { LinePersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import { normalizePageQuery, type PageQuery, type PageResult } from "../shared/domain.ts";
import { LineClientRegistry } from "../registry/index.ts";
import { LineProviderRepository } from "./repository.ts";

/** Service interface for LINE provider management operations. */
export interface LineProviderManagementService {
  readonly listProviders: (
    query: ListProvidersQuery,
  ) => Effect.Effect<ProviderListPage, LinePersistenceError>;
  readonly getProvider: (
    id: LineProviderId,
  ) => Effect.Effect<ProviderView, LineProviderNotFoundError | LinePersistenceError>;
  readonly createProvider: (
    input: CreateProviderInput,
  ) => Effect.Effect<ProviderView, LineProviderDuplicateError | LinePersistenceError>;
  readonly updateProvider: (
    id: LineProviderId,
    input: UpdateProviderInput,
  ) => Effect.Effect<ProviderView, LineProviderNotFoundError | LinePersistenceError>;
  readonly deleteProvider: (
    id: LineProviderId,
  ) => Effect.Effect<void, LineProviderNotFoundError | LinePersistenceError>;
}

/** Service implementation for LINE provider management. */
export class LineProviderManagement extends Context.Service<
  LineProviderManagement,
  LineProviderManagementService
>()("effect-line-manager/LineProviderManagement") {
  static get layer() {
    return Layer.effect(LineProviderManagement)(makeLineProviderManagement);
  }
}

/** Converts a domain provider entity to a public-facing view. */
export const toProviderView = (provider: LineProvider): ProviderView => ({
  id: provider.id,
  name: provider.name,
  createdAt: provider.createdAt,
  updatedAt: provider.updatedAt,
});

/** Converts a paginated page of domain provider entities to a list page of views. */
export const toProviderListPage = (page: PageResult<LineProvider>): ProviderListPage => ({
  data: page.data.map(toProviderView),
  pagination: page.pagination,
});

const toCreateProviderRecordInput = (input: CreateProviderInput) => ({
  name: input.name,
});

const toUpdateProviderRecordInput = (input: UpdateProviderInput) =>
  input.name === undefined ? {} : { name: input.name };

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE provider repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LinePersistenceError({ operation: error.operation }))),
  );

/** Constructs the LINE provider management service with its dependencies. */
export const makeLineProviderManagement = Effect.gen(function* () {
  const repository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  return LineProviderManagement.of({
    listProviders: Effect.fn("LineProviderManagement.listProviders")((query: PageQuery) =>
      repository
        .listProviders(normalizePageQuery(query))
        .pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toProviderListPage),
        ),
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
