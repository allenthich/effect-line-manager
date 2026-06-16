import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { LineProviderId } from "../provider/domain.ts";
import { LineProviderRepository } from "../provider/repository.ts";
import {
  type CreateChannelInput,
  type UpdateChannelInput,
  type LineChannel,
  LineChannelRecordId,
  type ChannelView,
  ChannelListPage,
} from "./domain.ts";
import { ChannelNotFoundError, ChannelDuplicateError } from "./errors.ts";
import { LineAccountPersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import { LineClientRegistry } from "./registry.ts";
import { LineChannelRepository } from "./repository.ts";

export interface LineChannelManagementService {
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
}

export class LineChannelManagement extends Context.Service<
  LineChannelManagement,
  LineChannelManagementService
>()("effect-line-manager/LineChannelManagement") {
  static get layer() {
    return Layer.effect(LineChannelManagement)(makeLineChannelManagement);
  }
}

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

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE channel repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LineAccountPersistenceError({ operation: error.operation }))),
  );

export const makeLineChannelManagement = Effect.gen(function* () {
  const repository = yield* LineChannelRepository;
  const providerRepository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  const listAllChannels = () =>
    Effect.gen(function* () {
      const providers = yield* providerRepository.listProviders;
      const channelArrays = yield* Effect.all(
        providers.map((p) => repository.listChannelsByProvider(p.id)),
      );
      return channelArrays.flat();
    });

  return LineChannelManagement.of({
    listChannels: Effect.fn("LineChannelManagement.listChannels")(
      (providerId: LineProviderId | undefined) =>
        (providerId !== undefined
          ? repository.listChannelsByProvider(providerId)
          : listAllChannels()
        ).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toChannelListPage),
        ),
    ),

    getChannel: Effect.fn("LineChannelManagement.getChannel")((id: LineChannelRecordId) =>
      Effect.gen(function* () {
        const option = yield* repository.findChannelById(id);
        if (Option.isNone(option)) {
          return yield* new ChannelNotFoundError({ recordId: id });
        }
        return toChannelView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    findChannelByBotUserId: Effect.fn("LineChannelManagement.findChannelByBotUserId")(
      (botUserId: string) =>
        repository
          .findChannelByBotUserId(botUserId)
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(Option.map(toChannelView)),
          ),
    ),

    createChannel: Effect.fn("LineChannelManagement.createChannel")((input: CreateChannelInput) =>
      Effect.gen(function* () {
        const record = yield* repository.createChannel(toCreateChannelRecordInput(input));
        yield* registry.invalidateChannel(record.id);
        return toChannelView(record);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateChannel: Effect.fn("LineChannelManagement.updateChannel")(
      (id: LineChannelRecordId, input: UpdateChannelInput) =>
        Effect.gen(function* () {
          const record = yield* repository.updateChannel(id, toUpdateChannelRecordInput(input));
          yield* registry.invalidateChannel(id);
          return toChannelView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    deleteChannel: Effect.fn("LineChannelManagement.deleteChannel")((id: LineChannelRecordId) =>
      Effect.gen(function* () {
        yield* repository.deleteChannel(id);
        // Channel deletion can cascade to LIFF apps, so clear descendant caches too.
        yield* registry.invalidateAll;
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),
  });
});
