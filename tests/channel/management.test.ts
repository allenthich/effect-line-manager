import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Logger, Redacted, Schema } from "effect";
import { LineProviderId } from "../../src/provider/domain.ts";
import {
  LineProviderRepository,
  type LineProviderRepositoryService,
} from "../../src/provider/repository.ts";
import {
  MessagingChannel,
  ChannelView,
  LineChannelId,
  LineMessagingChannelId,
} from "../../src/channel/domain.ts";
import { LinePersistenceError, LineRepositoryError } from "../../src/shared/errors.ts";
import { LineClientRegistry } from "../../src/registry/index.ts";
import { LineChannelManagement } from "../../src/channel/service.ts";
import {
  LineChannelRepository,
  type LineChannelRepositoryService,
} from "../../src/channel/repository.ts";
import { provideInternalLineChannelStore } from "../support/internal-channel-store.ts";

const channelId = Schema.decodeUnknownSync(LineChannelId)("record-1");
const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");

const makeChannel = (overrides: Partial<MessagingChannel> = {}) =>
  new MessagingChannel({
    id: channelId,
    providerId,
    channelType: "messaging",
    name: "Support Channel",
    channelId: Schema.decodeUnknownSync(LineMessagingChannelId)("1234567890"),
    channelSecret: Redacted.make("channel-secret"),
    channelAccessToken: Redacted.make("channel-token"),
    isActive: true,
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-11T00:00:00.000Z"),
    ...overrides,
  });

const makeChannelRepository = (
  overrides: Partial<LineChannelRepositoryService> = {},
): LineChannelRepositoryService =>
  ({
    createChannel: () => Effect.succeed(makeChannel()),
    updateChannel: () => Effect.succeed(makeChannel()),
    findChannelByLineChannelId: () => Effect.die("unused"),
    findChannelByBotUserId: () => Effect.die("unused"),
    listChannelsByProvider: () => Effect.die("unused"),
    deleteChannel: () => Effect.void,
    ...overrides,
  }) as any;

const makeProviderRepository = (): LineProviderRepositoryService =>
  ({
    listProviders: Effect.succeed([]),
  }) as any;

const makeRegistry = (invalidated: string[]): any =>
  ({
    invalidateChannel: (id: any) => Effect.sync(() => invalidated.push(id)),
    invalidateAll: Effect.sync(() => invalidated.push("*")),
  }) as any;

const run = <A, E>(
  effect: Effect.Effect<A, E, LineChannelManagement>,
  channelRepository: LineChannelRepositoryService,
  providerRepository: LineProviderRepositoryService,
  registry: any,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        LineChannelManagement.layer.pipe(
          Layer.provide(Layer.succeed(LineChannelRepository)(channelRepository)),
          Layer.provide(provideInternalLineChannelStore(channelRepository)),
          Layer.provide(Layer.succeed(LineProviderRepository)(providerRepository)),
          Layer.provide(Layer.succeed(LineClientRegistry)(registry)),
        ),
      ),
    ),
  );

describe("LineChannelManagement", () => {
  test("maps persisted channels to views with credentials", () => {
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
      channelSecret: "channel-secret",
      channelAccessToken: "channel-token",
    });
    expect(JSON.stringify(encoded)).toContain("channel-secret");
    expect(JSON.stringify(encoded)).toContain("channel-token");
  });

  test("converts create credentials to redacted values and invalidates the created id", async () => {
    const invalidated: string[] = [];
    let observedInput: any;
    const channelRepository = makeChannelRepository({
      createChannel: (input) => {
        observedInput = input;
        return Effect.succeed(makeChannel());
      },
    });

    const result = await run(
      Effect.flatMap(LineChannelManagement, (management) =>
        management.createChannel({
          channelType: "messaging",
          providerId: "provider-1",
          name: "Support Channel",
          channelId: "1234567890",
          channelSecret: "channel-secret",
          channelAccessToken: "channel-token",
        }),
      ),
      channelRepository,
      makeProviderRepository(),
      makeRegistry(invalidated),
    );

    expect(Redacted.value(observedInput.channelSecret)).toBe("channel-secret");
    expect(Redacted.value(observedInput.channelAccessToken)).toBe("channel-token");
    expect(invalidated).toEqual(["1234567890"]);
    expect(result.id).toBe("record-1");
  });

  test("preserves omitted credentials during update", async () => {
    const invalidated: string[] = [];
    let observedInput: any;
    const channelRepository = makeChannelRepository({
      updateChannel: (id, input) => {
        observedInput = input;
        return Effect.succeed(makeChannel());
      },
    });

    await run(
      Effect.flatMap(LineChannelManagement, (management) =>
        management.updateChannel(channelId, { name: "Renamed" }),
      ),
      channelRepository,
      makeProviderRepository(),
      makeRegistry(invalidated),
    );

    expect(observedInput).toEqual({ name: "Renamed" });
    expect(observedInput).not.toHaveProperty("channelSecret");
    expect(observedInput).not.toHaveProperty("channelAccessToken");
    expect(invalidated).toEqual(["1234567890"]);
  });

  test("clears all cached descendants after deleting a channel", async () => {
    const invalidated: string[] = [];

    await run(
      Effect.flatMap(LineChannelManagement, (management) => management.deleteChannel(channelId)),
      makeChannelRepository({
        deleteChannel: () => Effect.void,
      }),
      makeProviderRepository(),
      makeRegistry(invalidated),
    );

    expect(invalidated).toEqual(["*"]);
  });

  test("logs foreign repository failures as sanitized persistence errors without invalidating", async () => {
    const invalidated: string[] = [];
    const repositoryFailure = new LineRepositoryError({
      operation: "updateChannel",
      cause: new Error("database password leaked here"),
    });

    const loggedMessages: string[] = [];
    const testLogger = Logger.make(({ message }) => {
      if (Array.isArray(message)) {
        loggedMessages.push(...message.map(String));
      } else {
        loggedMessages.push(String(message));
      }
    });

    const result = await run(
      Effect.flatMap(LineChannelManagement, (management) =>
        management.updateChannel(channelId, { name: "test" }),
      ).pipe(Effect.flip, Effect.provide(Logger.layer([testLogger]))),
      makeChannelRepository({ updateChannel: () => Effect.fail(repositoryFailure) }),
      makeProviderRepository(),
      makeRegistry(invalidated),
    );

    expect(result).toEqual(new LinePersistenceError({ operation: "updateChannel" }));
    expect(JSON.stringify(result)).not.toContain("database password");
    expect(invalidated).toEqual([]);
    expect(loggedMessages).toContain("LINE channel repository operation failed");
  });
});

import { toChannelView } from "../../src/channel/service.ts";
