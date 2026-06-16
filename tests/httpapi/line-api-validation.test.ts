import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";

import {
  type ChannelListPage,
  type LiffAppListPage,
  type ProviderListPage,
} from "../../src/account/domain.ts";
import {
  LineAccountManagement,
  type LineAccountManagementService,
} from "../../src/account/management.ts";
import { LineApiLayer } from "../../src/httpapi/handlers.ts";

const emptyProviderPage: ProviderListPage = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 0,
    totalItems: 0,
    totalPages: 1,
  },
};

const emptyChannelPage: ChannelListPage = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 0,
    totalItems: 0,
    totalPages: 1,
  },
};

const emptyLiffPage: LiffAppListPage = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 0,
    totalItems: 0,
    totalPages: 1,
  },
};

const makeManagement = (
  overrides: Partial<LineAccountManagementService>,
): LineAccountManagementService => ({
  listProviders: Effect.succeed(emptyProviderPage),
  getProvider: () => Effect.die("unused in line api validation test"),
  createProvider: () => Effect.die("unused in line api validation test"),
  updateProvider: () => Effect.die("unused in line api validation test"),
  deleteProvider: () => Effect.die("unused in line api validation test"),
  listChannels: () => Effect.succeed(emptyChannelPage),
  getChannel: () => Effect.die("unused in line api validation test"),
  findChannelByBotUserId: () => Effect.die("unused in line api validation test"),
  createChannel: () => Effect.die("unused in line api validation test"),
  updateChannel: () => Effect.die("unused in line api validation test"),
  deleteChannel: () => Effect.die("unused in line api validation test"),
  listLiffApps: () => Effect.succeed(emptyLiffPage),
  getLiffApp: () => Effect.die("unused in line api validation test"),
  createLiffApp: () => Effect.die("unused in line api validation test"),
  updateLiffApp: () => Effect.die("unused in line api validation test"),
  deleteLiffApp: () => Effect.die("unused in line api validation test"),
  list: Effect.die("unused in line api validation test"),
  create: () => Effect.die("unused in line api validation test"),
  update: () => Effect.die("unused in line api validation test"),
  delete: () => Effect.die("unused in line api validation test"),
  ...overrides,
});

const makeWebHandler = (management: LineAccountManagementService) =>
  HttpRouter.toWebHandler(
    LineApiLayer.pipe(
      Layer.provide(Layer.succeed(LineAccountManagement)(management)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

describe("LineApi query validation", () => {
  test("rejects an empty providerId before calling listChannels", async () => {
    const calls: Array<unknown> = [];
    const web = makeWebHandler(
      makeManagement({
        listChannels: (providerId) =>
          Effect.sync(() => {
            calls.push(providerId);
            return emptyChannelPage;
          }),
      }),
    );

    const response = await web.handler(new Request("http://localhost/line-channels?providerId="));

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });

  test("rejects an empty channelId before calling listLiffApps", async () => {
    const calls: Array<unknown> = [];
    const web = makeWebHandler(
      makeManagement({
        listLiffApps: (channelId) =>
          Effect.sync(() => {
            calls.push(channelId);
            return emptyLiffPage;
          }),
      }),
    );

    const response = await web.handler(new Request("http://localhost/line-liff-apps?channelId="));

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });
});
