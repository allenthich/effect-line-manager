import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import {
  LineChannelId,
  LineChannelRecordId,
  LineLoginChannelId,
  LoginChannel,
  MessagingChannel,
} from "../../src/channel/domain.ts";
import { ChannelNotFoundError } from "../../src/channel/errors.ts";
import {
  LineChannelRepository,
  type LineChannelRepositoryService,
} from "../../src/channel/repository.ts";
import {
  LineBotUserId,
  LineLoginChannelRepository,
  LineLoginChannelService,
  LineMessagingChannelId,
  LineMessagingChannelRepository,
  LineMessagingChannelService,
} from "../../src/channels/index.ts";
import type { LineClientRegistryService } from "../../src/registry/index.ts";
import { LineClientRegistry } from "../../src/registry/index.ts";
import { LineProviderId } from "../../src/provider/domain.ts";
import {
  LineLiffApps,
  LineLoginChannels,
  LineMessagingChannels,
  LineProviders,
} from "../../src/public-api.ts";
import { LineLiffManagement } from "../../src/liff/service.ts";
import { LineLiffRepository } from "../../src/liff/repository.ts";
import { LineProviderManagement } from "../../src/provider/service.ts";
import { LineProviderRepository } from "../../src/provider/repository.ts";

const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");
const messagingUid = Schema.decodeUnknownSync(LineChannelRecordId)("channel-record-1");
const loginUid = Schema.decodeUnknownSync(LineChannelRecordId)("channel-record-2");
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
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make("channel-access-token"),
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
    botUserId,
    basicId: "@support-bot",
    displayName: "Support Bot",
    pictureUrl: "https://example.test/bot.png",
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

const makeChannelRepository = (
  overrides: Partial<LineChannelRepositoryService> = {},
): LineChannelRepositoryService => ({
  createChannel: () => Effect.die("unused"),
  updateChannel: () => Effect.die("unused"),
  findChannelById: () => Effect.succeedNone,
  findChannelByMessagingId: () => Effect.succeedNone,
  findChannelByBotUserId: () => Effect.succeedNone,
  listChannelsByProvider: () => Effect.die("unused"),
  deleteChannel: () => Effect.die("unused"),
  ...overrides,
});

const makeRegistry = (
  invalidated: Array<string>,
  client: { readonly kind: "messaging-client" } = { kind: "messaging-client" },
): LineClientRegistryService => ({
  getMessagingClient: () => Effect.succeed(client as never),
  getLoginClient: () => Effect.die("unused"),
  getLiffClient: () => Effect.die("unused"),
  syncBotProfile: () => Effect.die("unused"),
  invalidateChannel: (uid) =>
    Effect.sync(() => {
      invalidated.push(uid);
    }),
  invalidateLiff: () => Effect.die("unused"),
  invalidateAll: Effect.die("unused"),
});

const runRepositoryEffect = <A, E>(
  effect: Effect.Effect<A, E, LineMessagingChannelRepository | LineLoginChannelRepository>,
  repository: LineChannelRepositoryService,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        Layer.mergeAll(
          LineMessagingChannelRepository.layer.pipe(
            Layer.provide(Layer.succeed(LineChannelRepository)(repository)),
          ),
          LineLoginChannelRepository.layer.pipe(
            Layer.provide(Layer.succeed(LineChannelRepository)(repository)),
          ),
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
  repository: LineChannelRepositoryService,
  registry: LineClientRegistryService,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        Layer.mergeAll(
          LineMessagingChannelRepository.layer.pipe(
            Layer.provide(Layer.succeed(LineChannelRepository)(repository)),
          ),
          LineLoginChannelRepository.layer.pipe(
            Layer.provide(Layer.succeed(LineChannelRepository)(repository)),
          ),
          LineMessagingChannelService.layer.pipe(
            Layer.provide(
              Layer.mergeAll(
                LineMessagingChannelRepository.layer.pipe(
                  Layer.provide(Layer.succeed(LineChannelRepository)(repository)),
                ),
                Layer.succeed(LineClientRegistry)(registry),
              ),
            ),
          ),
          LineLoginChannelService.layer.pipe(
            Layer.provide(
              LineLoginChannelRepository.layer.pipe(
                Layer.provide(Layer.succeed(LineChannelRepository)(repository)),
              ),
            ),
          ),
        ),
      ),
    ),
  );

