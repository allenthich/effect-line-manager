import { expect, test } from "vite-plus/test";
import { createInMemoryLineAccountAdapter } from "../../demo/in-memory-line-account-adapter.ts";
import type { ProviderView } from "../../src/web/index.ts";

const seed: ProviderView = {
  id: "seed-1",
  name: "Seed provider",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

test("provides isolated in-memory CRUD behavior for the demo page", async () => {
  const adapter = createInMemoryLineAccountAdapter([seed]);

  expect(await adapter.listProviders()).toEqual({
    data: [seed],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
  });

  const created = await adapter.createProvider({
    name: "Created provider",
  });
  expect(created).toMatchObject({
    id: "demo-provider-2",
    name: "Created provider",
  });

  const updated = await adapter.updateProvider(created.id, {
    name: "Renamed provider",
  });
  expect(updated).toMatchObject({
    id: created.id,
    name: "Renamed provider",
  });

  await adapter.deleteProvider(seed.id);
  expect(await adapter.listProviders()).toEqual({
    data: [updated],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
  });
});
