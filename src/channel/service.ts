import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { LineProviderId } from "../provider/domain.ts";
import { LineProviderRepository } from "../provider/repository.ts";
import {
  type CreateChannelInput,
  type UpdateChannelInput,
  type LineChannel,
  LineChannelId,
  type ChannelView,
  ChannelListPage,
  type ListChannelsQuery,
} from "./domain.ts";
import { ChannelNotFoundError, ChannelDuplicateError } from "./errors.ts";
import { LinePersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import {
  normalizePageQuery,
  paginate,
  type NormalizedPageQuery,
  type PageResult,
} from "../shared/domain.ts";
import { LineClientRegistry } from "../registry/index.ts";
import { InternalLineChannelStore } from "../internal/channel-store.ts";

/** Service interface for LINE channel management operations. */
export interface LineChannelManagementService {
  readonly listChannels: (
    query: ListChannelsQuery,
  ) => Effect.Effect<ChannelListPage, LinePersistenceError>;
  readonly getChannel: (
    id: LineChannelId,
  ) => Effect.Effect<ChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly findChannelByBotUserId: (
    botUserId: string,
  ) => Effect.Effect<Option.Option<ChannelView>, LinePersistenceError>;
  readonly createChannel: (
    input: CreateChannelInput,
  ) => Effect.Effect<ChannelView, ChannelDuplicateError | LinePersistenceError>;
  readonly updateChannel: (
    id: LineChannelId,
    input: UpdateChannelInput,
  ) => Effect.Effect<ChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly deleteChannel: (
    id: LineChannelId,
  ) => Effect.Effect<void, ChannelNotFoundError | LinePersistenceError>;
}

/** Service implementation for LINE channel management. */
export class LineChannelManagement extends Context.Service<
  LineChannelManagement,
  LineChannelManagementService
>()("effect-line-manager/LineChannelManagement") {
  static get layer() {
    return Layer.effect(LineChannelManagement)(makeLineChannelManagement);
  }
}

/** Converts a domain channel entity to a public-facing view. */
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
      channelSecret: Redacted.value(channel.channelSecret),
      channelAccessToken: Redacted.value(channel.channelAccessToken),
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
    channelSecret: Redacted.value(channel.channelSecret),
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
};

/** Converts a paginated page of domain channel entities to a list page of views. */
export const toChannelListPage = (page: PageResult<LineChannel>): ChannelListPage => ({
  data: page.data.map(toChannelView),
  pagination: page.pagination,
});

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
      ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
      ...(input.botUserId === undefined ? {} : { botUserId: input.botUserId }),
      ...(input.basicId === undefined ? {} : { basicId: input.basicId }),
      ...(input.pictureUrl === undefined ? {} : { pictureUrl: input.pictureUrl }),
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
  ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
  ...(input.botUserId === undefined ? {} : { botUserId: input.botUserId }),
  ...(input.basicId === undefined ? {} : { basicId: input.basicId }),
  ...(input.pictureUrl === undefined ? {} : { pictureUrl: input.pictureUrl }),
});

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE channel repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LinePersistenceError({ operation: error.operation }))),
  );

/** Constructs the LINE channel management service with its dependencies. */
export const makeLineChannelManagement = Effect.gen(function* () {
  const repository = yield* InternalLineChannelStore;
  const providerRepository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  const listAllChannels = (query: NormalizedPageQuery) =>
    Effect.gen(function* () {
      // Page through every provider's channels without pagination, so we can
      // re-paginate the combined list. Providers are typically few (single
      // digits), but each may own many channels — a real backend should
      // provide a single `listAllChannels(query)` repository method.
      const unboundedQuery: NormalizedPageQuery = { page: 1, pageSize: 100 };
      const providers = yield* providerRepository.listProviders(unboundedQuery);
      const channelPages = yield* Effect.all(
        providers.data.map((p) => repository.listByProvider(p.id, unboundedQuery)),
      );
      const allChannels = channelPages.flatMap((p) => p.data);
      return paginate(allChannels, query);
    });

  return LineChannelManagement.of({
    listChannels: Effect.fn("LineChannelManagement.listChannels")((query: ListChannelsQuery) => {
      const normalized = normalizePageQuery(query);
      const providerId = query.providerId
        ? Schema.decodeUnknownSync(LineProviderId)(query.providerId)
        : undefined;
      return (
        providerId !== undefined
          ? repository.listByProvider(providerId, normalized)
          : listAllChannels(normalized)
      ).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.map(toChannelListPage),
      );
    }),

    getChannel: Effect.fn("LineChannelManagement.getChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        const option = yield* repository.findByLineChannelId(id);
        if (Option.isNone(option)) {
          return yield* new ChannelNotFoundError({ channelId: id });
        }
        return toChannelView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    findChannelByBotUserId: Effect.fn("LineChannelManagement.findChannelByBotUserId")(
      (botUserId: string) =>
        repository
          .findByBotUserId(botUserId)
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(Option.map(toChannelView)),
          ),
    ),

    createChannel: Effect.fn("LineChannelManagement.createChannel")((input: CreateChannelInput) =>
      Effect.gen(function* () {
        const record = yield* repository.create(toCreateChannelRecordInput(input));
        yield* registry.invalidateChannel(
          Schema.decodeUnknownSync(LineChannelId)(record.channelId),
        );
        return toChannelView(record);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateChannel: Effect.fn("LineChannelManagement.updateChannel")(
      (id: LineChannelId, input: UpdateChannelInput) =>
        Effect.gen(function* () {
          const record = yield* repository.update(id, toUpdateChannelRecordInput(input));
          yield* registry.invalidateChannel(
            Schema.decodeUnknownSync(LineChannelId)(record.channelId),
          );
          return toChannelView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    deleteChannel: Effect.fn("LineChannelManagement.deleteChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        yield* repository.delete(id);
        // Channel deletion can cascade to LIFF apps, so clear descendant caches too.
        yield* registry.invalidateAll;
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),
  });
});
