/**
 * Client Registry
 *
 * Central service for resolving LINE API clients (Messaging, Login, LIFF)
 * from channel records. Provides caching, invalidation, and bot profile
 * synchronization across all LINE platform services.
 *
 * @module
 */
import {
  Cache,
  Context,
  type Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";
import { HttpClient } from "effect/unstable/http";
import {
  makeLineApiClient,
  type LineApiClient,
  type LineApiClientError,
} from "../messaging/client.ts";
import { makeLineLoginClient, type LineLoginClient } from "../login/client.ts";
import { makeLineLiffClient, type LineLiffClient } from "../liff/client.ts";
import {
  LineChannelUid,
  LineChannelId,
  MessagingChannel,
  type LoginChannel,
  type LineChannel,
} from "../channel/domain.ts";
import { LineLiffUid, type LineLiffApp } from "../liff/domain.ts";
import { ChannelNotFoundError } from "../channel/errors.ts";
import { LiffAppNotFoundError, LiffLoginConfigMissingError } from "../liff/errors.ts";
import { LineRepositoryError } from "../shared/errors.ts";
import { InternalLineChannelStore } from "../internal/channel-store.ts";
import { LineLiffRepository } from "../liff/repository.ts";

const defaultCapacity = 500;
const defaultTimeToLive = "30 minutes";
const defaultFailureTimeToLive = "30 seconds";

/** Configuration options for the LineClientRegistry cache: capacity, TTL, and failure TTL. */
export interface LineClientRegistryConfig {
  readonly capacity?: number | undefined;
  readonly timeToLive?: Duration.Input | undefined;
  readonly failureTimeToLive?: Duration.Input | undefined;
}

/** Cached data for a single channel: the channel entity + its Messaging API client (if applicable). */
interface ChannelEntry {
  readonly channel: LineChannel;
  readonly messaging: Option.Option<LineApiClient>;
  readonly login: Option.Option<LineLoginClient>;
}

/** Cached data for a single LIFF app: the LIFF entity, its parent LoginChannel, and the LIFF client. */
interface LiffEntry {
  readonly liffApp: LineLiffApp;
  readonly parentLoginChannel: LoginChannel;
  readonly liff: LineLiffClient;
}

/** Central service for resolving LINE API clients (Messaging, Login, LIFF) with caching and bot profile sync. */
export class LineClientRegistry extends Context.Service<
  LineClientRegistry,
  {
    /** Resolves a Messaging API client by LINE Messaging Channel ID. */
    readonly getMessagingClient: (
      channelId: LineChannelId,
    ) => Effect.Effect<LineApiClient, LineRepositoryError | ChannelNotFoundError>;

    readonly getLoginClient: (
      channelId: LineChannelId,
    ) => Effect.Effect<LineLoginClient, LineRepositoryError | ChannelNotFoundError>;

    /** Resolves a LIFF client by LIFF record ID.
     *  Uses the parent Login Channel's OAuth token (Option A).
     *  If no OAuth access token is provided, returns {@link LiffLoginConfigMissingError}. */
    readonly getLiffClient: (
      liffUid: LineLiffUid,
      oauthAccessToken?: string,
    ) => Effect.Effect<
      LineLiffClient,
      | LineRepositoryError
      | LiffAppNotFoundError
      | ChannelNotFoundError
      | LiffLoginConfigMissingError
    >;

    /** Syncs bot profile metadata from the LINE Messaging API and updates the channel record.
     *  Only applicable to MessagingChannel records. */
    readonly syncBotProfile: (
      channelId: LineChannelId,
    ) => Effect.Effect<
      MessagingChannel,
      LineRepositoryError | ChannelNotFoundError | LineApiClientError
    >;

    /** Evicts a single channel from the cache. */
    readonly invalidateChannel: (channelId: LineChannelId) => Effect.Effect<void>;

    /** Evicts a single LIFF app from the cache. */
    readonly invalidateLiff: (liffUid: LineLiffUid) => Effect.Effect<void>;

    /** Evicts all cached channels and LIFF apps. */
    readonly invalidateAll: Effect.Effect<void>;
  }
>()("effect-line-manager/LineClientRegistry") {
  static layer(config: LineClientRegistryConfig = {}) {
    return Layer.effect(LineClientRegistry)(makeRegistry(config));
  }
}

/** The Effect service type extracted from LineClientRegistry. */
export type LineClientRegistryService = LineClientRegistry["Service"];

const isMessagingChannel = (channel: LineChannel): channel is MessagingChannel =>
  channel.channelType === "messaging";

const isLoginChannel = (channel: LineChannel): channel is LoginChannel =>
  channel.channelType === "login";

const makeRegistry = (config: LineClientRegistryConfig = {}) =>
  Effect.gen(function* () {
    const channelRepository = yield* InternalLineChannelStore;
    const liffRepository = yield* LineLiffRepository;
    const httpClient = yield* HttpClient.HttpClient;
    const successTimeToLive = config.timeToLive ?? defaultTimeToLive;
    const failureTimeToLive = config.failureTimeToLive ?? defaultFailureTimeToLive;

    //#region Channel cache
    const loadChannelEntry = Effect.fn("LineClientRegistry.loadChannelEntry")(function* (
      channelId: LineChannelId,
    ) {
      const optionChannel = yield* channelRepository.findByLineChannelId(channelId);
      if (Option.isNone(optionChannel)) {
        return yield* new ChannelNotFoundError({ uid: channelId as unknown as LineChannelUid });
      }
      const channel = optionChannel.value;

      // Only create a Messaging API client for MessagingChannel entries.
      // LoginChannel entries cannot use the Messaging API.
      const messaging: Option.Option<LineApiClient> = isMessagingChannel(channel)
        ? Option.some(makeLineApiClient(httpClient, channel.channelAccessToken))
        : Option.none();

      const login: Option.Option<LineLoginClient> = isLoginChannel(channel)
        ? Option.some(
            makeLineLoginClient(httpClient, channel.channelId as string, channel.channelSecret),
          )
        : Option.none();

      return { channel, messaging, login } satisfies ChannelEntry;
    });

    const channelCache = yield* Cache.makeWith<
      LineChannelId,
      ChannelEntry,
      LineRepositoryError | ChannelNotFoundError
    >(loadChannelEntry, {
      capacity: config.capacity ?? defaultCapacity,
      timeToLive: (exit) => (Exit.isSuccess(exit) ? successTimeToLive : failureTimeToLive),
    });

    //#endregion

    //#region LIFF cache
    const loadLiffEntry = Effect.fn("LineClientRegistry.loadLiffEntry")(function* (
      liffUid: LineLiffUid,
    ) {
      const optionLiff = yield* liffRepository.findLiffAppByUid(liffUid);
      if (Option.isNone(optionLiff)) {
        return yield* new LiffAppNotFoundError({ uid: liffUid });
      }
      const liffApp = optionLiff.value;

      // Resolve the parent LoginChannel for validation
      const sharedId = Schema.decodeUnknownSync(LineChannelId)(liffApp.loginChannelId);
      const optionParent = yield* channelRepository.findByLineChannelId(sharedId);
      if (Option.isNone(optionParent) || !isLoginChannel(optionParent.value)) {
        return yield* new ChannelNotFoundError({
          uid: liffApp.loginChannelId as unknown as LineChannelUid,
        });
      }
      const parentLoginChannel = optionParent.value;

      // The LIFF client itself requires an OAuth token — caller must provide it.
      // We cache the loaded entities but construct the client lazily.
      return { liffApp, parentLoginChannel } as Omit<LiffEntry, "liff">;
    });

    const liffCache = yield* Cache.makeWith<
      LineLiffUid,
      Omit<LiffEntry, "liff">,
      LineRepositoryError | LiffAppNotFoundError | ChannelNotFoundError
    >(loadLiffEntry, {
      capacity: config.capacity ?? defaultCapacity,
      timeToLive: (exit) => (Exit.isSuccess(exit) ? successTimeToLive : failureTimeToLive),
    });

    //#endregion

    //#region Public methods

    const getMessagingClient = Effect.fn("LineClientRegistry.getMessagingClient")(
      (channelId: LineChannelId) =>
        Effect.flatMap(Cache.get(channelCache, channelId), (entry) => {
          if (!isMessagingChannel(entry.channel)) {
            return new ChannelNotFoundError({ uid: channelId as unknown as LineChannelUid });
          }
          return Option.isSome(entry.messaging)
            ? Effect.succeed(entry.messaging.value)
            : Effect.die("MessagingChannel without messaging client");
        }),
    );

    const getLoginClient = Effect.fn("LineClientRegistry.getLoginClient")(
      (channelId: LineChannelId) =>
        Effect.flatMap(Cache.get(channelCache, channelId), (entry) =>
          Option.isSome(entry.login)
            ? Effect.succeed(entry.login.value)
            : new ChannelNotFoundError({ uid: channelId as unknown as LineChannelUid }),
        ),
    );

    const getLiffClient = Effect.fn("LineClientRegistry.getLiffClient")(
      (liffUid: LineLiffUid, oauthAccessToken?: string) =>
        Effect.gen(function* () {
          if (oauthAccessToken === undefined) {
            return yield* new LiffLoginConfigMissingError({
              uid: liffUid,
            });
          }
          // Validate LIFF app exists and parent LoginChannel is valid (side-effect in cache loading)
          yield* Cache.get(liffCache, liffUid);
          const liff = makeLineLiffClient(httpClient, Redacted.make(oauthAccessToken));
          return liff;
        }),
    );

    const syncBotProfile = Effect.fn("LineClientRegistry.syncBotProfile")(
      (channelId: LineChannelId) =>
        Effect.gen(function* () {
          const entry = yield* Cache.get(channelCache, channelId);
          if (!isMessagingChannel(entry.channel)) {
            return yield* new ChannelNotFoundError({
              uid: channelId as unknown as LineChannelUid,
            });
          }
          if (Option.isNone(entry.messaging)) {
            return yield* Effect.die("MessagingChannel without messaging client");
          }
          const messagingClient = entry.messaging.value;
          const botInfo = yield* messagingClient.getBotInfo;

          const channelUid = entry.channel.id;
          const updatedChannel = yield* channelRepository.update(channelUid, {
            botUserId: botInfo.userId,
            basicId: botInfo.basicId,
            displayName: botInfo.displayName,
            pictureUrl: botInfo.pictureUrl ?? null,
          });

          // Invalidate the cache so next lookup gets fresh data
          yield* Cache.invalidate(channelCache, channelId);

          // Decode the updated channel to ensure type safety — it must
          // remain a MessagingChannel since we validated the type above
          // and the update preserves the channel type.
          if (isMessagingChannel(updatedChannel)) {
            return updatedChannel;
          }
          return yield* Effect.die("Expected updated channel to remain a messaging channel");
        }),
    );

    return LineClientRegistry.of({
      getMessagingClient,
      getLoginClient,
      getLiffClient,
      syncBotProfile,
      invalidateChannel: Effect.fn("LineClientRegistry.invalidateChannel")(
        (channelId: LineChannelId) => Cache.invalidate(channelCache, channelId),
      ),

      invalidateLiff: Effect.fn("LineClientRegistry.invalidateLiff")((liffUid: LineLiffUid) =>
        Cache.invalidate(liffCache, liffUid),
      ),
      invalidateAll: Effect.all(
        [Cache.invalidateAll(channelCache), Cache.invalidateAll(liffCache)],
        { concurrency: "unbounded" },
      ).pipe(Effect.as<void>(undefined), Effect.withSpan("LineClientRegistry.invalidateAll")),
    });

    //#endregion
  });
