import { describe, expect, test } from "vite-plus/test";
import { Deferred, Effect, Fiber, Layer, Option, Redacted, Schema, type Duration } from "effect";
import { TestClock } from "effect/testing";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import {
  LineChannelId,
  LineMessagingChannelId,
  MessagingChannel,
} from "../../src/channels/domain.ts";
import { LineProviderId } from "../../src/provider/domain.ts";
import { LineRepositoryError } from "../../src/shared/errors.ts";
import { LineClientRegistry, type LineClientRegistryConfig } from "../../src/registry/index.ts";
import {
  LineMessagingChannelRepository,
  type LineMessagingChannelRepositoryService,
} from "../../src/channels/repository.ts";
import {
  LineLoginChannelRepository,
  type LineLoginChannelRepositoryService,
} from "../../src/channels/repository.ts";
import { LineLiffRepository, type LineLiffRepositoryService } from "../../src/liff/repository.ts";

const decodeGeneric = Schema.decodeUnknownSync(LineChannelId);
const channelId = decodeGeneric("channel-1");
const messagingChannelId = Schema.decodeUnknownSync(LineMessagingChannelId)("channel-1");
const uid = decodeGeneric("record-1");
const missingChannelId = decodeGeneric("missing-channel");

const makeMessagingChannel = (token: string) =>
  new MessagingChannel({
    channelType: "messaging" as const,
    id: uid,
    providerId: Schema.decodeUnknownSync(LineProviderId)("provider-1"),
    name: "Primary",
    channelId: messagingChannelId,
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make(token),
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-10T00:00:00.000Z"),
  });

const makeMessagingRepo = (
  findByLineChannelId: LineMessagingChannelRepositoryService["findByLineChannelId"],
  update?: LineMessagingChannelRepositoryService["update"],
): LineMessagingChannelRepositoryService => ({
  create: () => Effect.die("unused"),
  update:
    update ??
    (() =>
      Effect.fail(
        new LineRepositoryError({
          operation: "updateMessagingChannel",
          cause: new Error("unimplemented"),
        }),
      )),
  findByLineChannelId,
  findByBotUserId: () => Effect.succeedNone,
  listByProvider: () => Effect.die("unused"),
  delete: () => Effect.die("unused"),
});

const makeLoginRepo = (): LineLoginChannelRepositoryService => ({
  create: () => Effect.die("unused"),
  update: () => Effect.die("unused"),
  findByLineChannelId: () => Effect.succeedNone,
  listByProvider: () => Effect.die("unused"),
  delete: () => Effect.die("unused"),
});

const makeLiffRepository = (): LineLiffRepositoryService => ({
  createLiffApp: () => Effect.die("unused"),
  updateLiffApp: () => Effect.die("unused"),
  findLiffAppByLiffId: () => Effect.succeedNone,
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
  messagingRepo: LineMessagingChannelRepositoryService,
  loginRepo: LineLoginChannelRepositoryService,
  liffRepository: LineLiffRepositoryService,
  httpClient: HttpClient.HttpClient,
  config?: LineClientRegistryConfig,
) =>
  LineClientRegistry.layer(config).pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(LineMessagingChannelRepository)(messagingRepo),
        Layer.succeed(LineLoginChannelRepository)(loginRepo),
        Layer.succeed(LineLiffRepository)(liffRepository),
        Layer.succeed(HttpClient.HttpClient)(httpClient),
      ),
    ),
  );

const run = <A, E>(
  effect: Effect.Effect<A, E, LineClientRegistry>,
  messagingRepo: LineMessagingChannelRepositoryService,
  loginRepo: LineLoginChannelRepositoryService,
  liffRepository: LineLiffRepositoryService,
  httpClient: HttpClient.HttpClient,
  config?: LineClientRegistryConfig,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(makeLayer(messagingRepo, loginRepo, liffRepository, httpClient, config)),
    ),
  );

const failure = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

