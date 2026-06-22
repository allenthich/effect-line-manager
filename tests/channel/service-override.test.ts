import { describe, expect, test } from "vite-plus/test";
import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { LineProviderId } from "../../src/provider/domain.ts";
import {
  LineProviderRepository,
  type LineProviderRepositoryService,
} from "../../src/provider/repository.ts";
import {
  MessagingChannel,
  LineChannelId,
  LineMessagingChannelId,
} from "../../src/channel/domain.ts";
import { LineChannelManagement, makeLineChannelManagement } from "../../src/channel/service.ts";
import {
  LineMessagingChannelRepository,
  type LineMessagingChannelRepositoryService,
} from "../../src/channels/repository.ts";
import {
  LineLoginChannelRepository,
  type LineLoginChannelRepositoryService,
} from "../../src/channels/repository.ts";
import { LineClientRegistry, type LineClientRegistryService } from "../../src/registry/index.ts";
import { paginate, defaultPage, defaultPageSize } from "../../src/shared/domain.ts";

const uid1 = Schema.decodeUnknownSync(LineChannelId)("record-1");
const uid2 = Schema.decodeUnknownSync(LineChannelId)("record-2");
const channelId1 = Schema.decodeUnknownSync(LineMessagingChannelId)("channel-1");
const channelId2 = Schema.decodeUnknownSync(LineMessagingChannelId)("channel-2");
const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");

const makeChannel = (id: LineChannelId, channelId: LineMessagingChannelId, name: string) =>
  new MessagingChannel({
    id,
    providerId,
    channelType: "messaging",
    name,
    channelId,
    channelSecret: Redacted.make("secret"),
    channelAccessToken: Redacted.make("token"),
    botUserId: null,
    botBasicId: null,
    botDisplayName: null,
    botPictureUrl: null,
    addFriendUrl: null,
    addFriendQrCodeUrl: null,
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
  });

const channel1 = makeChannel(uid1, channelId1, "Alpha");
const channel2 = makeChannel(uid2, channelId2, "Beta");

const makeMessagingStore = (): LineMessagingChannelRepositoryService => ({
  create: () => Effect.die("unused"),
  update: () => Effect.die("unused"),
  findByLineChannelId: () => Effect.succeedNone,
  findByBotUserId: () => Effect.succeedNone,
  listByProvider: () =>
    Effect.succeed(
      paginate([channel1, channel2], { page: defaultPage, pageSize: defaultPageSize }),
    ),
  delete: () => Effect.void,
});

const makeLoginStore = (): LineLoginChannelRepositoryService => ({
  create: () => Effect.die("unused"),
  update: () => Effect.die("unused"),
  findByLineChannelId: () => Effect.succeedNone,
  listByProvider: () =>
    Effect.succeed(paginate([], { page: defaultPage, pageSize: defaultPageSize })),
  delete: () => Effect.void,
});