describe("domain-specific channel public API", () => {
  test("LineMessagingChannels and LineLoginChannels expose grouped public services", () => {
    expect(LineMessagingChannels.Repository).toBe(LineMessagingChannelRepository);
    expect(LineMessagingChannels.Service).toBe(LineMessagingChannelService);
    expect(LineLoginChannels.Repository).toBe(LineLoginChannelRepository);
    expect(LineLoginChannels.Service).toBe(LineLoginChannelService);
    expect(LineProviders.Repository).toBe(LineProviderRepository);
    expect(LineProviders.Service).toBe(LineProviderManagement);
    expect(LineLiffApps.Repository).toBe(LineLiffRepository);
    expect(LineLiffApps.Service).toBe(LineLiffManagement);
  });

  test("LineMessagingChannelRepository.findByUid narrows legacy channel lookups to messaging channels", async () => {
    const repository = makeChannelRepository({
      findChannelById: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    const result = await runRepositoryEffect(
      Effect.flatMap(LineMessagingChannelRepository, (service) => service.findByUid(messagingUid)),
      repository,
    );

    expect(Option.isSome(result)).toBe(true);
    if (Option.isSome(result)) {
      expect(result.value.channelType).toBe("messaging");
      expect(result.value.id).toBe(messagingUid);
    }
  });

  test("LineLoginChannelRepository.findByLineChannelId narrows shared channel-id lookups to login channels", async () => {
    const repository = makeChannelRepository({
      findChannelByMessagingId: (id: LineChannelId) => {
        expect(id).toBe(loginLineChannelId);
        return Effect.succeed(Option.some(makeLoginChannel()));
      },
    });

    const result = await runRepositoryEffect(
      Effect.flatMap(LineLoginChannelRepository, (service) =>
        service.findByLineChannelId(loginLineChannelId),
      ),
      repository,
    );

    expect(Option.isSome(result)).toBe(true);
    if (Option.isSome(result)) {
      expect(result.value.channelType).toBe("login");
      expect(result.value.id).toBe(loginUid);
    }
  });

  test("LineMessagingChannelService.getClientByLineChannelId resolves the client via the internal uid", async () => {
    const invalidated: Array<string> = [];
    const repository = makeChannelRepository({
      findChannelByMessagingId: (id: LineChannelId) => {
        expect(id).toBe(messagingLineChannelId);
        return Effect.succeed(Option.some(makeMessagingChannel()));
      },
    });

    const result = await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.getClientByLineChannelId(messagingLineChannelId),
      ),
      repository,
      makeRegistry(invalidated),
    );

    expect(result).toEqual({ kind: "messaging-client" });
    expect(invalidated).toEqual([]);
  });

  test("LineMessagingChannelService.getAccessTokenByLineChannelId exposes the messaging access token", async () => {
    const repository = makeChannelRepository({
      findChannelByMessagingId: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    const result = await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.getAccessTokenByLineChannelId(messagingLineChannelId),
      ),
      repository,
      makeRegistry([]),
    );

    expect(result).toBe("channel-access-token");
  });

  test("LineMessagingChannelService.invalidateClientByLineChannelId invalidates the resolved uid", async () => {
    const invalidated: Array<string> = [];
    const repository = makeChannelRepository({
      findChannelByMessagingId: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.invalidateClientByLineChannelId(messagingLineChannelId),
      ),
      repository,
      makeRegistry(invalidated),
    );

    expect(invalidated).toEqual([messagingUid]);
  });

  test("LineLoginChannelService.getByLineChannelId returns the login channel", async () => {
    const repository = makeChannelRepository({
      findChannelByMessagingId: () => Effect.succeed(Option.some(makeLoginChannel())),
    });

    const result = await runServiceEffect(
      Effect.flatMap(LineLoginChannelService, (service) =>
        service.getByLineChannelId(loginLineChannelId),
      ),
      repository,
      makeRegistry([]),
    );

    expect(result.channelType).toBe("login");
    expect(result.id).toBe(loginUid);
  });

  test("LineMessagingChannelService.getClientByLineChannelId fails explicitly when the external id is missing", async () => {
    const repository = makeChannelRepository({
      findChannelByMessagingId: () => Effect.succeed(Option.none()),
    });

    const result = await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.getClientByLineChannelId(messagingLineChannelId),
      ).pipe(Effect.flip),
      repository,
      makeRegistry([]),
    );

    expect(result).toEqual(
      new ChannelNotFoundError({
        recordId: messagingLineChannelId as unknown as LineChannelRecordId,
      }),
    );
  });
});
