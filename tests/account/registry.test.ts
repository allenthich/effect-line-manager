import { describe, expect, test } from "vite-plus/test";
import { Deferred, Effect, Fiber, Layer, Option, Redacted, Schema, type Duration } from "effect";
import { TestClock } from "effect/testing";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import {
  LineChannelId,
  LineChannelRecordId,
  LineProviderId,
  MessagingChannel,
} from "../../src/account/domain.ts";
import { LineRepositoryError } from "../../src/account/errors.ts";
import { LineClientRegistry, type LineClientRegistryConfig } from "../../src/account/registry.ts";
import { LineRepository, type LineRepositoryService } from "../../src/account/repository.ts";

const decodeChannelId = Schema.decodeUnknownSync(LineChannelId);
const channelId = decodeChannelId("channel-1");
const recordId = Schema.decodeUnknownSync(LineChannelRecordId)("record-1");
const missingRecordId = Schema.decodeUnknownSync(LineChannelRecordId)("missing-record");

const makeMessagingChannel = (token: string) =>
  new MessagingChannel({
    channelType: "messaging" as const,
    id: recordId,
    providerId: Schema.decodeUnknownSync(LineProviderId)("provider-1"),
    name: "Primary",
    channelId,
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make(token),
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-10T00:00:00.000Z"),
  });

const makeRepository = (
  findChannelById: LineRepositoryService["findChannelById"],
  updateChannel?: LineRepositoryService["updateChannel"],
): LineRepositoryService => ({
  // New methods
  createProvider: () => Effect.die("unused"),
  updateProvider: () => Effect.die("unused"),
  findProviderById: () => Effect.die("unused"),
  listProviders: Effect.die("unused"),
  deleteProvider: () => Effect.die("unused"),
  createChannel: () => Effect.die("unused"),
  updateChannel:
    updateChannel ??
    (() =>
      Effect.fail(
        new LineRepositoryError({
          operation: "updateChannel",
          cause: new Error("unimplemented"),
        }),
      )),
  findChannelById,
  findChannelByMessagingId: () => Effect.succeedNone,
  findChannelByBotUserId: () => Effect.succeedNone,
  listChannelsByProvider: () => Effect.die("unused"),
  deleteChannel: () => Effect.die("unused"),
  createLiffApp: () => Effect.die("unused"),
  updateLiffApp: () => Effect.die("unused"),
  findLiffAppById: () => Effect.die("unused"),
  listLiffAppsByChannel: () => Effect.die("unused"),
  deleteLiffApp: () => Effect.die("unused"),
  // Legacy methods — kept for backward compat, unused by new registry
  create: () => Effect.die("unused"),
  update: () => Effect.die("unused"),
  findById: () => Effect.die("unused"),
  findByChannelId: () => Effect.die("unused"),
  findByBotUserId: () => Effect.die("unused"),
  listAll: Effect.die("unused"),
  deleteById: () => Effect.die("unused"),
});

