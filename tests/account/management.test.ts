import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import {
  CreateLineAccountInput,
  LineAccount,
  LineAccountView,
  LineChannelId,
  LineChannelRecordId,
  LineLoginChannelId,
} from "../../src/account/domain.ts";
import {
  LineAccountDuplicateChannelError,
  LineAccountNotFoundError,
  LineAccountPersistenceError,
  LineRepositoryError,
} from "../../src/account/errors.ts";
import { LineClientRegistry, type LineClientRegistryService } from "../../src/account/registry.ts";
import { LineAccountManagement, toLineAccountView } from "../../src/account/management.ts";
import { LineRepository, type LineRepositoryService } from "../../src/account/repository.ts";

const recordId = Schema.decodeUnknownSync(LineChannelRecordId)("record-1");
const otherRecordId = Schema.decodeUnknownSync(LineChannelRecordId)("record-2");
const channelId = Schema.decodeUnknownSync(LineChannelId)("channel-1");
const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("login-1");

const makeAccount = (overrides: Partial<LineAccount> = {}) =>
  new LineAccount({
    id: recordId,
    name: "Primary",
    channelId,
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make("channel-token"),
    botUserId: "U123",
    basicId: "@primary",
    displayName: "Primary Bot",
    pictureUrl: "https://example.test/bot.png",
    isActive: true,
    loginChannelId,
    loginChannelSecret: Redacted.make("login-secret"),
    liffId: null,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
    ...overrides,
  });

const makeRepository = (overrides: Partial<LineRepositoryService> = {}): LineRepositoryService =>
  ({
    // Deprecated
    create: () => Effect.succeed(makeAccount()),
    update: () => Effect.succeed(makeAccount()),
    findById: () => Effect.succeed(Option.some(makeAccount())),
    findByChannelId: () => Effect.succeedNone,
    findByBotUserId: () => Effect.succeedNone,
    listAll: Effect.succeed([makeAccount()]),
    deleteById: () => Effect.void,
    // New methods (unused in deprecated tests)
    createProvider: () => Effect.die("unused"),
    updateProvider: () => Effect.die("unused"),
    findProviderById: () => Effect.die("unused"),
    listProviders: Effect.die("unused"),
    deleteProvider: () => Effect.die("unused"),
    createChannel: () => Effect.die("unused"),
    updateChannel: () => Effect.die("unused"),
    findChannelById: () => Effect.die("unused"),
    findChannelByMessagingId: () => Effect.die("unused"),
    findChannelByBotUserId: () => Effect.die("unused"),
    listChannelsByProvider: () => Effect.die("unused"),
    deleteChannel: () => Effect.die("unused"),
    createLiffApp: () => Effect.die("unused"),
    updateLiffApp: () => Effect.die("unused"),
    findLiffAppById: () => Effect.die("unused"),
    listLiffAppsByChannel: () => Effect.die("unused"),
    deleteLiffApp: () => Effect.die("unused"),
    ...overrides,
  }) as LineRepositoryService;

const makeRegistry = (invalidated: string[]): LineClientRegistryService =>
  ({
    getMessagingClient: () => Effect.die("unused"),
    getLoginClient: () => Effect.die("unused"),
    getLiffClient: () => Effect.die("unused"),
    syncBotProfile: () => Effect.die("unused"),
    invalidateChannel: (id) => Effect.sync(() => invalidated.push(id)),
    invalidateLiff: (id) => Effect.sync(() => invalidated.push(id)),
    invalidate: (id) => Effect.sync(() => invalidated.push(id)),
    invalidateAll: Effect.void,
  }) as LineClientRegistryService;

const run = <A, E>(
  effect: Effect.Effect<A, E, LineAccountManagement>,
  repository: LineRepositoryService,
  registry: LineClientRegistryService,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        LineAccountManagement.layer.pipe(
          Layer.provide(Layer.succeed(LineRepository)(repository)),
          Layer.provide(Layer.succeed(LineClientRegistry)(registry)),
        ),
      ),
    ),
  );

