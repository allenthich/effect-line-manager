import { Cache, Context, type Duration, Effect, Exit, Layer, Option } from "effect";
import { HttpClient } from "effect/unstable/http";
import { makeLineApiClient, type LineApiClient } from "./client.ts";
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

export interface LineClientRegistryShape {
  readonly getClient: (
    channelId: string,
  ) => Effect.Effect<LineApiClient, LineRepositoryError | LineChannelNotFoundError>;
  readonly invalidate: (channelId: string) => Effect.Effect<void>;
  readonly invalidateAll: () => Effect.Effect<void>;
}

export class LineClientRegistry extends Context.Service<
  LineClientRegistry,
  LineClientRegistryShape
>()("effect-line-manager/LineClientRegistry") {}

const makeRegistry = (config: LineClientRegistryConfig = {}) =>
  Effect.gen(function* () {
    const repository = yield* LineRepository;
    const httpClient = yield* HttpClient.HttpClient;
    const successTimeToLive = config.timeToLive ?? defaultTimeToLive;
    const failureTimeToLive = config.failureTimeToLive ?? defaultFailureTimeToLive;

    const cache = yield* Cache.makeWith<
      string,
      LineApiClient,
      LineRepositoryError | LineChannelNotFoundError
    >(
      (channelId) =>
        repository
          .findByChannelId(channelId)
          .pipe(
            Effect.flatMap((channel) =>
              Option.isNone(channel)
                ? Effect.fail(new LineChannelNotFoundError({ channelId }))
                : Effect.succeed(makeLineApiClient(httpClient, channel.value.channelAccessToken)),
            ),
          ),
      {
        capacity: config.capacity ?? defaultCapacity,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? successTimeToLive : failureTimeToLive),
      },
    );

    return {
      getClient: (channelId: string) => Cache.get(cache, channelId),
      invalidate: (channelId: string) => Cache.invalidate(cache, channelId),
      invalidateAll: () => Cache.invalidateAll(cache),
    } satisfies LineClientRegistryShape;
  });

export const makeLineClientRegistryLayer = (config: LineClientRegistryConfig = {}) =>
  Layer.effect(LineClientRegistry)(makeRegistry(config));
