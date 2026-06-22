import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { LineClientRegistry } from "../registry/index.ts";
import {
  LinePersistenceError,
  type LineRepositoryError,
  ChannelNotFoundError,
  ChannelDuplicateError,
} from "../shared/errors.ts";
import {
  LineChannelId,
  LineMessagingChannelId,
  LineLoginChannelId,
  LineBotUserId,
} from "../shared/domain.ts";
import { LineProviderId } from "../provider/domain.ts";
import { LineProviderRepository } from "../provider/repository.ts";
import {
  normalizePageQuery,
  paginate,
  type NormalizedPageQuery,
  type PageResult,
} from "../shared/domain.ts";
import { type MessagingChannel, type LoginChannel } from "./domain.ts";
import type {
  CreateMessagingChannelInput,
  UpdateMessagingChannelInput,
  CreateLoginChannelInput,
  UpdateLoginChannelInput,
} from "./domain.ts";
import { MessagingChannelNotFoundError, LoginChannelNotFoundError } from "./errors.ts";
import {
  type CreateLineMessagingChannelInput,
  type UpdateLineMessagingChannelInput,
  type CreateLineLoginChannelInput,
  type UpdateLineLoginChannelInput,
  type ListLineMessagingChannelsQuery,
  type ListLineLoginChannelsQuery,
  type LineMessagingChannelView,
  type LineLoginChannelView,
  type LineMessagingChannelListPage,
  type LineLoginChannelListPage,
} from "./management-domain.ts";
import { LineMessagingChannelRepository, LineLoginChannelRepository } from "./repository.ts";

//#region Shared helpers

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE channel repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LinePersistenceError({ operation: error.operation }))),
  );

const decodeProviderId = Schema.decodeUnknownSync(LineProviderId);
const decodeSharedLineChannelId = Schema.decodeUnknownSync(LineChannelId);
const decodeMessagingId = Schema.decodeUnknownSync(LineMessagingChannelId);
const decodeLoginId = Schema.decodeUnknownSync(LineLoginChannelId);
const decodeBotUserId = Schema.decodeUnknownSync(LineBotUserId);

//#endregion

//#region Messaging management

/** Service interface for LINE Messaging channel management operations. */
export interface LineMessagingChannelManagementService {
  readonly listChannels: (
    query: ListLineMessagingChannelsQuery,
  ) => Effect.Effect<LineMessagingChannelListPage, LinePersistenceError>;
  readonly getChannel: (
    id: LineChannelId,
  ) => Effect.Effect<LineMessagingChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly findChannelByBotUserId: (
    botUserId: string,
  ) => Effect.Effect<Option.Option<LineMessagingChannelView>, LinePersistenceError>;
  readonly createChannel: (
    input: CreateLineMessagingChannelInput,
  ) => Effect.Effect<LineMessagingChannelView, ChannelDuplicateError | LinePersistenceError>;
  readonly updateChannel: (
    id: LineChannelId,
    input: UpdateLineMessagingChannelInput,
  ) => Effect.Effect<LineMessagingChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly deleteChannel: (
    id: LineChannelId,
  ) => Effect.Effect<void, ChannelNotFoundError | LinePersistenceError>;
}

/**
 * Management service for LINE Messaging API channels.
 *
 * Provides external-input CRUD over the messaging channel aggregate. Distinguished
 * from {@link LineMessagingChannelService} (which returns runtime `LineApiClient`
 * and access tokens from the registry) by handling caller-supplied record mutation.
 */
export class LineMessagingChannelManagement extends Context.Service<
  LineMessagingChannelManagement,
  LineMessagingChannelManagementService
>()("effect-line-manager/LineMessagingChannelManagement") {
  static get layer() {
    return Layer.effect(LineMessagingChannelManagement)(makeLineMessagingChannelManagement);
  }
}

