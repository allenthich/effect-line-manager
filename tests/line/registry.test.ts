import { describe, expect, test } from "vite-plus/test";
import { Deferred, Effect, Fiber, Layer, Option, Redacted, type Duration } from "effect";
import { TestClock } from "effect/testing";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import { LineChannel } from "../../src/line/domain.ts";
import { LineRepositoryError } from "../../src/line/errors.ts";
import {
  LineClientRegistry,
  makeLineClientRegistryLayer,
  type LineClientRegistryConfig,
} from "../../src/line/registry.ts";
import { LineRepository, type LineRepositoryShape } from "../../src/line/repository.ts";

const makeChannel = (token: string) =>
  new LineChannel({
    id: "record-1",
    name: "Primary",
    channelId: "channel-1",
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make(token),
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
  });

const makeRepository = (
  findByChannelId: LineRepositoryShape["findByChannelId"],
): LineRepositoryShape => ({
  create: (input) =>
    Effect.succeed(
      new LineChannel({
        id: "created-record",
        name: input.name,
        channelId: input.channelId,
        channelSecret: input.channelSecret,
        channelAccessToken: input.channelAccessToken,
        createdAt: new Date("2026-06-10T00:00:00.000Z"),
      }),
    ),
  findByChannelId,
  listAll: () => Effect.succeed([]),
  deleteByChannelId: () => Effect.void,
});

const makeCapturingHttpClient = () => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = [];
  const client = HttpClient.make((request) => {
    requests.push(request);
    return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(null, { status: 200 })));
  });
  return { client, requests } as const;
};

const makeLayer = (
  repository: LineRepositoryShape,
  httpClient: HttpClient.HttpClient,
  config?: LineClientRegistryConfig,
) =>
  makeLineClientRegistryLayer(config).pipe(
    Layer.provide(
      Layer.merge(
        Layer.succeed(LineRepository)(repository),
        Layer.succeed(HttpClient.HttpClient)(httpClient),
      ),
    ),
  );

const run = <A, E>(
  effect: Effect.Effect<A, E, LineClientRegistry>,
  repository: LineRepositoryShape,
  httpClient: HttpClient.HttpClient,
  config?: LineClientRegistryConfig,
) => Effect.runPromise(effect.pipe(Effect.provide(makeLayer(repository, httpClient, config))));

const failure = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

describe("LineClientRegistry", () => {
  test("reuses a client after one repository lookup", async () => {
    let lookups = 0;
    const repository = makeRepository(() =>
      Effect.sync(() => {
        lookups += 1;
        return Option.some(makeChannel("token-1"));
      }),
    );
    const { client: httpClient } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const first = yield* registry.getClient("channel-1");
        const second = yield* registry.getClient("channel-1");
        expect(second).toBe(first);
      }),
      repository,
      httpClient,
    );

    expect(lookups).toBe(1);
  });

  test("shares one pending repository lookup across concurrent callers", async () => {
    let lookups = 0;
    const gate = await Effect.runPromise(Deferred.make<void>());
    const repository = makeRepository(() =>
      Effect.gen(function* () {
        lookups += 1;
        yield* Deferred.await(gate);
        return Option.some(makeChannel("token-1"));
      }),
    );
    const { client: httpClient } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const fiber = yield* Effect.all(
          [registry.getClient("channel-1"), registry.getClient("channel-1")],
          { concurrency: "unbounded" },
        ).pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        yield* Deferred.succeed(gate, undefined);
        yield* Fiber.join(fiber);
      }),
      repository,
      httpClient,
    );

    expect(lookups).toBe(1);
  });

  test("preserves missing-channel and repository failures", async () => {
    const { client: httpClient } = makeCapturingHttpClient();
    const missingRepository = makeRepository(() => Effect.succeedNone);
    const repositoryFailure = new LineRepositoryError({
      operation: "findByChannelId",
      causeDescription: "database unavailable",
    });
    const failingRepository = makeRepository(() => Effect.fail(repositoryFailure));

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getClient("missing");
        }).pipe(Effect.provide(makeLayer(missingRepository, httpClient))),
      ),
    ).resolves.toMatchObject({
      _tag: "LineChannelNotFoundError",
      channelId: "missing",
    });

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getClient("channel-1");
        }).pipe(Effect.provide(makeLayer(failingRepository, httpClient))),
      ),
    ).resolves.toBe(repositoryFailure);
  });

  test("reloads rotated credentials after invalidation", async () => {
    let channel = makeChannel("token-1");
    let lookups = 0;
    const repository = makeRepository(() =>
      Effect.sync(() => {
        lookups += 1;
        return Option.some(channel);
      }),
    );
    const { client: httpClient, requests } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const initial = yield* registry.getClient("channel-1");
        yield* initial.pushMessage("U123", [{ type: "text", text: "initial" }]);

        channel = makeChannel("token-2");
        const cached = yield* registry.getClient("channel-1");
        yield* cached.pushMessage("U123", [{ type: "text", text: "cached" }]);

        yield* registry.invalidate("channel-1");
        const rotated = yield* registry.getClient("channel-1");
        yield* rotated.pushMessage("U123", [{ type: "text", text: "rotated" }]);

        yield* registry.invalidateAll();
        yield* registry.getClient("channel-1");
      }),
      repository,
      httpClient,
    );

    expect(requests.map((request) => request.headers.authorization)).toEqual([
      "Bearer token-1",
      "Bearer token-1",
      "Bearer token-2",
    ]);
    expect(lookups).toBe(3);
  });

  test("reloads successful and failed lookups after their configured TTL", async () => {
    let channel: Option.Option<LineChannel> = Option.some(makeChannel("token-1"));
    let lookups = 0;
    const repository = makeRepository(() =>
      Effect.sync(() => {
        lookups += 1;
        return channel;
      }),
    );
    const { client: httpClient } = makeCapturingHttpClient();
    const config = {
      timeToLive: "1 minute" as Duration.Input,
      failureTimeToLive: "5 seconds" as Duration.Input,
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        yield* registry.getClient("channel-1");
        yield* TestClock.adjust("2 minutes");
        yield* registry.getClient("channel-1");

        channel = Option.none();
        yield* registry.invalidate("channel-1");
        yield* Effect.exit(registry.getClient("channel-1"));
        channel = Option.some(makeChannel("token-2"));
        yield* Effect.exit(registry.getClient("channel-1"));
        yield* TestClock.adjust("6 seconds");
        yield* registry.getClient("channel-1");
      }).pipe(
        Effect.provide(makeLayer(repository, httpClient, config)),
        Effect.provide(TestClock.layer()),
      ),
    );

    expect(lookups).toBe(4);
  });
});
