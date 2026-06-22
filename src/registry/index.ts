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
import { LineChannelId, type MessagingChannel, type LoginChannel } from "../channels/domain.ts";
import { LineMessagingChannelId, LineLoginChannelId } from "../channels/domain.ts";
import { LineLiffId, type LineLiffApp } from "../liff/domain.ts";
import { ChannelNotFoundError } from "../shared/errors.ts";
import { MessagingChannelNotFoundError } from "../channels/errors.ts";
import { LiffAppNotFoundError, LiffLoginConfigMissingError } from "../liff/errors.ts";
import { LineRepositoryError } from "../shared/errors.ts";
import {
  LineMessagingChannelRepository,
  LineLoginChannelRepository,
} from "../channels/repository.ts";
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
  readonly channel: MessagingChannel | LoginChannel;
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

    /** Resolves a LIFF client by LIFF ID.
     *  Uses the parent Login Channel's OAuth token (Option A).
     *  If no OAuth access token is provided, returns {@link LiffLoginConfigMissingError}. */
    readonly getLiffClient: (
      liffId: LineLiffId,
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
      | LineRepositoryError
      | ChannelNotFoundError
      | LineApiClientError
      | MessagingChannelNotFoundError
    >;

    /** Evicts a single channel from the cache. */
    readonly invalidateChannel: (channelId: LineChannelId) => Effect.Effect<void>;

    /** Evicts a single LIFF app from the cache. */
    readonly invalidateLiff: (liffId: LineLiffId) => Effect.Effect<void>;

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

const makeRegistry = (config: LineClientRegistryConfig = {}) =>
  Effect.gen(function* () {
    const messagingRepository = yield* LineMessagingChannelRepository;
    const loginRepository = yield* LineLoginChannelRepository;
    const liffRepository = yield* LineLiffRepository;
    const httpClient = yield* HttpClient.HttpClient;
    const successTimeToLive = config.timeToLive ?? defaultTimeToLive;
    const failureTimeToLive = config.failureTimeToLive ?? defaultFailureTimeToLive;

    //#region Channel cache
    const loadChannelEntry = Effect.fn("LineClientRegistry.loadChannelEntry")(function* (
      channelId: LineChannelId,
    ) {
      // Try messaging first — only MessagingChannel entries expose a Messaging API client.
      const messagingId = Schema.decodeUnknownSync(LineMessagingChannelId)(channelId);
      const messagingOption = yield* messagingRepository.findByLineChannelId(messagingId);
      if (Option.isSome(messagingOption)) {
        const channel = messagingOption.value;
        return {
          channel,
          messaging: Option.some(makeLineApiClient(httpClient, channel.channelAccessToken)),
          login: Option.none(),
        } satisfies ChannelEntry;
      }

      // Fall back to login — LoginChannel entries expose a Login client.
      const loginId = Schema.decodeUnknownSync(LineLoginChannelId)(channelId);
      const loginOption = yield* loginRepository.findByLineChannelId(loginId);
      if (Option.isSome(loginOption)) {
        const channel = loginOption.value;
        return {
          channel,
          messaging: Option.none(),
          login: Option.some(
            makeLineLoginClient(httpClient, channel.channelId, channel.channelSecret),
          ),
        } satisfies ChannelEntry;
      }

      return yield* new ChannelNotFoundError({ channelId });
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
      liffId: LineLiffId,
    ) {
      const optionLiff = yield* liffRepository.findLiffAppByLiffId(liffId);
      if (Option.isNone(optionLiff)) {
        return yield* new LiffAppNotFoundError({ liffId });
      }
      const liffApp = optionLiff.value;

      // Resolve the parent LoginChannel for validation. Only login channels
      // can own LIFF apps — the login repository returns LoginChannel entities
      // directly, so no runtime narrowing is required here.
      const sharedId = Schema.decodeUnknownSync(LineChannelId)(liffApp.loginChannelId);
      const loginId = Schema.decodeUnknownSync(LineLoginChannelId)(liffApp.loginChannelId);
      const optionParent = yield* loginRepository.findByLineChannelId(loginId);
      if (Option.isNone(optionParent)) {
        return yield* new ChannelNotFoundError({
          channelId: sharedId,
        });
      }
      const parentLoginChannel = optionParent.value;

      // The LIFF client itself requires an OAuth token — caller must provide it.
      // We cache the loaded entities but construct the client lazily.
      return { liffApp, parentLoginChannel } as Omit<LiffEntry, "liff">;
    });

    const liffCache = yield* Cache.makeWith<
      LineLiffId,
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
          if (entry.channel.channelType !== "messaging") {
            return new ChannelNotFoundError({ channelId });
          }
          return Option.isSome(entry.messaging)
            ? Effect.succeed(entry.messaging.value)
            : Effect.die("MessagingChannel without messaging client");
        }),
    );

    const getLoginClient = Effect.fn("LineClientRegistry.getLoginClient")(
      (channelId: LineChannelId) =>
        Effect.flatMap(Cache.get(channelCache, channelId), (entry) => {
          if (entry.channel.channelType !== "login") {
            return new ChannelNotFoundError({ channelId });
          }
          return Option.isSome(entry.login)
            ? Effect.succeed(entry.login.value)
            : Effect.die("LoginChannel without login client");
        }),
    );

    const getLiffClient = Effect.fn("LineClientRegistry.getLiffClient")(
      (liffId: LineLiffId, oauthAccessToken?: string) =>
        Effect.gen(function* () {
          if (oauthAccessToken === undefined) {
            return yield* new LiffLoginConfigMissingError({
              liffId,
            });
          }
          // Validate LIFF app exists and parent LoginChannel is valid (side-effect in cache loading)
          yield* Cache.get(liffCache, liffId);
          const liff = makeLineLiffClient(httpClient, Redacted.make(oauthAccessToken));
          return liff;
        }),
    );

    const syncBotProfile = Effect.fn("LineClientRegistry.syncBotProfile")(
      (channelId: LineChannelId) =>
        Effect.gen(function* () {
          // Resolve the channel via the cache so a single lookup feeds both
          // the bot-info call and the subsequent update.
          const entry = yield* Cache.get(channelCache, channelId);
          if (entry.channel.channelType !== "messaging") {
            return yield* new ChannelNotFoundError({ channelId });
          }
          if (Option.isNone(entry.messaging)) {
            return yield* Effect.die("MessagingChannel without messaging client");
          }
          const messagingClient = entry.messaging.value;
          const botInfo = yield* messagingClient.getBotInfo;

          // The messaging channel's external LINE channel ID is the key we
          // update by — re-brand the LineChannelId cache key back to the
          // messaging-specific brand the repository expects.
          const messagingId = Schema.decodeUnknownSync(LineMessagingChannelId)(channelId);
          const updatedChannel = yield* messagingRepository.update(messagingId, {
            botUserId: botInfo.userId,
            botBasicId: botInfo.basicId,
            botDisplayName: botInfo.displayName,
            botPictureUrl: botInfo.pictureUrl ?? null,
          });

          // Invalidate the cache so next lookup gets fresh data
          yield* Cache.invalidate(channelCache, channelId);

          return updatedChannel;
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

      invalidateLiff: Effect.fn("LineClientRegistry.invalidateLiff")((liffId: LineLiffId) =>
        Cache.invalidate(liffCache, liffId),
      ),
      invalidateAll: Effect.all(
        [Cache.invalidateAll(channelCache), Cache.invalidateAll(liffCache)],
        { concurrency: "unbounded" },
      ).pipe(Effect.as<void>(undefined), Effect.withSpan("LineClientRegistry.invalidateAll")),
    });

    //#endregion
  });
