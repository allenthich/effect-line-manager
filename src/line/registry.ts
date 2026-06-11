import { Cache, Context, type Duration, Effect, Exit, Layer, Option } from "effect";
import { HttpClient } from "effect/unstable/http";
import { makeLineApiClient, type LineApiClient } from "./client.ts";
import type { LineChannelId } from "./domain.ts";
import { LineChannelNotFoundError, type LineRepositoryError } from "./errors.ts";
import { LineRepository } from "./repository.ts";

const defaultCapacity = 500;
const defaultTimeToLive = "30 minutes";
const defaultFailureTimeToLive = "30 seconds";

export interface LineClientRegistryConfig {
  readonly capacity?: number | undefined;
  readonly timeToLive?: Duration.Input | undefined;
  readonly failureTimeToLive?: Duration.Input | undefined;
}

export class LineClientRegistry extends Context.Service<
  LineClientRegistry,
  {
    readonly getClient: (
      channelId: LineChannelId,
    ) => Effect.Effect<LineApiClient, LineRepositoryError | LineChannelNotFoundError>;
    readonly invalidate: (channelId: LineChannelId) => Effect.Effect<void>;
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

    const loadClient = Effect.fn("LineClientRegistry.loadClient")(function* (
      channelId: LineChannelId,
    ) {
      const channel = yield* repository.findByChannelId(channelId);
      if (Option.isNone(channel)) {
        return yield* new LineChannelNotFoundError({ channelId });
      }
      return makeLineApiClient(httpClient, channel.value.channelAccessToken);
    });

    const cache = yield* Cache.makeWith<
      LineChannelId,
      LineApiClient,
      LineRepositoryError | LineChannelNotFoundError
    >(loadClient, {
      capacity: config.capacity ?? defaultCapacity,
      timeToLive: (exit) => (Exit.isSuccess(exit) ? successTimeToLive : failureTimeToLive),
    });

    return LineClientRegistry.of({
      getClient: Effect.fn("LineClientRegistry.getClient")((channelId: LineChannelId) =>
        Cache.get(cache, channelId),
      ),
      invalidate: Effect.fn("LineClientRegistry.invalidate")((channelId: LineChannelId) =>
        Cache.invalidate(cache, channelId),
      ),
      invalidateAll: Effect.fn("LineClientRegistry.invalidateAll")(() =>
        Cache.invalidateAll(cache),
      ),
    });
  });
