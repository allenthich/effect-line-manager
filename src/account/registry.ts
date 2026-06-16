import { Cache, Context, type Duration, Effect, Exit, Layer, Option, Redacted } from "effect";
import { HttpClient } from "effect/unstable/http";
import {
  makeLineApiClient,
  type LineApiClient,
  type LineApiClientError,
} from "../messaging/client.ts";
import { makeLineLoginClient, type LineLoginClient } from "../login/client.ts";
import { makeLineLiffClient, type LineLiffClient } from "../liff/client.ts";
import {
  LineChannelRecordId,
  LineLiffRecordId,
  MessagingChannel,
  type LoginChannel,
  type LineChannel,
  type LineLiffApp,
} from "./domain.ts";
import {
  ChannelNotFoundError,
  LiffAppNotFoundError,
  LiffLoginConfigMissingError,
  LineLoginConfigMissingError,
  type LineRepositoryError,
} from "./errors.ts";
import { LineRepository } from "./repository.ts";

const defaultCapacity = 500;
const defaultTimeToLive = "30 minutes";
const defaultFailureTimeToLive = "30 seconds";

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

export class LineClientRegistry extends Context.Service<
  LineClientRegistry,
  {
    /** Resolves a Messaging API client from a MessagingChannel record. */
    readonly getMessagingClient: (
      channelRecordId: LineChannelRecordId,
    ) => Effect.Effect<LineApiClient, LineRepositoryError | ChannelNotFoundError>;

    /** Resolves a LINE Login client from a LoginChannel record. */
    readonly getLoginClient: (
      channelRecordId: LineChannelRecordId,
    ) => Effect.Effect<
      LineLoginClient,
      LineRepositoryError | ChannelNotFoundError | LineLoginConfigMissingError
    >;

    /** Resolves a LIFF client by LIFF record ID.
     *  Uses the parent Login Channel's OAuth token (Option A).
     *  If no OAuth access token is provided, returns {@link LiffLoginConfigMissingError}. */
    readonly getLiffClient: (
      liffRecordId: LineLiffRecordId,
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
      channelRecordId: LineChannelRecordId,
    ) => Effect.Effect<
      MessagingChannel,
      LineRepositoryError | ChannelNotFoundError | LineApiClientError
    >;

    /** Evicts a single channel from the cache. */
    readonly invalidateChannel: (channelRecordId: LineChannelRecordId) => Effect.Effect<void>;

    /** Evicts a single LIFF app from the cache. */
    readonly invalidateLiff: (liffRecordId: LineLiffRecordId) => Effect.Effect<void>;

    /** Evicts all cached channels and LIFF apps. */
    readonly invalidateAll: Effect.Effect<void>;

    // ═══════════════════════════════════════════════════════════
    // DEPRECATED — kept for backward compatibility with
    // management.ts and test files. Remove once Task C completes.
    // ═══════════════════════════════════════════════════════════

    /** @deprecated Use {@link invalidateChannel} instead. */
    readonly invalidate: (recordId: LineChannelRecordId) => Effect.Effect<void>;
  }
>()("effect-line-manager/LineClientRegistry") {
  static layer(config: LineClientRegistryConfig = {}) {
    return Layer.effect(LineClientRegistry)(makeRegistry(config));
  }
}

export type LineClientRegistryService = LineClientRegistry["Service"];

const isMessagingChannel = (channel: LineChannel): channel is MessagingChannel =>
  channel.channelType === "messaging";

const isLoginChannel = (channel: LineChannel): channel is LoginChannel =>
  channel.channelType === "login";

