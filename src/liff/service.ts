import { Context, Effect, Layer, Option, Schema } from "effect";
import { LineChannelRecordId } from "../channel/domain.ts";
import { ChannelNotFoundError } from "../channel/errors.ts";
import { LineChannelRepository } from "../channel/repository.ts";
import { LineClientRegistry } from "../channel/registry.ts";
import { LineProviderRepository } from "../provider/repository.ts";
import {
  type CreateLiffAppInput,
  type UpdateLiffAppInput,
  type LineLiffApp,
  LineLiffRecordId,
  LineLiffId,
  type LiffAppView,
  LiffAppListPage,
} from "./domain.ts";
import { LiffAppNotFoundError, LiffAppDuplicateError } from "./errors.ts";
import { LineAccountPersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import { LineLiffRepository } from "./repository.ts";

export interface LineLiffManagementService {
  readonly listLiffApps: (
    channelId: LineChannelRecordId | undefined,
  ) => Effect.Effect<LiffAppListPage, LineAccountPersistenceError>;
  readonly getLiffApp: (
    id: LineLiffRecordId,
  ) => Effect.Effect<LiffAppView, LiffAppNotFoundError | LineAccountPersistenceError>;
  readonly createLiffApp: (
    input: CreateLiffAppInput,
  ) => Effect.Effect<
    LiffAppView,
    LiffAppDuplicateError | ChannelNotFoundError | LineAccountPersistenceError
  >;
  readonly updateLiffApp: (
    id: LineLiffRecordId,
    input: UpdateLiffAppInput,
  ) => Effect.Effect<LiffAppView, LiffAppNotFoundError | LineAccountPersistenceError>;
  readonly deleteLiffApp: (
    id: LineLiffRecordId,
  ) => Effect.Effect<void, LiffAppNotFoundError | LineAccountPersistenceError>;
}

export class LineLiffManagement extends Context.Service<
  LineLiffManagement,
  LineLiffManagementService
>()("effect-line-manager/LineLiffManagement") {
  static get layer() {
    return Layer.effect(LineLiffManagement)(makeLineLiffManagement);
  }
}

export const toLiffAppView = (app: LineLiffApp): LiffAppView => ({
  id: app.id,
  loginChannelId: app.loginChannelId,
  liffId: app.liffId,
  view: app.view,
  description: app.description ?? null,
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
});

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
  loginChannelId: Schema.decodeUnknownSync(LineChannelRecordId)(input.loginChannelId),
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
      (channelId: LineChannelRecordId | undefined) =>
        (channelId !== undefined
          ? repository.listLiffAppsByChannel(channelId)
          : listAllLiffApps()
        ).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toLiffAppListPage),
        ),
    ),

    getLiffApp: Effect.fn("LineLiffManagement.getLiffApp")((id: LineLiffRecordId) =>
      Effect.gen(function* () {
        const option = yield* repository.findLiffAppById(id);
        if (Option.isNone(option)) {
          return yield* new LiffAppNotFoundError({ recordId: id });
        }
        return toLiffAppView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    createLiffApp: Effect.fn("LineLiffManagement.createLiffApp")((input: CreateLiffAppInput) =>
      Effect.gen(function* () {
        const loginChannelId = Schema.decodeUnknownSync(LineChannelRecordId)(input.loginChannelId);
        const optionChannel = yield* channelRepository.findChannelById(loginChannelId);
        if (Option.isNone(optionChannel)) {
          return yield* new ChannelNotFoundError({ recordId: loginChannelId });
        }
        if (optionChannel.value.channelType !== "login") {
          return yield* new ChannelNotFoundError({ recordId: loginChannelId });
        }
        const record = yield* repository.createLiffApp(toCreateLiffAppRecordInput(input));
        yield* registry.invalidateLiff(record.id);
        return toLiffAppView(record);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateLiffApp: Effect.fn("LineLiffManagement.updateLiffApp")(
      (id: LineLiffRecordId, input: UpdateLiffAppInput) =>
        Effect.gen(function* () {
          const record = yield* repository.updateLiffApp(id, toUpdateLiffAppRecordInput(input));
          yield* registry.invalidateLiff(id);
          return toLiffAppView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    deleteLiffApp: Effect.fn("LineLiffManagement.deleteLiffApp")((id: LineLiffRecordId) =>
      Effect.gen(function* () {
        yield* repository.deleteLiffApp(id);
        yield* registry.invalidateLiff(id);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),
  });
});
