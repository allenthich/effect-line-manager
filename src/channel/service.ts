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
  type CreateMessagingChannelInput,
  type UpdateMessagingChannelInput,
  type CreateLoginChannelInput,
  type UpdateLoginChannelInput,
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
import {
  LineMessagingChannelRepository,
  LineLoginChannelRepository,
} from "../channels/repository.ts";
import { LineMessagingChannelId, LineLoginChannelId, LineBotUserId } from "../channels/domain.ts";
import { MessagingChannelNotFoundError, LoginChannelNotFoundError } from "../channels/errors.ts";

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

const decodeProviderId = Schema.decodeUnknownSync(LineProviderId);
const decodeBotUserId = Schema.decodeUnknownSync(LineBotUserId);
const decodeSharedLineChannelId = Schema.decodeUnknownSync(LineChannelId);

type MessagingCreateInput = Extract<CreateChannelInput, { readonly channelType: "messaging" }>;
type LoginCreateInput = Extract<CreateChannelInput, { readonly channelType: "login" }>;

const toChannelNotFound = (e: MessagingChannelNotFoundError | LoginChannelNotFoundError) =>
  new ChannelNotFoundError({ channelId: decodeSharedLineChannelId(e.channelId) });
const toCreateMessagingInput = (input: MessagingCreateInput): CreateMessagingChannelInput => ({
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

const toCreateLoginInput = (input: LoginCreateInput): CreateLoginChannelInput => ({
  channelType: "login",
  providerId: decodeProviderId(input.providerId),
  name: input.name,
  channelId: input.channelId,
  channelSecret: Redacted.make(input.channelSecret),
});

const toUpdateMessagingInput = (input: UpdateChannelInput): UpdateMessagingChannelInput => ({
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

const toUpdateLoginInput = (input: UpdateChannelInput): UpdateLoginChannelInput => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.channelId === undefined ? {} : { channelId: input.channelId }),
  ...(input.channelSecret === undefined
    ? {}
    : { channelSecret: Redacted.make(input.channelSecret) }),
});

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE channel repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LinePersistenceError({ operation: error.operation }))),
  );

const decodeMessagingId = Schema.decodeUnknownSync(LineMessagingChannelId);
const decodeLoginId = Schema.decodeUnknownSync(LineLoginChannelId);

