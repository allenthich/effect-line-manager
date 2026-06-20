import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { LineProviderId } from "../provider/domain.ts";
import { LineProviderRepository } from "../provider/repository.ts";
import {
  type CreateChannelInput,
  type UpdateChannelInput,
  type LineChannel,
  LineChannelUid,
  type ChannelView,
  ChannelListPage,
} from "./domain.ts";
import { ChannelNotFoundError, ChannelDuplicateError } from "./errors.ts";
import { LinePersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import { LineClientRegistry } from "../registry/index.ts";
import { InternalLineChannelStore } from "../internal/channel-store.ts";

/** Service interface for LINE channel management operations. */
export interface LineChannelManagementService {
  readonly listChannels: (
    providerId: LineProviderId | undefined,
  ) => Effect.Effect<ChannelListPage, LinePersistenceError>;
  readonly getChannel: (
    id: LineChannelUid,
  ) => Effect.Effect<ChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly findChannelByBotUserId: (
    botUserId: string,
  ) => Effect.Effect<Option.Option<ChannelView>, LinePersistenceError>;
  readonly createChannel: (
    input: CreateChannelInput,
  ) => Effect.Effect<ChannelView, ChannelDuplicateError | LinePersistenceError>;
  readonly updateChannel: (
    id: LineChannelUid,
    input: UpdateChannelInput,
  ) => Effect.Effect<ChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly deleteChannel: (
    id: LineChannelUid,
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

/** Converts an array of domain channel entities to a paginated list view. */
export const toChannelListPage = (channels: ReadonlyArray<LineChannel>): ChannelListPage => ({
  data: channels.map(toChannelView),
  pagination: {
    page: 1,
    pageSize: channels.length,
    totalItems: channels.length,
    totalPages: channels.length === 0 ? 0 : 1,
  },
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

  const listAllChannels = () =>
    Effect.gen(function* () {
      const providers = yield* providerRepository.listProviders;
      const channelArrays = yield* Effect.all(
        providers.map((p) => repository.listByProvider(p.id)),
      );
      return channelArrays.flat();
    });

  return LineChannelManagement.of({
    listChannels: Effect.fn("LineChannelManagement.listChannels")(
      (providerId: LineProviderId | undefined) =>
        (providerId !== undefined ? repository.listByProvider(providerId) : listAllChannels()).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toChannelListPage),
        ),
    ),

    getChannel: Effect.fn("LineChannelManagement.getChannel")((id: LineChannelUid) =>
      Effect.gen(function* () {
        const option = yield* repository.findByUid(id);
        if (Option.isNone(option)) {
          return yield* new ChannelNotFoundError({ uid: id });
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
        yield* registry.invalidateChannel(record.id);
        return toChannelView(record);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateChannel: Effect.fn("LineChannelManagement.updateChannel")(
      (id: LineChannelUid, input: UpdateChannelInput) =>
        Effect.gen(function* () {
          const record = yield* repository.update(id, toUpdateChannelRecordInput(input));
          yield* registry.invalidateChannel(id);
          return toChannelView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    deleteChannel: Effect.fn("LineChannelManagement.deleteChannel")((id: LineChannelUid) =>
      Effect.gen(function* () {
        yield* repository.delete(id);
        // Channel deletion can cascade to LIFF apps, so clear descendant caches too.
        yield* registry.invalidateAll;
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),
  });
});
