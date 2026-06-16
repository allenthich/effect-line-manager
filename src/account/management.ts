import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { Option } from "effect";
import {
  type CreateProviderInput,
  type CreateChannelInput,
  type CreateLiffAppInput,
  type UpdateProviderInput,
  type UpdateChannelInput,
  type UpdateLiffAppInput,
  type LineProvider,
  type LineChannel,
  type LineLiffApp,
  LineChannelRecordId,
  LineLiffRecordId,
  LineProviderId,
  type ProviderView,
  type ChannelView,
  type LiffAppView,
  // List pages
  ProviderListPage,
  ChannelListPage,
  LiffAppListPage,
  // Deprecated
  type CreateLineAccountInput,
  type CreateLineAccountRecordInput,
  type LineAccount,
  type LineAccountListPage,
  type LineAccountView,
  type LineChannelId,
  LineLiffId,
  type LineLoginChannelId,
  type UpdateLineAccountInput,
  type UpdateLineAccountRecordInput,
} from "./domain.ts";
import {
  ChannelNotFoundError,
  LiffAppNotFoundError,
  LineAccountPersistenceError,
  LineProviderNotFoundError,
  type ChannelDuplicateError,
  type LiffAppDuplicateError,
  type LineProviderDuplicateError,
  type LineRepositoryError,
  // Deprecated
  type LineAccountDuplicateChannelError,
  type LineAccountNotFoundError,
} from "./errors.ts";
import { LineClientRegistry } from "./registry.ts";
import { LineRepository } from "./repository.ts";

// ── Management Service Interface ──────────────────────────────────────

export interface LineAccountManagementService {
  // Providers
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

  // Channels
  readonly listChannels: (
    providerId: LineProviderId | undefined,
  ) => Effect.Effect<ChannelListPage, LineAccountPersistenceError>;
  readonly getChannel: (
    id: LineChannelRecordId,
  ) => Effect.Effect<ChannelView, ChannelNotFoundError | LineAccountPersistenceError>;
  readonly findChannelByBotUserId: (
    botUserId: string,
  ) => Effect.Effect<Option.Option<ChannelView>, LineAccountPersistenceError>;
  readonly createChannel: (
    input: CreateChannelInput,
  ) => Effect.Effect<ChannelView, ChannelDuplicateError | LineAccountPersistenceError>;
  readonly updateChannel: (
    id: LineChannelRecordId,
    input: UpdateChannelInput,
  ) => Effect.Effect<ChannelView, ChannelNotFoundError | LineAccountPersistenceError>;
  readonly deleteChannel: (
    id: LineChannelRecordId,
  ) => Effect.Effect<void, ChannelNotFoundError | LineAccountPersistenceError>;

  // LIFF Apps
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

  // Deprecated
  readonly list: Effect.Effect<LineAccountListPage, LineAccountPersistenceError>;
  readonly create: (
    input: CreateLineAccountInput,
  ) => Effect.Effect<
    LineAccountView,
    LineAccountDuplicateChannelError | LineAccountPersistenceError
  >;
  readonly update: (
    id: LineChannelRecordId,
    input: UpdateLineAccountInput,
  ) => Effect.Effect<
    LineAccountView,
    LineAccountNotFoundError | LineAccountDuplicateChannelError | LineAccountPersistenceError
  >;
  readonly delete: (
    id: LineChannelRecordId,
  ) => Effect.Effect<void, LineAccountNotFoundError | LineAccountPersistenceError>;
}

// ── Service Class ─────────────────────────────────────────────────────

export class LineAccountManagement extends Context.Service<
  LineAccountManagement,
  LineAccountManagementService
>()("effect-line-manager/LineAccountManagement") {
  static get layer() {
    return Layer.effect(LineAccountManagement)(makeLineAccountManagement);
  }
}

// ── Provider View Mappers ─────────────────────────────────────────────

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

// ── Channel View Mappers ──────────────────────────────────────────────