/** Converts a Messaging channel domain record to a public-facing view. */
export const toMessagingChannelView = (channel: MessagingChannel): LineMessagingChannelView => ({
  id: channel.id,
  channelType: "messaging",
  providerId: channel.providerId,
  name: channel.name,
  channelId: channel.channelId,
  botUserId: channel.botUserId ?? null,
  botBasicId: channel.botBasicId ?? null,
  botDisplayName: channel.botDisplayName ?? null,
  botPictureUrl: channel.botPictureUrl ?? null,
  addFriendUrl: channel.addFriendUrl ?? null,
  addFriendQrCodeUrl: channel.addFriendQrCodeUrl ?? null,
  isActive: channel.isActive,
  channelSecret: Redacted.value(channel.channelSecret),
  channelAccessToken: Redacted.value(channel.channelAccessToken),
  createdAt: channel.createdAt,
  updatedAt: channel.updatedAt,
});

/** Converts a paginated page of Messaging channel records to a list page of views. */
export const toMessagingChannelListPage = (
  page: PageResult<MessagingChannel>,
): LineMessagingChannelListPage => ({
  data: page.data.map(toMessagingChannelView),
  pagination: page.pagination,
});

const toCreateMessagingRepoInput = (
  input: CreateLineMessagingChannelInput,
): CreateMessagingChannelInput => ({
  channelType: "messaging",
  providerId: decodeProviderId(input.providerId),
  name: input.name,
  channelId: input.channelId,
  channelSecret: Redacted.make(input.channelSecret),
  channelAccessToken: Redacted.make(input.channelAccessToken),
  ...(input.botDisplayName === undefined ? {} : { botDisplayName: input.botDisplayName }),
  ...(input.botUserId === undefined ? {} : { botUserId: input.botUserId }),
  ...(input.botBasicId === undefined ? {} : { botBasicId: input.botBasicId }),
  ...(input.botPictureUrl === undefined ? {} : { botPictureUrl: input.botPictureUrl }),
  ...(input.addFriendUrl === undefined ? {} : { addFriendUrl: input.addFriendUrl }),
  ...(input.addFriendQrCodeUrl === undefined
    ? {}
    : { addFriendQrCodeUrl: input.addFriendQrCodeUrl }),
});

const toUpdateMessagingRepoInput = (
  input: UpdateLineMessagingChannelInput,
): UpdateMessagingChannelInput => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.channelId === undefined ? {} : { channelId: input.channelId }),
  ...(input.channelSecret === undefined
    ? {}
    : { channelSecret: Redacted.make(input.channelSecret) }),
  ...(input.channelAccessToken === undefined
    ? {}
    : { channelAccessToken: Redacted.make(input.channelAccessToken) }),
  ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  ...(input.botDisplayName === undefined ? {} : { botDisplayName: input.botDisplayName }),
  ...(input.botUserId === undefined ? {} : { botUserId: input.botUserId }),
  ...(input.botBasicId === undefined ? {} : { botBasicId: input.botBasicId }),
  ...(input.botPictureUrl === undefined ? {} : { botPictureUrl: input.botPictureUrl }),
  ...(input.addFriendUrl === undefined ? {} : { addFriendUrl: input.addFriendUrl }),
  ...(input.addFriendQrCodeUrl === undefined
    ? {}
    : { addFriendQrCodeUrl: input.addFriendQrCodeUrl }),
});

const toMessagingNotFound = (e: MessagingChannelNotFoundError) =>
  new ChannelNotFoundError({ channelId: decodeSharedLineChannelId(e.channelId) });

