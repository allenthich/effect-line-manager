import { describe, expect, test } from "vite-plus/test";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { LineAccount, LineChannelId, LineChannelRecordId } from "../../src/account/domain.ts";
import { LineAccountManagement, makeLineAccountManagement } from "../../src/account/management.ts";
import { LineClientRegistry, type LineClientRegistryService } from "../../src/account/registry.ts";
import { LineRepository, type LineRepositoryService } from "../../src/account/repository.ts";

const recordId1 = Schema.decodeUnknownSync(LineChannelRecordId)("record-1");
const recordId2 = Schema.decodeUnknownSync(LineChannelRecordId)("record-2");
const channelId1 = Schema.decodeUnknownSync(LineChannelId)("channel-1");
const channelId2 = Schema.decodeUnknownSync(LineChannelId)("channel-2");

const makeAccount = (id: LineChannelRecordId, channelId: LineChannelId, name: string) =>
  new LineAccount({
    id,
    name,
    channelId,
    channelSecret: Redacted.make("secret"),
    channelAccessToken: Redacted.make("token"),
    loginChannelId: null,
    loginChannelSecret: null,
    liffId: null,
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
  });

const account1 = makeAccount(recordId1, channelId1, "Alpha");
const account2 = makeAccount(recordId2, channelId2, "Beta");

const makeRepository = (): LineRepositoryService => ({
  create: () => Effect.die("unused"),
  update: () => Effect.die("unused"),
  findById: () => Effect.succeedNone,
  findByChannelId: () => Effect.succeedNone,
  findByBotUserId: () => Effect.succeedNone,
  listAll: () => Effect.succeed([account1, account2]),
  deleteById: () => Effect.die("unused"),
});

const makeRegistry = (): LineClientRegistryService => ({
  getMessagingClient: () => Effect.die("unused"),
  getLoginClient: () => Effect.die("unused"),
  getLiffClient: () => Effect.die("unused"),
  syncBotProfile: () => Effect.die("unused"),
  invalidate: () => Effect.void,
  invalidateAll: () => Effect.void,
});

const baseLayer = Layer.mergeAll(
  Layer.succeed(LineRepository)(makeRepository()),
  Layer.succeed(LineClientRegistry)(makeRegistry()),
);

describe("LineAccountManagement service override", () => {
  test("default list() returns all accounts", async () => {
    const layer = LineAccountManagement.layer.pipe(Layer.provide(baseLayer));

    const accounts = await Effect.runPromise(
      Effect.flatMap(LineAccountManagement, (m) => m.list()).pipe(Effect.provide(layer)),
    );

    expect(accounts).toHaveLength(2);
    expect(accounts.map((a) => a.name)).toEqual(["Alpha", "Beta"]);
  });

  test("consumer can override list() to apply user-scoped filtering", async () => {
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
    // and overrides only list() with user-scoped filtering
    const userScopedManagementLayer = Layer.effect(LineAccountManagement)(
      Effect.gen(function* () {
        const base = yield* makeLineAccountManagement;
        const userChannels = yield* UserChannelStore;

        return LineAccountManagement.of({
          ...base,
          list: Effect.fn("UserScopedManagement.list")(() =>
            Effect.gen(function* () {
              const userId = "alice"; // in real app, from auth context
              const assignedIds = yield* userChannels.listAssignedChannelIds(userId);
              const all = yield* base.list();
              return all.filter((a) => assignedIds.has(a.channelId));
            }),
          ),
        });
      }),
    ).pipe(Layer.provide(baseLayer), Layer.provide(userChannelLayer));

    const accounts = await Effect.runPromise(
      Effect.flatMap(LineAccountManagement, (m) => m.list()).pipe(
        Effect.provide(userScopedManagementLayer),
      ),
    );

    // Alice only sees channel-1 (Alpha)
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.name).toBe("Alpha");
  });

  test("consumer retains original delete when overriding list()", async () => {
    let deleteCalled = false;
    const repo: LineRepositoryService = {
      ...makeRepository(),
      deleteById: () =>
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
          list: () => base.list().pipe(Effect.map((a) => a.slice(0, 1))),
        });
      }),
    ).pipe(Layer.provide(testBaseLayer));

    await Effect.runPromise(
      Effect.flatMap(LineAccountManagement, (m) => m.delete(recordId1)).pipe(
        Effect.provide(userScopedManagementLayer),
      ),
    );

    expect(deleteCalled).toBe(true);
  });
});
