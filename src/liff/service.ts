import { Context, Effect, Layer, Option, Schema } from "effect";
import { LineChannelId, LineLoginChannelId, type LoginChannel } from "../channel/domain.ts";
import { ChannelNotFoundError } from "../channel/errors.ts";
import { LineChannelRepository } from "../channel/repository.ts";
import { LineClientRegistry } from "../registry/index.ts";
import { LineProviderRepository } from "../provider/repository.ts";
import {
  type CreateLiffAppInput,
  type UpdateLiffAppInput,
  type LineLiffApp,
  LineLiffId,
  type LiffAppView,
  LiffAppListPage,
  type ListLiffAppsQuery,
} from "./domain.ts";
import { LiffAppNotFoundError, LiffAppDuplicateError } from "./errors.ts";
import { LinePersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import {
  normalizePageQuery,
  paginate,
  type NormalizedPageQuery,
  type PageResult,
} from "../shared/domain.ts";
import { LineLiffRepository } from "./repository.ts";

/** Management service interface for LIFF application operations. */
export interface LineLiffManagementService {
  readonly listLiffApps: (
    query: ListLiffAppsQuery,
  ) => Effect.Effect<LiffAppListPage, LinePersistenceError>;
  readonly getLiffApp: (
    id: LineLiffId,
  ) => Effect.Effect<LiffAppView, LiffAppNotFoundError | LinePersistenceError>;
  readonly createLiffApp: (
    input: CreateLiffAppInput,
  ) => Effect.Effect<
    LiffAppView,
    LiffAppDuplicateError | ChannelNotFoundError | LinePersistenceError
  >;
  readonly updateLiffApp: (
    id: LineLiffId,
    input: UpdateLiffAppInput,
  ) => Effect.Effect<LiffAppView, LiffAppNotFoundError | LinePersistenceError>;
  readonly deleteLiffApp: (
    id: LineLiffId,
  ) => Effect.Effect<void, LiffAppNotFoundError | LinePersistenceError>;
}

/** Effect context tag for the LIFF management service. */
export class LineLiffManagement extends Context.Service<
  LineLiffManagement,
  LineLiffManagementService
>()("effect-line-manager/LineLiffManagement") {
  static get layer() {
    return Layer.effect(LineLiffManagement)(makeLineLiffManagement);
  }
}

/** Converts a repository LIFF app entity to its public view. */
export const toLiffAppView = (app: LineLiffApp): LiffAppView => ({
  id: app.id,
  loginChannelId: app.loginChannelId,
  liffId: app.liffId,
  view: app.view,
  description: app.description ?? null,
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
});

/** Converts a paginated page of LIFF app entities to a list page of views. */
export const toLiffAppListPage = (page: PageResult<LineLiffApp>): LiffAppListPage => ({
  data: page.data.map(toLiffAppView),
  pagination: page.pagination,
});

const toCreateLiffAppRecordInput = (
  input: CreateLiffAppInput,
  resolvedLoginChannelId: LineLoginChannelId,
) => ({
  loginChannelId: resolvedLoginChannelId,
  liffId: Schema.decodeUnknownSync(LineLiffId)(input.liffId),
  view: input.view,
  ...(input.description === undefined ? {} : { description: input.description }),
});

const toUpdateLiffAppRecordInput = (input: UpdateLiffAppInput) => ({
  ...(input.liffId === undefined
    ? {}
    : { liffId: Schema.decodeUnknownSync(LineLiffId)(input.liffId) }),
  ...(input.view === undefined ? {} : { view: input.view }),
  ...(input.description === undefined ? {} : { description: input.description }),
});

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE LIFF repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LinePersistenceError({ operation: error.operation }))),
  );

const isLoginChannel = (c: { channelType: string }): c is LoginChannel => c.channelType === "login";

const decodeSharedLineChannelId = Schema.decodeUnknownSync(LineChannelId);

/** Creates the implementation for the LIFF management service. */
export const makeLineLiffManagement = Effect.gen(function* () {
  const repository = yield* LineLiffRepository;
  const channelRepository = yield* LineChannelRepository;
  const providerRepository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  const listAllLiffApps = (query: NormalizedPageQuery) =>
    Effect.gen(function* () {
      // Page through every provider and its login channels without pagination,
      // so we can re-paginate the combined LIFF list. A real backend should
      // expose a single `listAllLiffApps(query)` repository method.
      const unboundedQuery: NormalizedPageQuery = { page: 1, pageSize: 100 };
      const providers = yield* providerRepository.listProviders(unboundedQuery);
      const allChannels = yield* Effect.all(
        providers.data.map((p) => channelRepository.listByProvider(p.id, unboundedQuery)),
      );
      const flatChannels = allChannels.flatMap((p) => p.data);
      const loginChannels = flatChannels.filter(isLoginChannel);
      const liffArrays = yield* Effect.all(
        loginChannels.map((c) => repository.listLiffAppsByChannel(c.channelId, unboundedQuery)),
      );
      const allApps = liffArrays.flatMap((p) => p.data);
      return paginate(allApps, query);
    });

  return LineLiffManagement.of({
    listLiffApps: Effect.fn("LineLiffManagement.listLiffApps")((query: ListLiffAppsQuery) => {
      const normalized = normalizePageQuery(query);
      return (
        query.channelId !== undefined
          ? repository.listLiffAppsByChannel(query.channelId, normalized)
          : listAllLiffApps(normalized)
      ).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.map(toLiffAppListPage),
      );
    }),

    getLiffApp: Effect.fn("LineLiffManagement.getLiffApp")((id: LineLiffId) =>
      Effect.gen(function* () {
        const option = yield* repository.findLiffAppByLiffId(id);
        if (Option.isNone(option)) {
          return yield* new LiffAppNotFoundError({ liffId: id });
        }
        return toLiffAppView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    createLiffApp: Effect.fn("LineLiffManagement.createLiffApp")((input: CreateLiffAppInput) =>
      Effect.gen(function* () {
        const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)(input.loginChannelId);
        const sharedId = decodeSharedLineChannelId(loginChannelId);
        const optionChannel = yield* channelRepository.findByLineChannelId(sharedId);
        if (Option.isNone(optionChannel)) {
          return yield* new ChannelNotFoundError({
            channelId: decodeSharedLineChannelId(loginChannelId),
          });
        }
        if (optionChannel.value.channelType !== "login") {
          return yield* new ChannelNotFoundError({
            channelId: decodeSharedLineChannelId(loginChannelId),
          });
        }
        const record = yield* repository.createLiffApp(
          toCreateLiffAppRecordInput(input, loginChannelId),
        );
        yield* registry.invalidateLiff(record.liffId);
        return toLiffAppView(record);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateLiffApp: Effect.fn("LineLiffManagement.updateLiffApp")(
      (id: LineLiffId, input: UpdateLiffAppInput) =>
        Effect.gen(function* () {
          const record = yield* repository.updateLiffApp(id, toUpdateLiffAppRecordInput(input));
          yield* registry.invalidateLiff(id);
          return toLiffAppView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    deleteLiffApp: Effect.fn("LineLiffManagement.deleteLiffApp")((id: LineLiffId) =>
      Effect.gen(function* () {
        yield* repository.deleteLiffApp(id);
        yield* registry.invalidateLiff(id);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),
  });
});
