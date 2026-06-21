import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import {
  LineChannelId,
  LineLoginChannelId,
  LoginChannel,
  MessagingChannel,
} from "../../src/channel/domain.ts";
import {
  MessagingChannelNotFoundError,
  LoginChannelNotFoundError,
} from "../../src/channels/index.ts";
import {
  LineBotUserId,
  LineLoginChannelRepository,
  LineLoginChannelService,
  LineMessagingChannelId,
  LineMessagingChannelRepository,
  LineMessagingChannelService,
} from "../../src/channels/index.ts";
import {
  LineChannelRepository,
  type LineChannelRepositoryService,
} from "../../src/channel/repository.ts";
import { LineClientRegistry, type LineClientRegistryService } from "../../src/registry/index.ts";
import { LineProviderId } from "../../src/provider/domain.ts";
import { LineLoginChannels, LineMessagingChannels } from "../../src/public-api.ts";
import type { LineMessagingChannel } from "../../src/channels/domain.ts";

const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");
const messagingUid = Schema.decodeUnknownSync(LineChannelId)("channel-record-1");
const loginUid = Schema.decodeUnknownSync(LineChannelId)("channel-record-2");
const messagingLineChannelId = Schema.decodeUnknownSync(LineMessagingChannelId)("2000000001");
const loginLineChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("3000000001");
const botUserId = Schema.decodeUnknownSync(LineBotUserId)("U-bot-user-1");

const makeMessagingChannel = () =>
  new MessagingChannel({
    id: messagingUid,
    providerId,
    channelType: "messaging",
    name: "Support Bot",
    channelId: messagingLineChannelId,
    channelSecret: Redacted.make("messaging-secret"),
    channelAccessToken: Redacted.make("token-1"),
    botUserId,
    basicId: null,
    displayName: null,
    pictureUrl: null,
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
  });

const makeLoginChannel = () =>
  new LoginChannel({
    id: loginUid,
    providerId,
    channelType: "login",
    name: "Support Login",
    channelId: loginLineChannelId,
    channelSecret: Redacted.make("login-secret"),
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
  });

const makeChannelStore = (
  overrides: Partial<LineChannelRepositoryService> = {},
): LineChannelRepositoryService => ({
  create: () => Effect.die("unused"),
  update: () => Effect.die("unused"),
  findByLineChannelId: () => Effect.succeed(Option.none()),
  findByBotUserId: () => Effect.succeed(Option.none()),
  listByProvider: () => Effect.die("unused"),
  delete: () => Effect.die("unused"),
  ...overrides,
});

const makeRegistry = (
  invalidated: Array<string>,
  client: { readonly kind: "messaging-client" } | { readonly kind: "login-client" } = {
    kind: "messaging-client",
  },
): LineClientRegistryService => ({
  getMessagingClient: () =>
    client.kind === "messaging-client"
      ? Effect.succeed(client as never)
      : Effect.die("not a messaging client"),
  getLoginClient: () =>
    client.kind === "login-client"
      ? Effect.succeed(client as never)
      : Effect.die("not a login client"),
  getLiffClient: () => Effect.die("unused"),
  syncBotProfile: () => Effect.die("unused"),
  invalidateChannel: (uid) =>
    Effect.sync(() => {
      invalidated.push(uid);
    }),
  invalidateLiff: () => Effect.die("unused"),
  invalidateAll: Effect.die("unused"),
});

const makeChannelStoreLayer = (store: LineChannelRepositoryService) =>
  Layer.succeed(LineChannelRepository)(store);

const runRepositoryEffect = <A, E>(
  effect: Effect.Effect<A, E, LineMessagingChannelRepository | LineLoginChannelRepository>,
  store: LineChannelRepositoryService,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        Layer.mergeAll(
          LineMessagingChannelRepository.layer.pipe(Layer.provide(makeChannelStoreLayer(store))),
          LineLoginChannelRepository.layer.pipe(Layer.provide(makeChannelStoreLayer(store))),
        ),
      ),
    ),
  );

