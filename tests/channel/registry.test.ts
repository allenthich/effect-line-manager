import { describe, expect, test } from "vite-plus/test";
import { Deferred, Effect, Fiber, Layer, Option, Redacted, Schema, type Duration } from "effect";
import { TestClock } from "effect/testing";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import { LineChannelId, MessagingChannel } from "../../src/channel/domain.ts";
import { LineProviderId } from "../../src/provider/domain.ts";
import { LineRepositoryError } from "../../src/shared/errors.ts";
import { LineClientRegistry, type LineClientRegistryConfig } from "../../src/registry/index.ts";
import {
  LineChannelRepository,
  type LineChannelRepositoryService,
} from "../../src/channel/repository.ts";
import { provideInternalLineChannelStore } from "../support/internal-channel-store.ts";
import { LineLiffRepository, type LineLiffRepositoryService } from "../../src/liff/repository.ts";

const decodeChannelId = Schema.decodeUnknownSync(LineChannelId);
const channelId = decodeChannelId("channel-1");
const uid = decodeChannelId("record-1");
const missingChannelId = decodeChannelId("missing-channel");

const makeMessagingChannel = (token: string) =>
  new MessagingChannel({
    channelType: "messaging" as const,
    id: uid,
    providerId: Schema.decodeUnknownSync(LineProviderId)("provider-1"),
    name: "Primary",
    channelId,
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make(token),
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-10T00:00:00.000Z"),
  });

const makeChannelRepository = (
  findChannelByLineChannelId: LineChannelRepositoryService["findChannelByLineChannelId"],
  updateChannel?: LineChannelRepositoryService["updateChannel"],
): LineChannelRepositoryService => ({
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
  findChannelByLineChannelId,
  findChannelByBotUserId: () => Effect.succeedNone,
  listChannelsByProvider: () => Effect.die("unused"),
  deleteChannel: () => Effect.die("unused"),
});

const makeLiffRepository = (): LineLiffRepositoryService => ({
  createLiffApp: () => Effect.die("unused"),
  updateLiffApp: () => Effect.die("unused"),
  findLiffAppByUid: () => Effect.succeedNone,
  listLiffAppsByChannel: () => Effect.die("unused"),
  deleteLiffApp: () => Effect.die("unused"),
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
  channelRepository: LineChannelRepositoryService,
  liffRepository: LineLiffRepositoryService,
  httpClient: HttpClient.HttpClient,
  config?: LineClientRegistryConfig,
) =>
  LineClientRegistry.layer(config).pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(LineChannelRepository)(channelRepository),
        provideInternalLineChannelStore(channelRepository),
        Layer.succeed(LineLiffRepository)(liffRepository),
        Layer.succeed(HttpClient.HttpClient)(httpClient),
      ),
    ),
  );

const run = <A, E>(
  effect: Effect.Effect<A, E, LineClientRegistry>,
  channelRepository: LineChannelRepositoryService,
  liffRepository: LineLiffRepositoryService,
  httpClient: HttpClient.HttpClient,
  config?: LineClientRegistryConfig,
) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(makeLayer(channelRepository, liffRepository, httpClient, config))),
  );

const failure = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

