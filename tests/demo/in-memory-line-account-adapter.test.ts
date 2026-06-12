import { expect, test } from "vite-plus/test";
import { createInMemoryLineAccountAdapter } from "../../demo/in-memory-line-account-adapter.ts";
import type { LineAccountView } from "../../src/web/index.ts";

const seed: LineAccountView = {
  id: "seed-1",
  name: "Seed account",
  channelId: "channel-seed",
  botUserId: null,
  basicId: null,
  displayName: null,
  pictureUrl: null,
  isActive: true,
  loginChannelId: null,
  liffId: null,
  hasChannelAccessToken: true,
  hasChannelSecret: true,
  hasLoginChannelSecret: false,
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

test("provides isolated in-memory CRUD behavior for the demo page", async () => {
  const adapter = createInMemoryLineAccountAdapter([seed]);

  expect(await adapter.list()).toEqual({
    data: [seed],
    pagination: {
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    },
  });

  const created = await adapter.create({
    name: "Created account",
    channelId: "channel-created",
    channelAccessToken: "token",
    channelSecret: "secret",
    loginChannelId: "login-created",
    loginChannelSecret: "login-secret",
    liffId: "liff-created",
  });
  expect(created).toMatchObject({
    id: "demo-account-2",
    name: "Created account",
    channelId: "channel-created",
    isActive: true,
    loginChannelId: "login-created",
    liffId: "liff-created",
  });

  const updated = await adapter.update(created.id, {
    name: "Renamed account",
    isActive: false,
    liffId: null,
  });
  expect(updated).toMatchObject({
    id: created.id,
    name: "Renamed account",
    channelId: "channel-created",
    isActive: false,
    liffId: null,
  });

  await adapter.delete(seed.id);
  expect(await adapter.list()).toEqual({
    data: [updated],
    pagination: {
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    },
  });

  const secondAdapter = createInMemoryLineAccountAdapter([seed]);
  expect(await secondAdapter.list()).toEqual({
    data: [seed],
    pagination: {
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    },
  });
});
