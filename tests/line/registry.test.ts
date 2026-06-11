import { describe, expect, test } from "vite-plus/test";
import { Deferred, Effect, Fiber, Layer, Option, Redacted, Schema, type Duration } from "effect";
import { TestClock } from "effect/testing";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import { LineChannel, LineChannelId, LineChannelRecordId } from "../../src/line/domain.ts";
import { LineRepositoryError } from "../../src/line/errors.ts";
import { LineClientRegistry, type LineClientRegistryConfig } from "../../src/line/registry.ts";
import { LineRepository, type LineRepositoryService } from "../../src/line/repository.ts";

const decodeChannelId = Schema.decodeUnknownSync(LineChannelId);
const channelId = decodeChannelId("channel-1");
const missingChannelId = decodeChannelId("missing");
const recordId = Schema.decodeUnknownSync(LineChannelRecordId)("record-1");

const makeChannel = (token: string) =>
  new LineChannel({
    id: recordId,
    name: "Primary",
    channelId,
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make(token),
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
  });

const makeRepository = (
  findByChannelId: LineRepositoryService["findByChannelId"],
): LineRepositoryService => ({
  create: (input) =>
    Effect.succeed(
      new LineChannel({
        id: Schema.decodeUnknownSync(LineChannelRecordId)("created-record"),
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
  repository: LineRepositoryService,
  httpClient: HttpClient.HttpClient,
  config?: LineClientRegistryConfig,
) =>
  LineClientRegistry.layer(config).pipe(
    Layer.provide(
      Layer.merge(
        Layer.succeed(LineRepository)(repository),
        Layer.succeed(HttpClient.HttpClient)(httpClient),
      ),
    ),
  );

const run = <A, E>(
  effect: Effect.Effect<A, E, LineClientRegistry>,
  repository: LineRepositoryService,
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
        const first = yield* registry.getClient(channelId);
        const second = yield* registry.getClient(channelId);
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
          [registry.getClient(channelId), registry.getClient(channelId)],
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
      cause: new Error("database unavailable"),
    });
    const failingRepository = makeRepository(() => Effect.fail(repositoryFailure));

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getClient(missingChannelId);
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
          return yield* registry.getClient(channelId);
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
        const initial = yield* registry.getClient(channelId);
        yield* initial.pushMessage("U123", [{ type: "text", text: "initial" }]);

        channel = makeChannel("token-2");
        const cached = yield* registry.getClient(channelId);
        yield* cached.pushMessage("U123", [{ type: "text", text: "cached" }]);

        yield* registry.invalidate(channelId);
        const rotated = yield* registry.getClient(channelId);
        yield* rotated.pushMessage("U123", [{ type: "text", text: "rotated" }]);

        yield* registry.invalidateAll();
        yield* registry.getClient(channelId);
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
        yield* registry.getClient(channelId);
        yield* TestClock.adjust("2 minutes");
        yield* registry.getClient(channelId);

        channel = Option.none();
        yield* registry.invalidate(channelId);
        yield* Effect.exit(registry.getClient(channelId));
        channel = Option.some(makeChannel("token-2"));
        yield* Effect.exit(registry.getClient(channelId));
        yield* TestClock.adjust("6 seconds");
        yield* registry.getClient(channelId);
      }).pipe(
        Effect.provide(makeLayer(repository, httpClient, config)),
        Effect.provide(TestClock.layer()),
      ),
    );

    expect(lookups).toBe(4);
  });
});
