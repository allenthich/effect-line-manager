import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import {
  MessagingChannel,
  ChannelView,
  LineChannelRecordId,
  LineProviderId,
  LineChannelId,
} from "../../src/account/domain.ts";
import { LineAccountPersistenceError, LineRepositoryError } from "../../src/account/errors.ts";
import { LineClientRegistry, type LineClientRegistryService } from "../../src/account/registry.ts";
import { LineAccountManagement, toChannelView } from "../../src/account/management.ts";
import { LineRepository, type LineRepositoryService } from "../../src/account/repository.ts";

const recordId = Schema.decodeUnknownSync(LineChannelRecordId)("record-1");
const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");

const makeChannel = (overrides: Partial<MessagingChannel> = {}) =>
  new MessagingChannel({
    id: recordId,
    providerId,
    channelType: "messaging",
    name: "Support Channel",
    channelId: Schema.decodeUnknownSync(LineChannelId)("1234567890"),
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make("channel-token"),
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
    ...overrides,
  });

const makeRepository = (overrides: Partial<LineRepositoryService> = {}): LineRepositoryService =>
  ({
    createProvider: () => Effect.die("unused"),
    updateProvider: () => Effect.die("unused"),
    findProviderById: () => Effect.die("unused"),
    listProviders: Effect.die("unused"),
    deleteProvider: () => Effect.die("unused"),
    createChannel: () => Effect.succeed(makeChannel()),
    updateChannel: () => Effect.succeed(makeChannel()),
    findChannelById: () => Effect.succeed(Option.some(makeChannel())),
    findChannelByMessagingId: () => Effect.die("unused"),
    findChannelByBotUserId: () => Effect.die("unused"),
    listChannelsByProvider: () => Effect.die("unused"),
    deleteChannel: () => Effect.void,
    createLiffApp: () => Effect.die("unused"),
    updateLiffApp: () => Effect.die("unused"),
    findLiffAppById: () => Effect.die("unused"),
    listLiffAppsByChannel: () => Effect.die("unused"),
    deleteLiffApp: () => Effect.die("unused"),
    ...overrides,
  }) as any;

const makeRegistry = (invalidated: string[]): LineClientRegistryService =>
  ({
    getMessagingClient: () => Effect.die("unused"),
    getLoginClient: () => Effect.die("unused"),
    getLiffClient: () => Effect.die("unused"),
    syncBotProfile: () => Effect.die("unused"),
    invalidateChannel: (id: any) => Effect.sync(() => invalidated.push(id)),
    invalidateLiff: (id: any) => Effect.sync(() => invalidated.push(id)),
    invalidateAll: Effect.sync(() => invalidated.push("*")),
  }) as any;

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
  test("maps persisted channels to credential-safe views", () => {
    const view = toChannelView(makeChannel());
    const encoded = Schema.encodeSync(ChannelView)(view);

    expect(encoded).toEqual({
      id: "record-1",
      providerId: "provider-1",
      channelType: "messaging",
      name: "Support Channel",
      channelId: "1234567890",
      botUserId: null,
      basicId: null,
      displayName: null,
      pictureUrl: null,
      isActive: true,
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
      hasChannelSecret: true,
      hasChannelAccessToken: true,
    });
    expect(JSON.stringify(encoded)).not.toContain("channel-secret");
    expect(JSON.stringify(encoded)).not.toContain("channel-token");
  });

  test("converts create credentials to redacted values and invalidates the created id", async () => {
    const invalidated: string[] = [];
    let observedInput: any;
    const repository = makeRepository({
      createChannel: (input) => {
        observedInput = input;
        return Effect.succeed(makeChannel());
      },
    });

    const result = await run(
      Effect.flatMap(LineAccountManagement, (management) =>
        management.createChannel({
          channelType: "messaging",
          providerId: "provider-1",
          name: "Support Channel",
          channelId: "1234567890",
          channelSecret: "channel-secret",
          channelAccessToken: "channel-token",
        }),
      ),
      repository,
      makeRegistry(invalidated),
    );

    expect(Redacted.value(observedInput.channelSecret)).toBe("channel-secret");
    expect(Redacted.value(observedInput.channelAccessToken)).toBe("channel-token");
    expect(invalidated).toEqual(["record-1"]);
    expect(result.id).toBe("record-1");
  });

  test("preserves omitted credentials during update", async () => {
    const invalidated: string[] = [];
    let observedInput: any;
    const repository = makeRepository({
      updateChannel: (id, input) => {
        observedInput = input;
        return Effect.succeed(makeChannel());
      },
    });

    await run(
      Effect.flatMap(LineAccountManagement, (management) =>
        management.updateChannel(recordId, { name: "Renamed" }),
      ),
      repository,
      makeRegistry(invalidated),
    );

    expect(observedInput).toEqual({ name: "Renamed" });
    expect(observedInput).not.toHaveProperty("channelSecret");
    expect(observedInput).not.toHaveProperty("channelAccessToken");
    expect(invalidated).toEqual(["record-1"]);
  });

  test("clears all cached descendants after deleting a provider", async () => {
    const invalidated: string[] = [];

    await run(
      Effect.flatMap(LineAccountManagement, (management) => management.deleteProvider(providerId)),
      makeRepository({
        findProviderById: () =>
          Effect.succeed(Option.some({ id: providerId, name: "LINE Marketing" } as any)),
        deleteProvider: () => Effect.void,
      }),
      makeRegistry(invalidated),
    );

    expect(invalidated).toEqual(["*"]);
  });

  test("clears all cached descendants after deleting a channel", async () => {
    const invalidated: string[] = [];

    await run(
      Effect.flatMap(LineAccountManagement, (management) => management.deleteChannel(recordId)),
      makeRepository({
        deleteChannel: () => Effect.void,
      }),
      makeRegistry(invalidated),
    );

    expect(invalidated).toEqual(["*"]);
  });

  test("logs foreign repository failures as sanitized persistence errors without invalidating", async () => {
    const invalidated: string[] = [];
    const failure = new LineRepositoryError({
      operation: "updateChannel",
      cause: new Error("database password leaked here"),
    });

    const result = await run(
      Effect.flatMap(LineAccountManagement, (management) =>
        management.updateChannel(recordId, { name: "test" }),
      ).pipe(Effect.flip),
      makeRepository({ updateChannel: () => Effect.fail(failure) }),
      makeRegistry(invalidated),
    );

    expect(result).toEqual(new LineAccountPersistenceError({ operation: "updateChannel" }));
    expect(JSON.stringify(result)).not.toContain("database password");
    expect(invalidated).toEqual([]);
  });
});
