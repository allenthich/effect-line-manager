import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Option, Schema } from "effect";
import { LineProviderId } from "../../src/provider/domain.ts";

import { LineClientRegistry } from "../../src/registry/index.ts";
import { LineProviderManagement } from "../../src/provider/service.ts";
import {
  LineProviderRepository,
  type LineProviderRepositoryService,
} from "../../src/provider/repository.ts";

const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");

const makeRepository = (
  overrides: Partial<LineProviderRepositoryService> = {},
): LineProviderRepositoryService =>
  ({
    createProvider: () => Effect.die("unused"),
    updateProvider: () => Effect.die("unused"),
    findProviderById: () => Effect.die("unused"),
    listProviders: () => Effect.die("unused"),
    deleteProvider: () => Effect.void,
    ...overrides,
  }) as any;

const makeRegistry = (invalidated: string[]): any =>
  ({
    invalidateAll: Effect.sync(() => invalidated.push("*")),
  }) as any;

const run = <A, E>(
  effect: Effect.Effect<A, E, LineProviderManagement>,
  repository: LineProviderRepositoryService,
  registry: any,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        LineProviderManagement.layer.pipe(
          Layer.provide(Layer.succeed(LineProviderRepository)(repository)),
          Layer.provide(Layer.succeed(LineClientRegistry)(registry)),
        ),
      ),
    ),
  );

describe("LineProviderManagement", () => {
  test("clears all cached descendants after deleting a provider", async () => {
    const invalidated: string[] = [];

    await run(
      Effect.flatMap(LineProviderManagement, (management) => management.deleteProvider(providerId)),
      makeRepository({
        findProviderById: () =>
          Effect.succeed(
            Option.some({
              id: providerId,
              name: "LINE Marketing",
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any),
          ),
        deleteProvider: () => Effect.void,
      }),
      makeRegistry(invalidated),
    );

    expect(invalidated).toEqual(["*"]);
  });
});