const makeCapturingHttpClient = (status = 200, body: string | null = null) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = [];
  const client = HttpClient.make((request) => {
    requests.push(request);
    return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body, { status })));
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
  test("reuses client group after one repository lookup", async () => {
    let lookups = 0;
    const repository = makeRepository(() =>
      Effect.sync(() => {
        lookups += 1;
        return Option.some(makeMessagingChannel("token-1"));
      }),
    );
    const { client: httpClient } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const msg1 = yield* registry.getMessagingClient(recordId);
        const msg2 = yield* registry.getMessagingClient(recordId);
        expect(msg2).toBe(msg1);

        // MessagingChannel has no login config — getLoginClient should fail
        const loginResult = yield* Effect.exit(registry.getLoginClient(recordId));
        expect(loginResult._tag).toBe("Failure");
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
        return Option.some(makeMessagingChannel("token-1"));
      }),
    );
    const { client: httpClient } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const fiber = yield* Effect.all(
          [registry.getMessagingClient(recordId), registry.getMessagingClient(recordId)],
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
      operation: "findById",
      cause: new Error("database unavailable"),
    });
    const failingRepository = makeRepository(() => Effect.fail(repositoryFailure));

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getMessagingClient(missingRecordId);
        }).pipe(Effect.provide(makeLayer(missingRepository, httpClient))),
      ),
    ).resolves.toMatchObject({
      _tag: "ChannelNotFoundError",
      recordId: "missing-record",
    });

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getMessagingClient(recordId);
        }).pipe(Effect.provide(makeLayer(failingRepository, httpClient))),
      ),
    ).resolves.toBe(repositoryFailure);
  });

  test("reloads rotated credentials after invalidation", async () => {
    let channel = makeMessagingChannel("token-1");
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
        const initial = yield* registry.getMessagingClient(recordId);
        yield* initial.pushMessage("U123", [{ type: "text", text: "initial" }]);

        channel = makeMessagingChannel("token-2");
        const cached = yield* registry.getMessagingClient(recordId);
        yield* cached.pushMessage("U123", [{ type: "text", text: "cached" }]);

        yield* registry.invalidate(recordId);
        const rotated = yield* registry.getMessagingClient(recordId);
        yield* rotated.pushMessage("U123", [{ type: "text", text: "rotated" }]);

        yield* registry.invalidateAll;
        yield* registry.getMessagingClient(recordId);
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
    let channel: Option.Option<MessagingChannel> = Option.some(makeMessagingChannel("token-1"));
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
        yield* registry.getMessagingClient(recordId);
        yield* TestClock.adjust("2 minutes");
        yield* registry.getMessagingClient(recordId);

        channel = Option.none();
        yield* registry.invalidate(recordId);
        yield* Effect.exit(registry.getMessagingClient(recordId));
        channel = Option.some(makeMessagingChannel("token-2"));
        yield* Effect.exit(registry.getMessagingClient(recordId));
        yield* TestClock.adjust("6 seconds");
        yield* registry.getMessagingClient(recordId);
      }).pipe(
        Effect.provide(
          Layer.mergeAll(makeLayer(repository, httpClient, config), TestClock.layer()),
        ),
      ),
    );

    expect(lookups).toBe(4);
  });

  test("syncs bot profile from LINE API to database, stripping unknown official fields", async () => {
    const repository = makeRepository(
      () => Effect.succeed(Option.some(makeMessagingChannel("token-1"))),
      (id, input) => {
        expect(id).toBe(recordId);
        expect(input).toEqual({
          botUserId: "U-sync-bot",
          basicId: "@sync-basic",
          displayName: "Synced Bot",
          pictureUrl: "https://sync.test/pic.png",
        });
        expect(input).not.toHaveProperty("premiumId");
        expect(input).not.toHaveProperty("chatMode");
        expect(input).not.toHaveProperty("markAsReadMode");
        const original = makeMessagingChannel("token-1");
        return Effect.succeed(
          new MessagingChannel({
            channelType: "messaging" as const,
            id: original.id,
            providerId: original.providerId,
            name: original.name,
            channelId: original.channelId,
            channelSecret: original.channelSecret,
            channelAccessToken: original.channelAccessToken,
            isActive: original.isActive,
            createdAt: original.createdAt,
            updatedAt: original.updatedAt,
            botUserId: "U-sync-bot",
            basicId: "@sync-basic",
            displayName: "Synced Bot",
            pictureUrl: "https://sync.test/pic.png",
          }),
        );
      },
    );

    const { client: httpClient } = makeCapturingHttpClient(
      200,
      JSON.stringify({
        userId: "U-sync-bot",
        basicId: "@sync-basic",
        displayName: "Synced Bot",
        pictureUrl: "https://sync.test/pic.png",
        premiumId: "P-sync-premium",
        chatMode: "chat",
        markAsReadMode: "auto",
      }),
    );

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const synced = yield* registry.syncBotProfile(recordId);
        expect(synced.displayName).toBe("Synced Bot");
      }),
      repository,
      httpClient,
    );
  });

  test("syncs bot profile with missing pictureUrl, passing null to repository", async () => {
    const repository = makeRepository(
      () => Effect.succeed(Option.some(makeMessagingChannel("token-1"))),
      (id, input) => {
        expect(id).toBe(recordId);
        expect(input).toEqual({
          botUserId: "U-sync-bot",
          basicId: "@sync-basic",
          displayName: "Synced Bot",
          pictureUrl: null,
        });
        const original = makeMessagingChannel("token-1");
        return Effect.succeed(
          new MessagingChannel({
            channelType: "messaging" as const,
            id: original.id,
            providerId: original.providerId,
            name: original.name,
            channelId: original.channelId,
            channelSecret: original.channelSecret,
            channelAccessToken: original.channelAccessToken,
            isActive: original.isActive,
            createdAt: original.createdAt,
            updatedAt: original.updatedAt,
            botUserId: "U-sync-bot",
            basicId: "@sync-basic",
            displayName: "Synced Bot",
            pictureUrl: null,
          }),
        );
      },
    );

    const { client: httpClient } = makeCapturingHttpClient(
      200,
      JSON.stringify({
        userId: "U-sync-bot",
        basicId: "@sync-basic",
        displayName: "Synced Bot",
        // pictureUrl intentionally absent
      }),
    );

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const synced = yield* registry.syncBotProfile(recordId);
        expect(synced.pictureUrl).toBeNull();
      }),
      repository,
      httpClient,
    );
  });
});
