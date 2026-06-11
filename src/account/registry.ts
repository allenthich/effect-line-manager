import { Cache, Context, type Duration, Effect, Exit, Layer, Option } from "effect";
import { HttpClient } from "effect/unstable/http";
import {
  makeLineApiClient,
  type LineApiClient,
  type LineApiClientError,
} from "../messaging/client.ts";
import { makeLineLoginClient, type LineLoginClient } from "../login/client.ts";
import { makeLineLiffClient, type LineLiffClient } from "../liff/client.ts";
import { LineChannelRecordId, type LineAccount } from "./domain.ts";
import {
  type LineAccountDuplicateChannelError,
  type LineAccountNotFoundError,
  LineChannelNotFoundError,
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

interface ClientGroup {
  readonly messaging: LineApiClient;
  readonly login: Option.Option<LineLoginClient>;
  readonly liff: LineLiffClient;
}

export class LineClientRegistry extends Context.Service<
  LineClientRegistry,
  {
    readonly getMessagingClient: (
      recordId: LineChannelRecordId,
    ) => Effect.Effect<LineApiClient, LineRepositoryError | LineChannelNotFoundError>;

    readonly getLoginClient: (
      recordId: LineChannelRecordId,
    ) => Effect.Effect<
      LineLoginClient,
      LineRepositoryError | LineChannelNotFoundError | LineLoginConfigMissingError
    >;

    readonly getLiffClient: (
      recordId: LineChannelRecordId,
    ) => Effect.Effect<LineLiffClient, LineRepositoryError | LineChannelNotFoundError>;

    readonly syncBotProfile: (
      recordId: LineChannelRecordId,
    ) => Effect.Effect<
      LineAccount,
      | LineRepositoryError
      | LineAccountNotFoundError
      | LineAccountDuplicateChannelError
      | LineChannelNotFoundError
      | LineApiClientError
    >;

    readonly invalidate: (recordId: LineChannelRecordId) => Effect.Effect<void>;
    readonly invalidateAll: () => Effect.Effect<void>;
  }
>()("effect-line-manager/LineClientRegistry") {
  static layer(config: LineClientRegistryConfig = {}) {
    return Layer.effect(LineClientRegistry)(makeRegistry(config));
  }
}

export type LineClientRegistryService = LineClientRegistry["Service"];

const makeRegistry = (config: LineClientRegistryConfig = {}) =>
  Effect.gen(function* () {
    const repository = yield* LineRepository;
    const httpClient = yield* HttpClient.HttpClient;
    const successTimeToLive = config.timeToLive ?? defaultTimeToLive;
    const failureTimeToLive = config.failureTimeToLive ?? defaultFailureTimeToLive;

    const loadClientGroup = Effect.fn("LineClientRegistry.loadClientGroup")(function* (
      recordId: LineChannelRecordId,
    ) {
      const optionAccount = yield* repository.findById(recordId);
      if (Option.isNone(optionAccount)) {
        return yield* new LineChannelNotFoundError({ recordId });
      }
      const account = optionAccount.value;

      const messaging = makeLineApiClient(httpClient, account.channelAccessToken);

      const login =
        account.loginChannelId !== null && account.loginChannelSecret !== null
          ? Option.some(
              makeLineLoginClient(httpClient, account.loginChannelId, account.loginChannelSecret),
            )
          : Option.none();

      const liff = makeLineLiffClient(httpClient, account.channelAccessToken);

      return { messaging, login, liff } satisfies ClientGroup;
    });

    const cache = yield* Cache.makeWith<
      LineChannelRecordId,
      ClientGroup,
      LineRepositoryError | LineChannelNotFoundError
    >(loadClientGroup, {
      capacity: config.capacity ?? defaultCapacity,
      timeToLive: (exit) => (Exit.isSuccess(exit) ? successTimeToLive : failureTimeToLive),
    });

    const getMessagingClient = Effect.fn("LineClientRegistry.getMessagingClient")(
      (recordId: LineChannelRecordId) =>
        Effect.map(Cache.get(cache, recordId), (group) => group.messaging),
    );

    const getLoginClient = Effect.fn("LineClientRegistry.getLoginClient")(
      (recordId: LineChannelRecordId) =>
        Effect.flatMap(Cache.get(cache, recordId), (group) =>
          Option.isSome(group.login)
            ? Effect.succeed(group.login.value)
            : new LineLoginConfigMissingError({ recordId }),
        ),
    );

    const getLiffClient = Effect.fn("LineClientRegistry.getLiffClient")(
      (recordId: LineChannelRecordId) =>
        Effect.map(Cache.get(cache, recordId), (group) => group.liff),
    );

    const syncBotProfile = Effect.fn("LineClientRegistry.syncBotProfile")(
      (recordId: LineChannelRecordId) =>
        Effect.gen(function* () {
          const messagingClient = yield* getMessagingClient(recordId);
          const botInfo = yield* messagingClient.getBotInfo();

          const updated = yield* repository.update(recordId, {
            botUserId: botInfo.userId,
            basicId: botInfo.basicId,
            displayName: botInfo.displayName,
            pictureUrl: botInfo.pictureUrl ?? null,
          });

          return updated;
        }),
    );

    return LineClientRegistry.of({
      getMessagingClient,
      getLoginClient,
      getLiffClient,
      syncBotProfile,
      invalidate: Effect.fn("LineClientRegistry.invalidate")((recordId: LineChannelRecordId) =>
        Cache.invalidate(cache, recordId),
      ),
      invalidateAll: Effect.fn("LineClientRegistry.invalidateAll")(() =>
        Cache.invalidateAll(cache),
      ),
    });
  });