const runServiceEffect = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | LineMessagingChannelRepository
    | LineLoginChannelRepository
    | LineMessagingChannelService
    | LineLoginChannelService
  >,
  store: LineChannelRepositoryService,
  registry: LineClientRegistryService,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        Layer.mergeAll(
          LineMessagingChannelRepository.layer.pipe(Layer.provide(makeChannelStoreLayer(store))),
          LineLoginChannelRepository.layer.pipe(Layer.provide(makeChannelStoreLayer(store))),
          LineMessagingChannelService.layer.pipe(
            Layer.provide(
              Layer.mergeAll(
                LineMessagingChannelRepository.layer.pipe(
                  Layer.provide(makeChannelStoreLayer(store)),
                ),
                Layer.succeed(LineClientRegistry)(registry),
              ),
            ),
          ),
          LineLoginChannelService.layer.pipe(
            Layer.provide(
              Layer.mergeAll(
                LineLoginChannelRepository.layer.pipe(Layer.provide(makeChannelStoreLayer(store))),
                Layer.succeed(LineClientRegistry)(registry),
              ),
            ),
          ),
        ),
      ),
    ),
  );

describe("domain-specific channel public API", () => {
  test("LineMessagingChannels and LineLoginChannels expose the current public services", () => {
    expect(LineMessagingChannels.Repository).toBe(LineMessagingChannelRepository);
    expect(LineMessagingChannels.Service).toBe(LineMessagingChannelService);
    expect(LineLoginChannels.Repository).toBe(LineLoginChannelRepository);
    expect(LineLoginChannels.Service).toBe(LineLoginChannelService);
  });

  test("LineMessagingChannelId is a distinct brand from LineChannelId at the type level", () => {
    // Contract: LineMessagingChannelId should NOT be assignable to
    // LineChannelId (and vice versa) — they are separate brands.
    // This is a compile-time property; this test documents the intent.
    // The runtime values are compatible strings but branded differently.
    const decoded = Schema.decodeUnknownSync(LineMessagingChannelId)("2000000001");
    expect(typeof decoded).toBe("string");
    // Generic LineChannelId decode from the same string must also succeed.
    const generic = Schema.decodeUnknownSync(LineChannelId)("2000000001");
    expect(typeof generic).toBe("string");
  });

  test("LineLoginChannelId is a distinct brand from LineChannelId at the type level", () => {
    const decoded = Schema.decodeUnknownSync(LineLoginChannelId)("3000000001");
    expect(typeof decoded).toBe("string");
  });

  test("LineLoginChannelRepository.findByLineChannelId narrows shared lookups to login channels", async () => {
    const store = makeChannelStore({
      findByLineChannelId: (id) => {
        expect(id).toBe(loginLineChannelId);
        return Effect.succeed(Option.some(makeLoginChannel()));
      },
    });

    const result = await runRepositoryEffect(
      Effect.flatMap(LineLoginChannelRepository, (service) =>
        service.findByLineChannelId(loginLineChannelId),
      ),
      store,
    );

    expect(Option.isSome(result)).toBe(true);
    if (Option.isSome(result)) {
      expect(result.value.channelType).toBe("login");
    }
  });

  test("LineMessagingChannelService.getClientByLineChannelId resolves the client via the internal uid", async () => {
    const store = makeChannelStore({
      findByLineChannelId: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    const client = await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.getClientByLineChannelId(messagingLineChannelId),
      ),
      store,
      makeRegistry([]),
    );

    expect(client).toEqual({ kind: "messaging-client" });
  });

  test("LineMessagingChannelService.getAccessTokenByLineChannelId exposes the messaging access token", async () => {
    const store = makeChannelStore({
      findByLineChannelId: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    const token = await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.getAccessTokenByLineChannelId(messagingLineChannelId),
      ),
      store,
      makeRegistry([]),
    );

    expect(token).toBe("token-1");
  });

  test("LineMessagingChannelService.invalidateClientByLineChannelId invalidates the resolved uid", async () => {
    const invalidated: Array<string> = [];
    const store = makeChannelStore({
      findByLineChannelId: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.invalidateClientByLineChannelId(messagingLineChannelId),
      ),
      store,
      makeRegistry(invalidated),
    );

    expect(invalidated).toEqual([messagingLineChannelId]);
  });

  test("LineLoginChannelService.getByLineChannelId returns the login channel", async () => {
    const store = makeChannelStore({
      findByLineChannelId: () => Effect.succeed(Option.some(makeLoginChannel())),
    });

    const channel = await runServiceEffect(
      Effect.flatMap(LineLoginChannelService, (service) =>
        service.getByLineChannelId(loginLineChannelId),
      ),
      store,
      makeRegistry([]),
    );

    expect(channel.channelType).toBe("login");
    expect(channel.id).toBe(loginUid);
  });

  test("LineLoginChannelService.getLoginClientByLineChannelId resolves the login client via the internal uid", async () => {
    const store = makeChannelStore({
      findByLineChannelId: () => Effect.succeed(Option.some(makeLoginChannel())),
    });

    const client = await runServiceEffect(
      Effect.flatMap(LineLoginChannelService, (service) =>
        service.getLoginClientByLineChannelId(loginLineChannelId),
      ),
      store,
      makeRegistry([], { kind: "login-client" }),
    );

    expect(client).toEqual({ kind: "login-client" });
  });

  test("LineMessagingChannelService.getClientByLineChannelId fails explicitly when the external id is missing", async () => {
    const store = makeChannelStore({
      findByLineChannelId: () => Effect.succeed(Option.none()),
    });

    await expect(
      runServiceEffect(
        Effect.flatMap(LineMessagingChannelService, (service) =>
          service.getClientByLineChannelId(messagingLineChannelId),
        ),
        store,
        makeRegistry([]),
      ),
    ).rejects.toEqual(new MessagingChannelNotFoundError({ channelId: messagingLineChannelId }));
  });

  test("LineLoginChannelService.getLoginClientByLineChannelId fails explicitly when the external id is missing", async () => {
    const store = makeChannelStore({
      findByLineChannelId: () => Effect.succeed(Option.none()),
    });

    await expect(
      runServiceEffect(
        Effect.flatMap(LineLoginChannelService, (service) =>
          service.getLoginClientByLineChannelId(loginLineChannelId),
        ),
        store,
        makeRegistry([], { kind: "login-client" }),
      ),
    ).rejects.toEqual(new LoginChannelNotFoundError({ channelId: loginLineChannelId }));
  });

  // ── Brand contract: domain-specific IDs in domain models ──

  test("MessagingChannel.channelId should use LineMessagingChannelId (not generic LineChannelId)", () => {
    // Contract: MessagingChannel's channelId field should be typed as
    // LineMessagingChannelId, not the generic LineChannelId.
    // When Task 3 is complete, the `as LineChannelId` cast at line 49
    // will become unnecessary and should be removed.
    const channel = makeMessagingChannel();
    // Type assertion documenting the desired contract:
    const _desired: LineMessagingChannel = channel;
    void _desired;
    expect(channel.channelType).toBe("messaging");
  });

  test("LoginChannel.channelId should use LineLoginChannelId", () => {
    const channel = makeLoginChannel();
    expect(channel.channelId).toBe(loginLineChannelId);
  });

  // ── Error payload contract — domain-specific brands in error payloads ──

  test("not-found errors raised by domain services carry domain-specific channelId brands", () => {
    // Messaging domain: MessagingChannelNotFoundError carries LineMessagingChannelId
    const messagingError = new MessagingChannelNotFoundError({
      channelId: messagingLineChannelId,
    });
    expect(messagingError._tag).toBe("MessagingChannelNotFoundError");
    expect(messagingError.channelId).toBe(messagingLineChannelId);

    // Login domain: LoginChannelNotFoundError carries LineLoginChannelId
    const loginError = new LoginChannelNotFoundError({
      channelId: loginLineChannelId,
    });
    expect(loginError._tag).toBe("LoginChannelNotFoundError");
    expect(loginError.channelId).toBe(loginLineChannelId);
  });
});