export const toChannelView = (channel: LineChannel): ChannelView => {
  if (channel.channelType === "messaging") {
    return {
      id: channel.id,
      channelType: "messaging" as const,
      providerId: channel.providerId,
      name: channel.name,
      channelId: channel.channelId,
      botUserId: channel.botUserId ?? null,
      basicId: channel.basicId ?? null,
      displayName: channel.displayName ?? null,
      pictureUrl: channel.pictureUrl ?? null,
      isActive: channel.isActive,
      hasChannelSecret: true,
      hasChannelAccessToken: true,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }
  return {
    id: channel.id,
    channelType: "login" as const,
    providerId: channel.providerId,
    name: channel.name,
    channelId: channel.channelId,
    hasChannelSecret: true,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
};

export const toChannelListPage = (channels: ReadonlyArray<LineChannel>): ChannelListPage => ({
  data: channels.map(toChannelView),
  pagination: {
    page: 1,
    pageSize: channels.length,
    totalItems: channels.length,
    totalPages: channels.length === 0 ? 0 : 1,
  },
});

// ── LIFF View Mappers ─────────────────────────────────────────────────

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

// ── Input Converters ──────────────────────────────────────────────────

const toCreateProviderRecordInput = (input: CreateProviderInput) => ({
  name: input.name,
});

const toUpdateProviderRecordInput = (input: UpdateProviderInput) =>
  input.name === undefined ? {} : { name: input.name };

const toCreateChannelRecordInput = (input: CreateChannelInput) => {
  const providerId = Schema.decodeUnknownSync(LineProviderId)(input.providerId);
  if (input.channelType === "messaging") {
    return {
      channelType: "messaging" as const,
      providerId,
      name: input.name,
      channelId: input.channelId,
      channelSecret: Redacted.make(input.channelSecret),
      channelAccessToken: Redacted.make(input.channelAccessToken),
    };
  }
  return {
    channelType: "login" as const,
    providerId,
    name: input.name,
    channelId: input.channelId,
    channelSecret: Redacted.make(input.channelSecret),
  };
};

const toUpdateChannelRecordInput = (input: UpdateChannelInput) => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.channelId === undefined ? {} : { channelId: input.channelId }),
  ...(input.channelSecret === undefined
    ? {}
    : { channelSecret: Redacted.make(input.channelSecret) }),
  ...(input.channelAccessToken === undefined
    ? {}
    : { channelAccessToken: Redacted.make(input.channelAccessToken) }),
  ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
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

// ── Error Handler ─────────────────────────────────────────────────────

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE account repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LineAccountPersistenceError({ operation: error.operation }))),
  );

// ── Factory Function ──────────────────────────────────────────────────