describe("LineClientRegistry", () => {
  test("reuses client group after one repository lookup", async () => {
    let lookups = 0;
    const channelRepository = makeChannelRepository(() =>
      Effect.sync(() => {
        lookups += 1;
        return Option.some(makeMessagingChannel("token-1"));
      }),
    );
    const liffRepository = makeLiffRepository();
    const { client: httpClient } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const msg1 = yield* registry.getMessagingClient(channelId);
        const msg2 = yield* registry.getMessagingClient(channelId);
        expect(msg2).toBe(msg1);

        // MessagingChannel has no login config — getLoginClient should fail
        const loginResult = yield* Effect.exit(registry.getLoginClient(channelId));
        expect(loginResult._tag).toBe("Failure");
      }),
      channelRepository,
      liffRepository,
      httpClient,
    );

    expect(lookups).toBe(1);
  });

  test("shares one pending repository lookup across concurrent callers", async () => {
    let lookups = 0;
    const gate = await Effect.runPromise(Deferred.make<void>());
    const channelRepository = makeChannelRepository(() =>
      Effect.gen(function* () {
        lookups += 1;
        yield* Deferred.await(gate);
        return Option.some(makeMessagingChannel("token-1"));
      }),
    );
    const liffRepository = makeLiffRepository();
    const { client: httpClient } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const fiber = yield* Effect.all(
          [registry.getMessagingClient(channelId), registry.getMessagingClient(channelId)],
          { concurrency: "unbounded" },
        ).pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        yield* Deferred.succeed(gate, undefined);
        yield* Fiber.join(fiber);
      }),
      channelRepository,
      liffRepository,
      httpClient,
    );

    expect(lookups).toBe(1);
  });

  test("preserves missing-channel and repository failures", async () => {
    const { client: httpClient } = makeCapturingHttpClient();
    const missingRepository = makeChannelRepository(() => Effect.succeedNone);
    const liffRepository = makeLiffRepository();
    const repositoryFailure = new LineRepositoryError({
      operation: "findChannelByLineChannelId",
      cause: new Error("database unavailable"),
    });
    const failingRepository = makeChannelRepository(() => Effect.fail(repositoryFailure));

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getMessagingClient(missingChannelId);
        }).pipe(Effect.provide(makeLayer(missingRepository, liffRepository, httpClient))),
      ),
    ).resolves.toMatchObject({
      _tag: "ChannelNotFoundError",
      channelId: "missing-channel",
    });

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getMessagingClient(channelId);
        }).pipe(Effect.provide(makeLayer(failingRepository, liffRepository, httpClient))),
      ),
    ).resolves.toBe(repositoryFailure);
  });

  test("reloads rotated credentials after invalidation", async () => {
    let channel = makeMessagingChannel("token-1");
    let lookups = 0;
    const channelRepository = makeChannelRepository(() =>
      Effect.sync(() => {
        lookups += 1;
        return Option.some(channel);
      }),
    );
    const liffRepository = makeLiffRepository();
    const { client: httpClient, requests } = makeCapturingHttpClient();

    await run(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        const initial = yield* registry.getMessagingClient(channelId);
        yield* initial.pushMessage("U123", [{ type: "text", text: "initial" }]);

        channel = makeMessagingChannel("token-2");
        const cached = yield* registry.getMessagingClient(channelId);
        yield* cached.pushMessage("U123", [{ type: "text", text: "cached" }]);

        yield* registry.invalidateChannel(channelId);
        const rotated = yield* registry.getMessagingClient(channelId);
        yield* rotated.pushMessage("U123", [{ type: "text", text: "rotated" }]);

        yield* registry.invalidateAll;
        yield* registry.getMessagingClient(channelId);
      }),
      channelRepository,
      liffRepository,
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
    const channelRepository = makeChannelRepository(() =>
      Effect.sync(() => {
        lookups += 1;
        return channel;
      }),
    );
    const liffRepository = makeLiffRepository();
    const { client: httpClient } = makeCapturingHttpClient();
    const config = {
      timeToLive: "1 minute" as Duration.Input,
      failureTimeToLive: "5 seconds" as Duration.Input,
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const registry = yield* LineClientRegistry;
        yield* registry.getMessagingClient(channelId);
        yield* TestClock.adjust("2 minutes");
        yield* registry.getMessagingClient(channelId);

        channel = Option.none();
        yield* registry.invalidateChannel(channelId);
        yield* Effect.exit(registry.getMessagingClient(channelId));
        channel = Option.some(makeMessagingChannel("token-2"));
        yield* Effect.exit(registry.getMessagingClient(channelId));
        yield* TestClock.adjust("6 seconds");
        yield* registry.getMessagingClient(channelId);
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            makeLayer(channelRepository, liffRepository, httpClient, config),
            TestClock.layer(),
          ),
        ),
      ),
    );

    expect(lookups).toBe(4);
  });

  test("syncs bot profile from LINE API to database, stripping unknown official fields", async () => {
    const channelRepository = makeChannelRepository(
      () => Effect.succeed(Option.some(makeMessagingChannel("token-1"))),
      (id, input) => {
        expect(id).toBe(uid);
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
    const liffRepository = makeLiffRepository();

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
        const synced = yield* registry.syncBotProfile(channelId);
        expect(synced.displayName).toBe("Synced Bot");
      }),
      channelRepository,
      liffRepository,
      httpClient,
    );
  });

  test("syncs bot profile with missing pictureUrl, passing null to repository", async () => {
    const channelRepository = makeChannelRepository(
      () => Effect.succeed(Option.some(makeMessagingChannel("token-1"))),
      (id, input) => {
        expect(id).toBe(uid);
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
    const liffRepository = makeLiffRepository();

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
        const synced = yield* registry.syncBotProfile(channelId);
        expect(synced.pictureUrl).toBeNull();
      }),
      channelRepository,
      liffRepository,
      httpClient,
    );
  });
});
