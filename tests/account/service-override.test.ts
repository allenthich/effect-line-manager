import { describe, expect, test } from "vite-plus/test";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import {
  MessagingChannel,
  LineChannelId,
  LineChannelRecordId,
  LineProviderId,
} from "../../src/account/domain.ts";
import { LineAccountManagement, makeLineAccountManagement } from "../../src/account/management.ts";
import { LineClientRegistry, type LineClientRegistryService } from "../../src/account/registry.ts";
import { LineRepository, type LineRepositoryService } from "../../src/account/repository.ts";

const recordId1 = Schema.decodeUnknownSync(LineChannelRecordId)("record-1");
const recordId2 = Schema.decodeUnknownSync(LineChannelRecordId)("record-2");
const channelId1 = Schema.decodeUnknownSync(LineChannelId)("channel-1");
const channelId2 = Schema.decodeUnknownSync(LineChannelId)("channel-2");
const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");

const makeChannel = (id: LineChannelRecordId, channelId: LineChannelId, name: string) =>
  new MessagingChannel({
    id,
    providerId,
    channelType: "messaging",
    name,
    channelId,
    channelSecret: Redacted.make("secret"),
    channelAccessToken: Redacted.make("token"),
    botUserId: null,
    basicId: null,
    displayName: null,
    pictureUrl: null,
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
  });

const channel1 = makeChannel(recordId1, channelId1, "Alpha");
const channel2 = makeChannel(recordId2, channelId2, "Beta");

const makeRepository = (): LineRepositoryService =>
  ({
    createProvider: () => Effect.die("unused"),
    updateProvider: () => Effect.die("unused"),
    findProviderById: () => Effect.succeedNone,
    listProviders: Effect.succeed([
      {
        id: providerId,
        name: "LINE Marketing",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]),
    deleteProvider: () => Effect.die("unused"),
    createChannel: () => Effect.die("unused"),
    updateChannel: () => Effect.die("unused"),
    findChannelById: () => Effect.succeedNone,
    findChannelByMessagingId: () => Effect.succeedNone,
    findChannelByBotUserId: () => Effect.succeedNone,
    listChannelsByProvider: () => Effect.succeed([channel1, channel2]),
    deleteChannel: () => Effect.void,
    createLiffApp: () => Effect.die("unused"),
    updateLiffApp: () => Effect.die("unused"),
    findLiffAppById: () => Effect.succeedNone,
    listLiffAppsByChannel: () => Effect.succeed([]),
    deleteLiffApp: () => Effect.die("unused"),
  }) as LineRepositoryService;

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
  Layer.succeed(LineRepository)(makeRepository()),
  Layer.succeed(LineClientRegistry)(makeRegistry()),
);

describe("LineAccountManagement service override", () => {
  test("default list channels returns all channels", async () => {
    const layer = LineAccountManagement.layer.pipe(Layer.provide(baseLayer));

    const channels = await Effect.runPromise(
      Effect.flatMap(LineAccountManagement, (m) => m.listChannels(undefined)).pipe(
        Effect.provide(layer),
      ),
    );

    expect(channels.data).toHaveLength(2);
    expect(channels.data.map((c) => c.name)).toEqual(["Alpha", "Beta"]);
    expect(channels.pagination).toEqual({
      page: 1,
      pageSize: 2,
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
    const userScopedManagementLayer = Layer.effect(LineAccountManagement)(
      Effect.gen(function* () {
        const base = yield* makeLineAccountManagement;
        const userChannels = yield* UserChannelStore;

        return LineAccountManagement.of({
          ...base,
          listChannels: (providerId) =>
            Effect.gen(function* () {
              const userId = "alice"; // in real app, from auth context
              const assignedIds = yield* userChannels.listAssignedChannelIds(userId);
              const all = yield* base.listChannels(providerId);
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
      Effect.flatMap(LineAccountManagement, (m) => m.listChannels(undefined)).pipe(
        Effect.provide(userScopedManagementLayer),
      ),
    );

    // Alice only sees channel-1 (Alpha)
    expect(channels.data).toHaveLength(1);
    expect(channels.data[0]!.name).toBe("Alpha");
  });

  test("consumer retains original deleteChannel when overriding listChannels()", async () => {
    let deleteCalled = false;
    const repo: LineRepositoryService = {
      ...makeRepository(),
      deleteChannel: () =>
        Effect.sync(() => {
          deleteCalled = true;
        }),
    };

    const testBaseLayer = Layer.mergeAll(
      Layer.succeed(LineRepository)(repo),
      Layer.succeed(LineClientRegistry)(makeRegistry()),
    );

    const userScopedManagementLayer = Layer.effect(LineAccountManagement)(
      Effect.gen(function* () {
        const base = yield* makeLineAccountManagement;
        return LineAccountManagement.of({
          ...base,
          listChannels: (providerId) =>
            base.listChannels(providerId).pipe(
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
      Effect.flatMap(LineAccountManagement, (m) => m.deleteChannel(recordId1)).pipe(
        Effect.provide(userScopedManagementLayer),
      ),
    );

    expect(deleteCalled).toBe(true);
  });
});