const makeRegistry = (config: LineClientRegistryConfig = {}) =>
  Effect.gen(function* () {
    const repository = yield* LineRepository;
    const httpClient = yield* HttpClient.HttpClient;
    const successTimeToLive = config.timeToLive ?? defaultTimeToLive;
    const failureTimeToLive = config.failureTimeToLive ?? defaultFailureTimeToLive;

    // ── Channel cache ──────────────────────────────────────────
    const loadChannelEntry = Effect.fn("LineClientRegistry.loadChannelEntry")(function* (
      recordId: LineChannelRecordId,
    ) {
      const optionChannel = yield* repository.findChannelById(recordId);
      if (Option.isNone(optionChannel)) {
        return yield* new ChannelNotFoundError({ recordId });
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
      LineChannelRecordId,
      ChannelEntry,
      LineRepositoryError | ChannelNotFoundError
    >(loadChannelEntry, {
      capacity: config.capacity ?? defaultCapacity,
      timeToLive: (exit) => (Exit.isSuccess(exit) ? successTimeToLive : failureTimeToLive),
    });

    // ── LIFF cache ─────────────────────────────────────────────
    const loadLiffEntry = Effect.fn("LineClientRegistry.loadLiffEntry")(function* (
      liffRecordId: LineLiffRecordId,
    ) {
      const optionLiff = yield* repository.findLiffAppById(liffRecordId);
      if (Option.isNone(optionLiff)) {
        return yield* new LiffAppNotFoundError({ recordId: liffRecordId });
      }
      const liffApp = optionLiff.value;

      // Resolve the parent LoginChannel for validation
      const optionParent = yield* repository.findChannelById(liffApp.loginChannelId);
      if (Option.isNone(optionParent) || !isLoginChannel(optionParent.value)) {
        return yield* new ChannelNotFoundError({ recordId: liffApp.loginChannelId });
      }
      const parentLoginChannel = optionParent.value;

      // The LIFF client itself requires an OAuth token — caller must provide it.
      // We cache the loaded entities but construct the client lazily.
      return { liffApp, parentLoginChannel } as Omit<LiffEntry, "liff">;
    });

    const liffCache = yield* Cache.makeWith<
      LineLiffRecordId,
      Omit<LiffEntry, "liff">,
      LineRepositoryError | LiffAppNotFoundError | ChannelNotFoundError
    >(loadLiffEntry, {
      capacity: config.capacity ?? defaultCapacity,
      timeToLive: (exit) => (Exit.isSuccess(exit) ? successTimeToLive : failureTimeToLive),
    });

    // ── Public methods ─────────────────────────────────────────

    const getMessagingClient = Effect.fn("LineClientRegistry.getMessagingClient")(
      (channelRecordId: LineChannelRecordId) =>
        Effect.flatMap(Cache.get(channelCache, channelRecordId), (entry) => {
          if (!isMessagingChannel(entry.channel)) {
            return new ChannelNotFoundError({ recordId: channelRecordId });
          }
          return Option.isSome(entry.messaging)
            ? Effect.succeed(entry.messaging.value)
            : Effect.die("MessagingChannel without messaging client");
        }),
    );

    const getLoginClient = Effect.fn("LineClientRegistry.getLoginClient")(
      (channelRecordId: LineChannelRecordId) =>
        Effect.flatMap(Cache.get(channelCache, channelRecordId), (entry) =>
          Option.isSome(entry.login)
            ? Effect.succeed(entry.login.value)
            : new LineLoginConfigMissingError({ recordId: channelRecordId }),
        ),
    );

    const getLiffClient = Effect.fn("LineClientRegistry.getLiffClient")(
      (liffRecordId: LineLiffRecordId, oauthAccessToken?: string) =>
        Effect.gen(function* () {
          if (oauthAccessToken === undefined) {
            return yield* new LiffLoginConfigMissingError({
              recordId: liffRecordId,
            });
          }
          // Validate LIFF app exists and parent LoginChannel is valid (side-effect in cache loading)
          yield* Cache.get(liffCache, liffRecordId);
          const liff = makeLineLiffClient(httpClient, Redacted.make(oauthAccessToken));
          return liff;
        }),
    );

    const syncBotProfile = Effect.fn("LineClientRegistry.syncBotProfile")(
      (channelRecordId: LineChannelRecordId) =>
        Effect.gen(function* () {
          const entry = yield* Cache.get(channelCache, channelRecordId);
          if (!isMessagingChannel(entry.channel)) {
            return yield* new ChannelNotFoundError({ recordId: channelRecordId });
          }
          if (Option.isNone(entry.messaging)) {
            return yield* Effect.die("MessagingChannel without messaging client");
          }
          const messagingClient = entry.messaging.value;
          const botInfo = yield* messagingClient.getBotInfo;

          const updatedChannel = yield* repository.updateChannel(channelRecordId, {
            botUserId: botInfo.userId,
            basicId: botInfo.basicId,
            displayName: botInfo.displayName,
            pictureUrl: botInfo.pictureUrl ?? null,
          });

          // Invalidate the cache so next lookup gets fresh data
          yield* Cache.invalidate(channelCache, channelRecordId);

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
        (channelRecordId: LineChannelRecordId) => Cache.invalidate(channelCache, channelRecordId),
      ),
      /** @deprecated Use {@link invalidateChannel} instead. */
      invalidate: Effect.fn("LineClientRegistry.invalidate")((recordId: LineChannelRecordId) =>
        Cache.invalidate(channelCache, recordId),
      ),
      invalidateLiff: Effect.fn("LineClientRegistry.invalidateLiff")(
        (liffRecordId: LineLiffRecordId) => Cache.invalidate(liffCache, liffRecordId),
      ),
      invalidateAll: Effect.all(
        [Cache.invalidateAll(channelCache), Cache.invalidateAll(liffCache)],
        { concurrency: "unbounded" },
      ).pipe(Effect.as<void>(undefined), Effect.withSpan("LineClientRegistry.invalidateAll")),
    });
  });