export const makeLineAccountManagement = Effect.gen(function* () {
  const repository = yield* LineRepository;
  const registry = yield* LineClientRegistry;

  // Helper: list all channels across all providers.
  // Design note: This uses an N+1 query pattern (list providers, then
  // list channels per provider). For typical deployments with 1-3 providers
  // and a handful of channels each, this is acceptable. If scaling becomes
  // a concern, add flat `listAllChannels` / `listAllLiffApps` methods to
  // the repository interface that delegate to a single query.
  const listAllChannels = () =>
    Effect.gen(function* () {
      const providers = yield* repository.listProviders;
      const channelArrays = yield* Effect.all(
        providers.map((p) => repository.listChannelsByProvider(p.id)),
      );
      return channelArrays.flat();
    });

  // Helper: list all LIFF apps across all channels
  const listAllLiffApps = () =>
    Effect.gen(function* () {
      const providers = yield* repository.listProviders;
      const allChannels = yield* Effect.all(
        providers.map((p) => repository.listChannelsByProvider(p.id)),
      );
      const flatChannels = allChannels.flat();
      const liffArrays = yield* Effect.all(
        flatChannels.map((c) => repository.listLiffAppsByChannel(c.id)),
      );
      return liffArrays.flat();
    });

  return LineAccountManagement.of({
    // Providers
    listProviders: repository.listProviders.pipe(
      Effect.catchTag("LineRepositoryError", persistenceFailure),
      Effect.map(toProviderListPage),
      Effect.withSpan("LineAccountManagement.listProviders"),
    ),

    getProvider: Effect.fn("LineAccountManagement.getProvider")((id: LineProviderId) =>
      Effect.gen(function* () {
        const option = yield* repository.findProviderById(id);
        if (Option.isNone(option)) {
          return yield* new LineProviderNotFoundError({ providerId: id });
        }
        return toProviderView(option.value);
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.getProvider"),
      ),
    ),

    createProvider: Effect.fn("LineAccountManagement.createProvider")(
      (input: CreateProviderInput) =>
        repository
          .createProvider(toCreateProviderRecordInput(input))
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(toProviderView),
          ),
    ),

    updateProvider: Effect.fn("LineAccountManagement.updateProvider")(
      (id: LineProviderId, input: UpdateProviderInput) =>
        repository
          .updateProvider(id, toUpdateProviderRecordInput(input))
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(toProviderView),
          ),
    ),

    deleteProvider: Effect.fn("LineAccountManagement.deleteProvider")((id: LineProviderId) =>
      Effect.gen(function* () {
        yield* repository.deleteProvider(id);
        // Provider deletion cascades to child channels and LIFF apps.
        yield* registry.invalidateAll;
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.deleteProvider"),
      ),
    ),

    // Channels
    listChannels: Effect.fn("LineAccountManagement.listChannels")(
      (providerId: LineProviderId | undefined) =>
        (providerId !== undefined
          ? repository.listChannelsByProvider(providerId)
          : listAllChannels()
        ).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toChannelListPage),
          Effect.withSpan("LineAccountManagement.listChannels"),
        ),
    ),

    getChannel: Effect.fn("LineAccountManagement.getChannel")((id: LineChannelRecordId) =>
      Effect.gen(function* () {
        const option = yield* repository.findChannelById(id);
        if (Option.isNone(option)) {
          return yield* new ChannelNotFoundError({ recordId: id });
        }
        return toChannelView(option.value);
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.getChannel"),
      ),
    ),

    findChannelByBotUserId: Effect.fn("LineAccountManagement.findChannelByBotUserId")(
      (botUserId: string) =>
        repository
          .findChannelByBotUserId(botUserId)
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(Option.map(toChannelView)),
            Effect.withSpan("LineAccountManagement.findChannelByBotUserId"),
          ),
    ),

    createChannel: Effect.fn("LineAccountManagement.createChannel")((input: CreateChannelInput) =>
      Effect.gen(function* () {
        const record = yield* repository.createChannel(toCreateChannelRecordInput(input));
        yield* registry.invalidateChannel(record.id);
        return toChannelView(record);
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.createChannel"),
      ),
    ),

    updateChannel: Effect.fn("LineAccountManagement.updateChannel")(
      (id: LineChannelRecordId, input: UpdateChannelInput) =>
        Effect.gen(function* () {
          const record = yield* repository.updateChannel(id, toUpdateChannelRecordInput(input));
          yield* registry.invalidateChannel(id);
          return toChannelView(record);
        }).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.withSpan("LineAccountManagement.updateChannel"),
        ),
    ),

    deleteChannel: Effect.fn("LineAccountManagement.deleteChannel")((id: LineChannelRecordId) =>
      Effect.gen(function* () {
        yield* repository.deleteChannel(id);
        // Channel deletion can cascade to LIFF apps, so clear descendant caches too.
        yield* registry.invalidateAll;
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.deleteChannel"),
      ),
    ),

    // LIFF Apps
    listLiffApps: Effect.fn("LineAccountManagement.listLiffApps")(
      (channelId: LineChannelRecordId | undefined) =>
        (channelId !== undefined
          ? repository.listLiffAppsByChannel(channelId)
          : listAllLiffApps()
        ).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toLiffAppListPage),
          Effect.withSpan("LineAccountManagement.listLiffApps"),
        ),
    ),

    getLiffApp: Effect.fn("LineAccountManagement.getLiffApp")((id: LineLiffRecordId) =>
      Effect.gen(function* () {
        const option = yield* repository.findLiffAppById(id);
        if (Option.isNone(option)) {
          return yield* new LiffAppNotFoundError({ recordId: id });
        }
        return toLiffAppView(option.value);
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.getLiffApp"),
      ),
    ),

    createLiffApp: Effect.fn("LineAccountManagement.createLiffApp")((input: CreateLiffAppInput) =>
      Effect.gen(function* () {
        // Verify loginChannelId references a LoginChannel
        const loginChannelId = Schema.decodeUnknownSync(LineChannelRecordId)(input.loginChannelId);
        const optionChannel = yield* repository.findChannelById(loginChannelId);
        if (Option.isNone(optionChannel)) {
          return yield* new ChannelNotFoundError({ recordId: loginChannelId });
        }
        if (optionChannel.value.channelType !== "login") {
          return yield* new ChannelNotFoundError({ recordId: loginChannelId });
        }
        const record = yield* repository.createLiffApp(toCreateLiffAppRecordInput(input));
        yield* registry.invalidateLiff(record.id);
        return toLiffAppView(record);
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.createLiffApp"),
      ),
    ),

    updateLiffApp: Effect.fn("LineAccountManagement.updateLiffApp")(
      (id: LineLiffRecordId, input: UpdateLiffAppInput) =>
        Effect.gen(function* () {
          const record = yield* repository.updateLiffApp(id, toUpdateLiffAppRecordInput(input));
          yield* registry.invalidateLiff(id);
          return toLiffAppView(record);
        }).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.withSpan("LineAccountManagement.updateLiffApp"),
        ),
    ),

    deleteLiffApp: Effect.fn("LineAccountManagement.deleteLiffApp")((id: LineLiffRecordId) =>
      Effect.gen(function* () {
        yield* repository.deleteLiffApp(id);
        yield* registry.invalidateLiff(id);
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.withSpan("LineAccountManagement.deleteLiffApp"),
      ),
    ),

    // Deprecated
    list: repository.listAll.pipe(
      Effect.catchTag("LineRepositoryError", persistenceFailure),
      Effect.map(toLineAccountListPage),
      Effect.withSpan("LineAccountManagement.list"),
    ),

    create: Effect.fn("LineAccountManagement.create")((input: CreateLineAccountInput) =>
      repository.create(toCreateLineAccountRecordInput(input)).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.tap((account) => registry.invalidate(account.id)),
        Effect.map(toLineAccountView),
        Effect.withSpan("LineAccountManagement.create"),
      ),
    ),

    update: Effect.fn("LineAccountManagement.update")(
      (id: LineChannelRecordId, input: UpdateLineAccountInput) =>
        repository.update(id, toUpdateLineAccountRecordInput(input)).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.tap(() => registry.invalidate(id)),
          Effect.map(toLineAccountView),
          Effect.withSpan("LineAccountManagement.update"),
        ),
    ),

    delete: Effect.fn("LineAccountManagement.delete")((id: LineChannelRecordId) =>
      repository
        .deleteById(id)
        .pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.andThen(registry.invalidate(id)),
          Effect.withSpan("LineAccountManagement.delete"),
        ),
    ),
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DEPRECATED — kept for backward compatibility
// ═══════════════════════════════════════════════════════════════════════

