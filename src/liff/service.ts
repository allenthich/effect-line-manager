import { Context, Effect, Layer, Option, Schema } from "effect";
import { LineChannelUid } from "../channel/domain.ts";
import { ChannelNotFoundError } from "../channel/errors.ts";
import { LineChannelRepository } from "../channel/repository.ts";
import { LineClientRegistry } from "../registry/index.ts";
import { LineProviderRepository } from "../provider/repository.ts";
import {
  type CreateLiffAppInput,
  type UpdateLiffAppInput,
  type LineLiffApp,
  LineLiffUid,
  LineLiffId,
  type LiffAppView,
  LiffAppListPage,
} from "./domain.ts";
import { LiffAppNotFoundError, LiffAppDuplicateError } from "./errors.ts";
import { LineAccountPersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import { LineLiffRepository } from "./repository.ts";

/** Management service interface for LIFF application operations. */
export interface LineLiffManagementService {
  readonly listLiffApps: (
    channelId: LineChannelUid | undefined,
  ) => Effect.Effect<LiffAppListPage, LineAccountPersistenceError>;
  readonly getLiffApp: (
    id: LineLiffUid,
  ) => Effect.Effect<LiffAppView, LiffAppNotFoundError | LineAccountPersistenceError>;
  readonly createLiffApp: (
    input: CreateLiffAppInput,
  ) => Effect.Effect<
    LiffAppView,
    LiffAppDuplicateError | ChannelNotFoundError | LineAccountPersistenceError
  >;
  readonly updateLiffApp: (
    id: LineLiffUid,
    input: UpdateLiffAppInput,
  ) => Effect.Effect<LiffAppView, LiffAppNotFoundError | LineAccountPersistenceError>;
  readonly deleteLiffApp: (
    id: LineLiffUid,
  ) => Effect.Effect<void, LiffAppNotFoundError | LineAccountPersistenceError>;
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

/** Converts a list of LIFF app entities to a paginated list page. */
export const toLiffAppListPage = (apps: ReadonlyArray<LineLiffApp>): LiffAppListPage => ({
  data: apps.map(toLiffAppView),
  pagination: {
    page: 1,
    pageSize: apps.length,
    totalItems: apps.length,
    totalPages: apps.length === 0 ? 0 : 1,
  },
});

const toCreateLiffAppRecordInput = (input: CreateLiffAppInput) => ({
  loginChannelId: Schema.decodeUnknownSync(LineChannelUid)(input.loginChannelId),
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
    Effect.andThen(Effect.fail(new LineAccountPersistenceError({ operation: error.operation }))),
  );

/** Creates the implementation for the LIFF management service. */
export const makeLineLiffManagement = Effect.gen(function* () {
  const repository = yield* LineLiffRepository;
  const channelRepository = yield* LineChannelRepository;
  const providerRepository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  const listAllLiffApps = () =>
    Effect.gen(function* () {
      const providers = yield* providerRepository.listProviders;
      const allChannels = yield* Effect.all(
        providers.map((p) => channelRepository.listChannelsByProvider(p.id)),
      );
      const flatChannels = allChannels.flat();
      const liffArrays = yield* Effect.all(
        flatChannels.map((c) => repository.listLiffAppsByChannel(c.id)),
      );
      return liffArrays.flat();
    });

  return LineLiffManagement.of({
    listLiffApps: Effect.fn("LineLiffManagement.listLiffApps")(
      (channelId: LineChannelUid | undefined) =>
        (channelId !== undefined
          ? repository.listLiffAppsByChannel(channelId)
          : listAllLiffApps()
        ).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toLiffAppListPage),
        ),
    ),

    getLiffApp: Effect.fn("LineLiffManagement.getLiffApp")((id: LineLiffUid) =>
      Effect.gen(function* () {
        const option = yield* repository.findLiffAppByUid(id);
        if (Option.isNone(option)) {
          return yield* new LiffAppNotFoundError({ uid: id });
        }
        return toLiffAppView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    createLiffApp: Effect.fn("LineLiffManagement.createLiffApp")((input: CreateLiffAppInput) =>
      Effect.gen(function* () {
        const loginChannelId = Schema.decodeUnknownSync(LineChannelUid)(input.loginChannelId);
        const optionChannel = yield* channelRepository.findChannelByUid(loginChannelId);
        if (Option.isNone(optionChannel)) {
          return yield* new ChannelNotFoundError({ uid: loginChannelId });
        }
        if (optionChannel.value.channelType !== "login") {
          return yield* new ChannelNotFoundError({ uid: loginChannelId });
        }
        const record = yield* repository.createLiffApp(toCreateLiffAppRecordInput(input));
        yield* registry.invalidateLiff(record.id);
        return toLiffAppView(record);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateLiffApp: Effect.fn("LineLiffManagement.updateLiffApp")(
      (id: LineLiffUid, input: UpdateLiffAppInput) =>
        Effect.gen(function* () {
          const record = yield* repository.updateLiffApp(id, toUpdateLiffAppRecordInput(input));
          yield* registry.invalidateLiff(id);
          return toLiffAppView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    deleteLiffApp: Effect.fn("LineLiffManagement.deleteLiffApp")((id: LineLiffUid) =>
      Effect.gen(function* () {
        yield* repository.deleteLiffApp(id);
        yield* registry.invalidateLiff(id);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),
  });
});