describe("LineAccountManagement", () => {
  test("maps persisted accounts to credential-safe views", () => {
    const view = toLineAccountView(makeAccount());
    const encoded = Schema.encodeSync(LineAccountView)(view);

    expect(encoded).toEqual({
      id: "record-1",
      name: "Primary",
      channelId: "channel-1",
      botUserId: "U123",
      basicId: "@primary",
      displayName: "Primary Bot",
      pictureUrl: "https://example.test/bot.png",
      isActive: true,
      loginChannelId: "login-1",
      liffId: null,
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
      hasChannelSecret: true,
      hasChannelAccessToken: true,
      hasLoginChannelSecret: true,
    });
    expect(JSON.stringify(encoded)).not.toContain("channel-secret");
    expect(JSON.stringify(encoded)).not.toContain("channel-token");
    expect(JSON.stringify(encoded)).not.toContain("login-secret");
    expect(Object.keys(encoded).some((key) => key.endsWith("Hint"))).toBe(false);
  });

  test("converts create credentials to redacted values and invalidates the created id", async () => {
    const invalidated: string[] = [];
    let observedInput: Parameters<LineRepositoryService["create"]>[0] | undefined;
    const repository = makeRepository({
      create: (input) => {
        observedInput = input;
        return Effect.succeed(makeAccount());
      },
    });
    const input = Schema.decodeUnknownSync(CreateLineAccountInput)({
      name: "Primary",
      channelId: "channel-1",
      channelSecret: "channel-secret",
      channelAccessToken: "channel-token",
      loginChannelId: "login-1",
      loginChannelSecret: "login-secret",
      liffId: null,
    });

    const result = await run(
      Effect.flatMap(LineAccountManagement, (management) => management.create(input)),
      repository,
      makeRegistry(invalidated),
    );

    expect(Redacted.value(observedInput!.channelSecret)).toBe("channel-secret");
    expect(Redacted.value(observedInput!.channelAccessToken)).toBe("channel-token");
    expect(Redacted.value(observedInput!.loginChannelSecret!)).toBe("login-secret");
    expect(invalidated).toEqual(["record-1"]);
    expect(result.id).toBe("record-1");
  });

  test("preserves omitted credentials during update", async () => {
    const invalidated: string[] = [];
    let observedInput: Parameters<LineRepositoryService["update"]>[1] | undefined;
    const repository = makeRepository({
      update: (_id, input) => {
        observedInput = input;
        return Effect.succeed(makeAccount({ id: otherRecordId, name: input.name ?? "Primary" }));
      },
    });

    await run(
      Effect.flatMap(LineAccountManagement, (management) =>
        management.update(recordId, { name: "Renamed" }),
      ),
      repository,
      makeRegistry(invalidated),
    );

    expect(observedInput).toEqual({ name: "Renamed" });
    expect(observedInput).not.toHaveProperty("channelSecret");
    expect(observedInput).not.toHaveProperty("channelAccessToken");
    expect(observedInput).not.toHaveProperty("loginChannelSecret");
    expect(invalidated).toEqual(["record-1"]);
  });

  test("invalidates the deleted record after persistence succeeds", async () => {
    const invalidated: string[] = [];

    await run(
      Effect.flatMap(LineAccountManagement, (management) => management.delete(recordId)),
      makeRepository(),
      makeRegistry(invalidated),
    );

    expect(invalidated).toEqual(["record-1"]);
  });

  test("preserves expected duplicate and not-found outcomes", async () => {
    const duplicate = new LineAccountDuplicateChannelError({ channelId });
    const notFound = new LineAccountNotFoundError({ recordId });
    const registry = makeRegistry([]);

    await expect(
      run(
        Effect.flatMap(LineAccountManagement, (management) =>
          management.create(
            Schema.decodeUnknownSync(CreateLineAccountInput)({
              name: "Primary",
              channelId: "channel-1",
              channelSecret: "secret",
              channelAccessToken: "token",
              loginChannelId: null,
              loginChannelSecret: null,
              liffId: null,
            }),
          ),
        ).pipe(Effect.flip),
        makeRepository({ create: () => Effect.fail(duplicate) }),
        registry,
      ),
    ).resolves.toBe(duplicate);

    await expect(
      run(
        Effect.flatMap(LineAccountManagement, (management) => management.delete(recordId)).pipe(
          Effect.flip,
        ),
        makeRepository({ deleteById: () => Effect.fail(notFound) }),
        registry,
      ),
    ).resolves.toBe(notFound);
  });

  test("logs foreign repository failures as sanitized persistence errors without invalidating", async () => {
    const invalidated: string[] = [];
    const failure = new LineRepositoryError({
      operation: "update",
      cause: new Error("database password leaked here"),
    });

    const result = await run(
      Effect.flatMap(LineAccountManagement, (management) =>
        management.update(recordId, { isActive: false }),
      ).pipe(Effect.flip),
      makeRepository({ update: () => Effect.fail(failure) }),
      makeRegistry(invalidated),
    );

    expect(result).toEqual(new LineAccountPersistenceError({ operation: "update" }));
    expect(JSON.stringify(result)).not.toContain("database password");
    expect(invalidated).toEqual([]);
  });
});