const makeProviderRepository = (): LineProviderRepositoryService =>
  ({
    listProviders: () =>
      Effect.succeed(
        paginate(
          [
            {
              id: providerId,
              name: "LINE Marketing",
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any,
          ],
          { page: defaultPage, pageSize: defaultPageSize },
        ),
      ),
  }) as any;

const makeRegistry = (): LineClientRegistryService =>
  ({
    getMessagingClient: () => Effect.die("unused"),
    getLoginClient: () => Effect.die("unused"),
    getLiffClient: () => Effect.die("unused"),
    syncBotProfile: () => Effect.die("unused"),
    invalidateChannel: () => Effect.void,
    invalidateLiff: () => Effect.void,
    invalidateAll: Effect.void,
  }) as LineClientRegistryService;

const baseLayer = Layer.mergeAll(
  Layer.succeed(LineMessagingChannelRepository)(makeMessagingStore()),
  Layer.succeed(LineLoginChannelRepository)(makeLoginStore()),
  Layer.succeed(LineProviderRepository)(makeProviderRepository()),
  Layer.succeed(LineClientRegistry)(makeRegistry()),
);

describe("LineChannelManagement service override", () => {
  test("default list channels returns all channels", async () => {
    const layer = LineChannelManagement.layer.pipe(Layer.provide(baseLayer));

    const channels = await Effect.runPromise(
      Effect.flatMap(LineChannelManagement, (m) => m.listChannels({})).pipe(Effect.provide(layer)),
    );

    expect(channels.data).toHaveLength(2);
    expect(channels.data.map((c) => c.name)).toEqual(["Alpha", "Beta"]);
    expect(channels.pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1,
    });
  });

  test("consumer can override listChannels to apply user-scoped filtering", async () => {
    // Simulate a consumer's user-channel assignment service
    class UserChannelStore extends Context.Service<
      UserChannelStore,
      {
        readonly listAssignedChannelIds: (userId: string) => Effect.Effect<ReadonlySet<string>>;
      }
    >()("effect-line-manager/UserChannelStore") {}

    // User "alice" is only assigned to channel-1
    const userChannelLayer = Layer.succeed(
      UserChannelStore,
      UserChannelStore.of({
        listAssignedChannelIds: (userId) =>
          Effect.succeed(userId === "alice" ? new Set(["channel-1"]) : new Set()),
      }),
    );

    // Consumer creates their own management layer that wraps the default
    // and overrides only listChannels with user-scoped filtering
    const userScopedManagementLayer = Layer.effect(LineChannelManagement)(
      Effect.gen(function* () {
        const base = yield* makeLineChannelManagement;
        const userChannels = yield* UserChannelStore;

        return LineChannelManagement.of({
          ...base,
          listChannels: (query) =>
            Effect.gen(function* () {
              const userId = "alice"; // in real app, from auth context
              const assignedIds = yield* userChannels.listAssignedChannelIds(userId);
              const all = yield* base.listChannels(query ?? {});
              const data = all.data.filter((c) => assignedIds.has(c.channelId));
              return {
                data,
                pagination: {
                  page: 1,
                  pageSize: data.length,
                  totalItems: data.length,
                  totalPages: data.length === 0 ? 0 : 1,
                },
              };
            }).pipe(Effect.withSpan("UserScopedManagement.listChannels")),
        });
      }),
    ).pipe(Layer.provide(baseLayer), Layer.provide(userChannelLayer));

    const channels = await Effect.runPromise(
      Effect.flatMap(LineChannelManagement, (m) => m.listChannels({})).pipe(
        Effect.provide(userScopedManagementLayer),
      ),
    );

    // Alice only sees channel-1 (Alpha)
    expect(channels.data).toHaveLength(1);
    expect(channels.data[0]!.name).toBe("Alpha");
  });

  test("consumer retains original deleteChannel when overriding listChannels()", async () => {
    let deleteCalled = false;
    const messagingStore: LineMessagingChannelRepositoryService = {
      ...makeMessagingStore(),
      findByLineChannelId: () =>
        Effect.succeed(Option.some(makeChannel(uid1, channelId1, "Alpha"))),
      delete: () =>
        Effect.sync(() => {
          deleteCalled = true;
        }),
    };

    const testBaseLayer = Layer.mergeAll(
      Layer.succeed(LineMessagingChannelRepository)(messagingStore),
      Layer.succeed(LineLoginChannelRepository)(makeLoginStore()),
      Layer.succeed(LineProviderRepository)(makeProviderRepository()),
      Layer.succeed(LineClientRegistry)(makeRegistry()),
    );

    const userScopedManagementLayer = Layer.effect(LineChannelManagement)(
      Effect.gen(function* () {
        const base = yield* makeLineChannelManagement;
        return LineChannelManagement.of({
          ...base,
          listChannels: (query) =>
            base.listChannels(query ?? {}).pipe(
              Effect.map((page) => ({
                data: page.data.slice(0, 1),
                pagination: {
                  page: 1,
                  pageSize: 1,
                  totalItems: 1,
                  totalPages: 1,
                },
              })),
            ),
        });
      }),
    ).pipe(Layer.provide(testBaseLayer));

    await Effect.runPromise(
      Effect.flatMap(LineChannelManagement, (m) => m.deleteChannel(uid1)).pipe(
        Effect.provide(userScopedManagementLayer),
      ),
    );

    expect(deleteCalled).toBe(true);
  });
});