/** Constructs the LINE Messaging channel management service with its dependencies. */
export const makeLineMessagingChannelManagement = Effect.gen(function* () {
  const repository = yield* LineMessagingChannelRepository;
  const providerRepository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  const listAllMessagingChannels = (query: NormalizedPageQuery) =>
    Effect.gen(function* () {
      // Page through every provider's messaging channels without pagination, so
      // we can re-paginate the combined list. Providers are typically few; each
      // may own many channels. A real backend should expose a single
      // `listAllMessagingChannels(query)` repository method.
      const unboundedQuery: NormalizedPageQuery = { page: 1, pageSize: 100 };
      const providers = yield* providerRepository.listProviders(unboundedQuery);
      const pages = yield* Effect.all(
        providers.data.map((p) => repository.listByProvider(p.id, unboundedQuery)),
        { concurrency: "unbounded" },
      );
      const all: MessagingChannel[] = pages.flatMap((p) => p.data);
      return paginate(all, query);
    });

  return LineMessagingChannelManagement.of({
    listChannels: Effect.fn("LineMessagingChannelManagement.listChannels")(
      (query: ListLineMessagingChannelsQuery) => {
        const normalized = normalizePageQuery(query);
        const providerId = query.providerId ? decodeProviderId(query.providerId) : undefined;
        return (
          providerId === undefined
            ? listAllMessagingChannels(normalized)
            : repository.listByProvider(providerId, normalized)
        ).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toMessagingChannelListPage),
        );
      },
    ),

    getChannel: Effect.fn("LineMessagingChannelManagement.getChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        const messagingId = decodeMessagingId(id);
        const option = yield* repository.findByLineChannelId(messagingId);
        if (Option.isNone(option)) {
          return yield* new ChannelNotFoundError({ channelId: id });
        }
        return toMessagingChannelView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    findChannelByBotUserId: Effect.fn("LineMessagingChannelManagement.findChannelByBotUserId")(
      (botUserId: string) =>
        repository
          .findByBotUserId(decodeBotUserId(botUserId))
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(Option.map(toMessagingChannelView)),
          ),
    ),

    createChannel: Effect.fn("LineMessagingChannelManagement.createChannel")(
      (input: CreateLineMessagingChannelInput) =>
        Effect.gen(function* () {
          const record = yield* repository.create(toCreateMessagingRepoInput(input));
          yield* registry.invalidateChannel(decodeSharedLineChannelId(record.channelId));
          return toMessagingChannelView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateChannel: Effect.fn("LineMessagingChannelManagement.updateChannel")(
      (id: LineChannelId, input: UpdateLineMessagingChannelInput) =>
        Effect.gen(function* () {
          const messagingId = decodeMessagingId(id);
          const updated = yield* repository.update(messagingId, toUpdateMessagingRepoInput(input));
          yield* registry.invalidateChannel(decodeSharedLineChannelId(updated.channelId));
          return toMessagingChannelView(updated);
        }).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.catchTag("MessagingChannelNotFoundError", toMessagingNotFound),
        ),
    ),

    deleteChannel: Effect.fn("LineMessagingChannelManagement.deleteChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        const messagingId = decodeMessagingId(id);
        yield* repository.delete(messagingId);
        yield* registry.invalidateAll;
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.catchTag("MessagingChannelNotFoundError", toMessagingNotFound),
      ),
    ),
  });
});

//#endregion

//#region Login management

/** Service interface for LINE Login channel management operations. */
export interface LineLoginChannelManagementService {
  readonly listChannels: (
    query: ListLineLoginChannelsQuery,
  ) => Effect.Effect<LineLoginChannelListPage, LinePersistenceError>;
  readonly getChannel: (
    id: LineChannelId,
  ) => Effect.Effect<LineLoginChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly createChannel: (
    input: CreateLineLoginChannelInput,
  ) => Effect.Effect<LineLoginChannelView, ChannelDuplicateError | LinePersistenceError>;
  readonly updateChannel: (
    id: LineChannelId,
    input: UpdateLineLoginChannelInput,
  ) => Effect.Effect<LineLoginChannelView, ChannelNotFoundError | LinePersistenceError>;
  readonly deleteChannel: (
    id: LineChannelId,
  ) => Effect.Effect<void, ChannelNotFoundError | LinePersistenceError>;
}

/**
 * Management service for LINE Login channels.
 *
 * Provides external-input CRUD over the login channel aggregate. Does not
 * expose `findChannelByBotUserId` — that operation is messaging-only.
 */
export class LineLoginChannelManagement extends Context.Service<
  LineLoginChannelManagement,
  LineLoginChannelManagementService
>()("effect-line-manager/LineLoginChannelManagement") {
  static get layer() {
    return Layer.effect(LineLoginChannelManagement)(makeLineLoginChannelManagement);
  }
}

/** Converts a Login channel domain record to a public-facing view. */
export const toLoginChannelView = (channel: LoginChannel): LineLoginChannelView => ({
  id: channel.id,
  channelType: "login",
  providerId: channel.providerId,
  name: channel.name,
  channelId: channel.channelId,
  channelSecret: Redacted.value(channel.channelSecret),
  createdAt: channel.createdAt,
  updatedAt: channel.updatedAt,
});