/** Constructs the LINE channel management service with its dependencies. */
export const makeLineChannelManagement = Effect.gen(function* () {
  const messagingRepository = yield* LineMessagingChannelRepository;
  const loginRepository = yield* LineLoginChannelRepository;
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
      const [messagingPages, loginPages] = yield* Effect.all(
        [
          Effect.all(
            providers.data.map((p) => messagingRepository.listByProvider(p.id, unboundedQuery)),
            { concurrency: "unbounded" },
          ),
          Effect.all(
            providers.data.map((p) => loginRepository.listByProvider(p.id, unboundedQuery)),
            { concurrency: "unbounded" },
          ),
        ],
        { concurrency: "unbounded" },
      );
      const allChannels: LineChannel[] = [
        ...messagingPages.flatMap((p) => p.data),
        ...loginPages.flatMap((p) => p.data),
      ];
      return paginate(allChannels, query);
    });

  return LineChannelManagement.of({
    listChannels: Effect.fn("LineChannelManagement.listChannels")((query: ListChannelsQuery) => {
      const normalized = normalizePageQuery(query);
      const providerId = query.providerId
        ? Schema.decodeUnknownSync(LineProviderId)(query.providerId)
        : undefined;
      if (providerId !== undefined) {
        return Effect.gen(function* () {
          const [messagingPage, loginPage] = yield* Effect.all(
            [
              messagingRepository.listByProvider(providerId, normalized),
              loginRepository.listByProvider(providerId, normalized),
            ],
            { concurrency: "unbounded" },
          );
          const allChannels: LineChannel[] = [...messagingPage.data, ...loginPage.data];
          return paginate(allChannels, normalized);
        }).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.map(toChannelListPage),
        );
      }
      return listAllChannels(normalized).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.map(toChannelListPage),
      );
    }),

    getChannel: Effect.fn("LineChannelManagement.getChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        // Try the messaging repo first. Each aggregate owns its own table,
        // and `id` here is the shared external LINE channel ID brand.
        const messagingId = decodeMessagingId(id);
        const messagingOption = yield* messagingRepository.findByLineChannelId(messagingId);
        if (Option.isSome(messagingOption)) {
          return toChannelView(messagingOption.value);
        }
        const loginId = decodeLoginId(id);
        const loginOption = yield* loginRepository.findByLineChannelId(loginId);
        if (Option.isSome(loginOption)) {
          return toChannelView(loginOption.value);
        }
        return yield* new ChannelNotFoundError({ channelId: id });
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    findChannelByBotUserId: Effect.fn("LineChannelManagement.findChannelByBotUserId")(
      (botUserId: string) =>
        messagingRepository
          .findByBotUserId(decodeBotUserId(botUserId))
          .pipe(
            Effect.catchTag("LineRepositoryError", persistenceFailure),
            Effect.map(Option.map(toChannelView)),
          ),
    ),

    createChannel: Effect.fn("LineChannelManagement.createChannel")((input: CreateChannelInput) =>
      Effect.gen(function* () {
        const record: LineChannel =
          input.channelType === "messaging"
            ? yield* messagingRepository.create(toCreateMessagingInput(input))
            : yield* loginRepository.create(toCreateLoginInput(input));
        yield* registry.invalidateChannel(
          Schema.decodeUnknownSync(LineChannelId)(record.channelId),
        );
        return toChannelView(record);
      }).pipe(Effect.catchTag("LineRepositoryError", persistenceFailure)),
    ),

    updateChannel: Effect.fn("LineChannelManagement.updateChannel")(
      (id: LineChannelId, input: UpdateChannelInput) =>
        Effect.gen(function* () {
          // Fanout: try the messaging aggregate first, then login. This is the
          // only consumer that operates on the shared LineChannelId brand
          // because the HTTP API exposes /line-channels as one endpoint.
          const messagingId = decodeMessagingId(id);
          const messagingOption = yield* messagingRepository.findByLineChannelId(messagingId);
          if (Option.isSome(messagingOption)) {
            const updated = yield* messagingRepository.update(
              messagingId,
              toUpdateMessagingInput(input),
            );
            yield* registry.invalidateChannel(
              Schema.decodeUnknownSync(LineChannelId)(updated.channelId),
            );
            return toChannelView(updated);
          }

          const loginId = decodeLoginId(id);
          const loginOption = yield* loginRepository.findByLineChannelId(loginId);
          if (Option.isSome(loginOption)) {
            const updated = yield* loginRepository.update(loginId, toUpdateLoginInput(input));
            yield* registry.invalidateChannel(
              Schema.decodeUnknownSync(LineChannelId)(updated.channelId),
            );
            return toChannelView(updated);
          }

          return yield* new ChannelNotFoundError({ channelId: id });
        }).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.catchTags({
            MessagingChannelNotFoundError: toChannelNotFound,
            LoginChannelNotFoundError: toChannelNotFound,
          }),
        ),
    ),

    deleteChannel: Effect.fn("LineChannelManagement.deleteChannel")((id: LineChannelId) =>
      Effect.gen(function* () {
        const messagingId = decodeMessagingId(id);
        const messagingOption = yield* messagingRepository.findByLineChannelId(messagingId);
        if (Option.isSome(messagingOption)) {
          yield* messagingRepository.delete(messagingId);
          yield* registry.invalidateAll;
          return;
        }

        const loginId = decodeLoginId(id);
        const loginOption = yield* loginRepository.findByLineChannelId(loginId);
        if (Option.isSome(loginOption)) {
          yield* loginRepository.delete(loginId);
          yield* registry.invalidateAll;
          return;
        }

        return yield* new ChannelNotFoundError({ channelId: id });
      }).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.catchTags({
          MessagingChannelNotFoundError: toChannelNotFound,
          LoginChannelNotFoundError: toChannelNotFound,
        }),
      ),
    ),
  });
});
