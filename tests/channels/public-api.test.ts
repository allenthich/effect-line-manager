import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import {
  LineChannelId,
  LineChannelUid,
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
import { LineClientRegistry, type LineClientRegistryService } from "../../src/registry/index.ts";
import { LineProviderId } from "../../src/provider/domain.ts";
import { LineLoginChannels, LineMessagingChannels } from "../../src/public-api.ts";
import { provideInternalLineChannelStore } from "../support/internal-channel-store.ts";

const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");
const messagingUid = Schema.decodeUnknownSync(LineChannelUid)("channel-record-1");
const loginUid = Schema.decodeUnknownSync(LineChannelUid)("channel-record-2");
const messagingLineChannelId = Schema.decodeUnknownSync(LineMessagingChannelId)("2000000001");
const loginLineChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("3000000001");
const botUserId = Schema.decodeUnknownSync(LineBotUserId)("U-bot-user-1");

const makeMessagingChannel = () =>
  new MessagingChannel({
    id: messagingUid,
    providerId,
    channelType: "messaging",
    name: "Support Bot",
    channelId: messagingLineChannelId as LineChannelId,
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

const makeChannelRepository = (
  overrides: Partial<LineChannelRepositoryService> = {},
): LineChannelRepositoryService => ({
  createChannel: () => Effect.die("unused"),
  updateChannel: () => Effect.die("unused"),
  findChannelByUid: () => Effect.succeed(Option.none()),
  findChannelByLineChannelId: () => Effect.succeed(Option.none()),
  findChannelByBotUserId: () => Effect.succeed(Option.none()),
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

const makeChannelRepositoryLayer = (repository: LineChannelRepositoryService) =>
  Layer.mergeAll(
    Layer.succeed(LineChannelRepository)(repository),
    provideInternalLineChannelStore(repository),
  );

const runRepositoryEffect = <A, E>(
  effect: Effect.Effect<A, E, LineMessagingChannelRepository | LineLoginChannelRepository>,
  repository: LineChannelRepositoryService,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        Layer.mergeAll(
          LineMessagingChannelRepository.layer.pipe(
            Layer.provide(makeChannelRepositoryLayer(repository)),
          ),
          LineLoginChannelRepository.layer.pipe(
            Layer.provide(makeChannelRepositoryLayer(repository)),
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
            Layer.provide(makeChannelRepositoryLayer(repository)),
          ),
          LineLoginChannelRepository.layer.pipe(
            Layer.provide(makeChannelRepositoryLayer(repository)),
          ),
          LineMessagingChannelService.layer.pipe(
            Layer.provide(
              Layer.mergeAll(
                LineMessagingChannelRepository.layer.pipe(
                  Layer.provide(makeChannelRepositoryLayer(repository)),
                ),
                Layer.succeed(LineClientRegistry)(registry),
              ),
            ),
          ),
          LineLoginChannelService.layer.pipe(
            Layer.provide(
              LineLoginChannelRepository.layer.pipe(
                Layer.provide(makeChannelRepositoryLayer(repository)),
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

  test("LineMessagingChannelRepository does not expose uid-based getters", async () => {
    const service = await runRepositoryEffect(
      Effect.service(LineMessagingChannelRepository),
      makeChannelRepository(),
    );

    expect("findByUid" in service).toBe(false);
  });

  test("LineLoginChannelRepository does not expose uid-based getters", async () => {
    const service = await runRepositoryEffect(
      Effect.service(LineLoginChannelRepository),
      makeChannelRepository(),
    );

    expect("findByUid" in service).toBe(false);
  });

  test("LineLoginChannelRepository.findByLineChannelId narrows shared lookups to login channels", async () => {
    const repository = makeChannelRepository({
      findChannelByLineChannelId: (id) => {
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
    }
  });

  test("LineMessagingChannelService.getClientByLineChannelId resolves the client via the internal uid", async () => {
    const repository = makeChannelRepository({
      findChannelByLineChannelId: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    const client = await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.getClientByLineChannelId(messagingLineChannelId),
      ),
      repository,
      makeRegistry([]),
    );

    expect(client).toEqual({ kind: "messaging-client" });
  });

  test("LineMessagingChannelService.getAccessTokenByLineChannelId exposes the messaging access token", async () => {
    const repository = makeChannelRepository({
      findChannelByLineChannelId: () => Effect.succeed(Option.some(makeMessagingChannel())),
    });

    const token = await runServiceEffect(
      Effect.flatMap(LineMessagingChannelService, (service) =>
        service.getAccessTokenByLineChannelId(messagingLineChannelId),
      ),
      repository,
      makeRegistry([]),
    );

    expect(token).toBe("token-1");
  });

  test("LineMessagingChannelService.invalidateClientByLineChannelId invalidates the resolved uid", async () => {
    const invalidated: Array<string> = [];
    const repository = makeChannelRepository({
      findChannelByLineChannelId: () => Effect.succeed(Option.some(makeMessagingChannel())),
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
      findChannelByLineChannelId: () => Effect.succeed(Option.some(makeLoginChannel())),
    });

    const channel = await runServiceEffect(
      Effect.flatMap(LineLoginChannelService, (service) =>
        service.getByLineChannelId(loginLineChannelId),
      ),
      repository,
      makeRegistry([]),
    );

    expect(channel.channelType).toBe("login");
    expect(channel.id).toBe(loginUid);
  });

  test("LineMessagingChannelService.getClientByLineChannelId fails explicitly when the external id is missing", async () => {
    const repository = makeChannelRepository({
      findChannelByLineChannelId: () => Effect.succeed(Option.none()),
    });

    await expect(
      runServiceEffect(
        Effect.flatMap(LineMessagingChannelService, (service) =>
          service.getClientByLineChannelId(messagingLineChannelId),
        ),
        repository,
        makeRegistry([]),
      ),
    ).rejects.toEqual(new ChannelNotFoundError({ uid: messagingLineChannelId as never }));
  });
});