describe("LineClientRegistry", () => {
  test("reuses client group after one repository lookup", async () => {
    let lookups = 0;
    const messagingRepo = makeMessagingRepo(() =>
      Effect.sync(() => {
        lookups += 1;
        return Option.some(makeMessagingChannel("token-1"));
      }),
    );
    const loginRepo = makeLoginRepo();
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
      messagingRepo,
      loginRepo,
      liffRepository,
      httpClient,
    );

    expect(lookups).toBe(1);
  });

  test("shares one pending repository lookup across concurrent callers", async () => {
    let lookups = 0;
    const gate = await Effect.runPromise(Deferred.make<void>());
    const messagingRepo = makeMessagingRepo(() =>
      Effect.gen(function* () {
        lookups += 1;
        yield* Deferred.await(gate);
        return Option.some(makeMessagingChannel("token-1"));
      }),
    );
    const loginRepo = makeLoginRepo();
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
      messagingRepo,
      loginRepo,
      liffRepository,
      httpClient,
    );

    expect(lookups).toBe(1);
  });

  test("preserves missing-channel and repository failures", async () => {
    const { client: httpClient } = makeCapturingHttpClient();
    const missingMessagingRepo = makeMessagingRepo(() => Effect.succeedNone);
    const loginRepo = makeLoginRepo();
    const liffRepository = makeLiffRepository();
    const repositoryFailure = new LineRepositoryError({
      operation: "findMessagingChannelByLineChannelId",
      cause: new Error("database unavailable"),
    });
    const failingMessagingRepo = makeMessagingRepo(() => Effect.fail(repositoryFailure));

    await expect(
      failure(
        Effect.gen(function* () {
          const registry = yield* LineClientRegistry;
          return yield* registry.getMessagingClient(missingChannelId);
        }).pipe(
          Effect.provide(makeLayer(missingMessagingRepo, loginRepo, liffRepository, httpClient)),
        ),
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
        }).pipe(
          Effect.provide(makeLayer(failingMessagingRepo, loginRepo, liffRepository, httpClient)),
        ),
      ),
    ).resolves.toBe(repositoryFailure);
  });

  test("reloads rotated credentials after invalidation", async () => {
    let channel = makeMessagingChannel("token-1");
    let lookups = 0;
    const messagingRepo = makeMessagingRepo(() =>
      Effect.sync(() => {
        lookups += 1;
        return Option.some(channel);
      }),
    );
    const loginRepo = makeLoginRepo();
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
      messagingRepo,
      loginRepo,
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
    const messagingRepo = makeMessagingRepo(() =>
      Effect.sync(() => {
        lookups += 1;
        return channel;
      }),
    );
    const loginRepo = makeLoginRepo();
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
            makeLayer(messagingRepo, loginRepo, liffRepository, httpClient, config),
            TestClock.layer(),
          ),
        ),
      ),
    );

    expect(lookups).toBe(4);
  });

  test("syncs bot profile from LINE API to database, stripping unknown official fields", async () => {
    const messagingRepo = makeMessagingRepo(
      () => Effect.succeed(Option.some(makeMessagingChannel("token-1"))),
      (id, input) => {
        expect(id).toBe(messagingChannelId);
        expect(input).toEqual({
          botUserId: "U-sync-bot",
          botBasicId: "@sync-basic",
          botDisplayName: "Synced Bot",
          botPictureUrl: "https://sync.test/pic.png",
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
            botBasicId: "@sync-basic",
            botDisplayName: "Synced Bot",
            botPictureUrl: "https://sync.test/pic.png",
          }),
        );
      },
    );
    const loginRepo = makeLoginRepo();
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
        expect(synced.botDisplayName).toBe("Synced Bot");
      }),
      messagingRepo,
      loginRepo,
      liffRepository,
      httpClient,
    );
  });

  test("syncs bot profile with missing pictureUrl, passing null to repository", async () => {
    const messagingRepo = makeMessagingRepo(
      () => Effect.succeed(Option.some(makeMessagingChannel("token-1"))),
      (id, input) => {
        expect(id).toBe(messagingChannelId);
        expect(input).toEqual({
          botUserId: "U-sync-bot",
          botBasicId: "@sync-basic",
          botDisplayName: "Synced Bot",
          botPictureUrl: null,
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
            botBasicId: "@sync-basic",
            botDisplayName: "Synced Bot",
            botPictureUrl: null,
          }),
        );
      },
    );
    const loginRepo = makeLoginRepo();
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
        expect(synced.botPictureUrl).toBeNull();
      }),
      messagingRepo,
      loginRepo,
      liffRepository,
      httpClient,
    );
  });
});