/** Converts a paginated page of Login channel records to a list page of views. */
export const toLoginChannelListPage = (
  page: PageResult<LoginChannel>,
): LineLoginChannelListPage => ({
  data: page.data.map(toLoginChannelView),
  pagination: page.pagination,
});

const toCreateLoginRepoInput = (input: CreateLineLoginChannelInput): CreateLoginChannelInput => ({
  channelType: "login",
  providerId: decodeProviderId(input.providerId),
  name: input.name,
  channelId: input.channelId,
  channelSecret: Redacted.make(input.channelSecret),
});

const toUpdateLoginRepoInput = (input: UpdateLineLoginChannelInput): UpdateLoginChannelInput => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.channelId === undefined ? {} : { channelId: input.channelId }),
  ...(input.channelSecret === undefined
    ? {}
    : { channelSecret: Redacted.make(input.channelSecret) }),
});

const toLoginNotFound = (e: LoginChannelNotFoundError) =>
  new ChannelNotFoundError({ channelId: decodeSharedLineChannelId(e.channelId) });

/** Constructs the LINE Login channel management service with its dependencies. */
export const makeLineLoginChannelManagement = Effect.gen(function* () {
  const repository = yield* LineLoginChannelRepository;
  const providerRepository = yield* LineProviderRepository;
  const registry = yield* LineClientRegistry;

  const listAllLoginChannels = (query: NormalizedPageQuery) =>
    Effect.gen(function* () {
      const unboundedQuery: NormalizedPageQuery = { page: 1, pageSize: 100 };
      const providers = yield* providerRepository.listProviders(unboundedQuery);
      const pages = yield* Effect.all(
        providers.data.map((p) => repository.listByProvider(p.id, unboundedQuery)),
        { concurrency: "unbounded" },
      );
      const all: LoginChannel[] = pages.flatMap((p) => p.data);
      return paginate(all, query);
    });

  return LineLoginChannelManagement.of({
    listChannels: Effect.fn("LineLoginChannelManagement.listChannels")(
      (query: ListLineLoginChannelsQuery) => {
        const normalized = normalizePageQuery(query);
        const providerId = query.providerId ? decodeProviderId(query.providerId) : undefined;
        return (
          providerId === undefined
            ? listAllLoginChannels(normalized)
            : repository.listByProvider(providerId, normalized)
        ).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toLoginChannelListPage),
        );
      },
    ),

    getChannel: Effect.fn("LineLoginChannelManagement.getChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        const loginId = decodeLoginId(id);
        const option = yield* repository.findByLineChannelId(loginId);
        if (Option.isNone(option)) {
          return yield* new ChannelNotFoundError({ channelId: id });
        }
        return toLoginChannelView(option.value);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    createChannel: Effect.fn("LineLoginChannelManagement.createChannel")(
      (input: CreateLineLoginChannelInput) =>
        Effect.gen(function* () {
          const record = yield* repository.create(toCreateLoginRepoInput(input));
          yield* registry.invalidateChannel(decodeSharedLineChannelId(record.channelId));
          return toLoginChannelView(record);
        }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateChannel: Effect.fn("LineLoginChannelManagement.updateChannel")(
      (id: LineChannelId, input: UpdateLineLoginChannelInput) =>
        Effect.gen(function* () {
          const loginId = decodeLoginId(id);
          const updated = yield* repository.update(loginId, toUpdateLoginRepoInput(input));
          yield* registry.invalidateChannel(decodeSharedLineChannelId(updated.channelId));
          return toLoginChannelView(updated);
        }).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.catchTag("LoginChannelNotFoundError", toLoginNotFound),
        ),
    ),

    deleteChannel: Effect.fn("LineLoginChannelManagement.deleteChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        const loginId = decodeLoginId(id);
        yield* repository.delete(loginId);
        yield* registry.invalidateAll;
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.catchTag("LoginChannelNotFoundError", toLoginNotFound),
      ),
    ),
  });
});

//#endregion