export const toLineAccountView = (account: LineAccount): LineAccountView => ({
  id: account.id,
  name: account.name,
  channelId: account.channelId,
  botUserId: account.botUserId ?? null,
  basicId: account.basicId ?? null,
  displayName: account.displayName ?? null,
  pictureUrl: account.pictureUrl ?? null,
  isActive: account.isActive,
  loginChannelId: account.loginChannelId,
  liffId: account.liffId,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
  hasChannelSecret: true,
  hasChannelAccessToken: true,
  hasLoginChannelSecret: account.loginChannelSecret !== null,
});

export const toLineAccountListPage = (
  accounts: ReadonlyArray<LineAccount>,
): LineAccountListPage => ({
  data: accounts.map(toLineAccountView),
  pagination: {
    page: 1,
    pageSize: accounts.length,
    totalItems: accounts.length,
    totalPages: accounts.length === 0 ? 0 : 1,
  },
});

const toCreateLineAccountRecordInput = (
  input: CreateLineAccountInput,
): CreateLineAccountRecordInput => ({
  name: input.name,
  channelId: input.channelId as LineChannelId,
  channelSecret: Redacted.make(input.channelSecret),
  channelAccessToken: Redacted.make(input.channelAccessToken),
  loginChannelId:
    input.loginChannelId === undefined ? null : (input.loginChannelId as LineLoginChannelId | null),
  loginChannelSecret:
    input.loginChannelSecret === undefined || input.loginChannelSecret === null
      ? null
      : Redacted.make(input.loginChannelSecret),
  liffId: input.liffId === undefined ? null : (input.liffId as LineLiffId | null),
});

const toUpdateLineAccountRecordInput = (
  input: UpdateLineAccountInput,
): UpdateLineAccountRecordInput => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.channelId === undefined ? {} : { channelId: input.channelId as LineChannelId }),
  ...(input.channelSecret === undefined
    ? {}
    : { channelSecret: Redacted.make(input.channelSecret) }),
  ...(input.channelAccessToken === undefined
    ? {}
    : { channelAccessToken: Redacted.make(input.channelAccessToken) }),
  ...(input.loginChannelId === undefined
    ? {}
    : { loginChannelId: input.loginChannelId as LineLoginChannelId | null }),
  ...(input.loginChannelSecret === undefined
    ? {}
    : {
        loginChannelSecret:
          input.loginChannelSecret === null ? null : Redacted.make(input.loginChannelSecret),
      }),
  ...(input.liffId === undefined ? {} : { liffId: input.liffId as LineLiffId | null }),
  ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
});
