import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";

import { type ProviderListPage } from "../../src/provider/domain.ts";
import { type ChannelListPage } from "../../src/channel/domain.ts";
import { type LiffAppListPage } from "../../src/liff/domain.ts";
import {
  LineProviderManagement,
  type LineProviderManagementService,
} from "../../src/provider/service.ts";
import {
  LineChannelManagement,
  type LineChannelManagementService,
} from "../../src/channel/service.ts";
import { LineLiffManagement, type LineLiffManagementService } from "../../src/liff/service.ts";
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

const defaultProviderMgmt: LineProviderManagementService = {
  listProviders: Effect.succeed(emptyProviderPage),
  getProvider: () => Effect.die("unused"),
  createProvider: () => Effect.die("unused"),
  updateProvider: () => Effect.die("unused"),
  deleteProvider: () => Effect.die("unused"),
};

const defaultChannelMgmt: LineChannelManagementService = {
  listChannels: () => Effect.succeed(emptyChannelPage),
  getChannel: () => Effect.die("unused"),
  findChannelByBotUserId: () => Effect.die("unused"),
  createChannel: () => Effect.die("unused"),
  updateChannel: () => Effect.die("unused"),
  deleteChannel: () => Effect.die("unused"),
};

const defaultLiffMgmt: LineLiffManagementService = {
  listLiffApps: () => Effect.succeed(emptyLiffPage),
  getLiffApp: () => Effect.die("unused"),
  createLiffApp: () => Effect.die("unused"),
  updateLiffApp: () => Effect.die("unused"),
  deleteLiffApp: () => Effect.die("unused"),
};

const makeWebHandler = (
  providerMgmt: LineProviderManagementService,
  channelMgmt: LineChannelManagementService,
  liffMgmt: LineLiffManagementService,
) =>
  HttpRouter.toWebHandler(
    LineApiLayer.pipe(
      Layer.provide(Layer.succeed(LineProviderManagement)(providerMgmt)),
      Layer.provide(Layer.succeed(LineChannelManagement)(channelMgmt)),
      Layer.provide(Layer.succeed(LineLiffManagement)(liffMgmt)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

describe("LineApi query validation", () => {
  test("rejects an empty providerId before calling listChannels", async () => {
    const calls: Array<unknown> = [];
    const web = makeWebHandler(
      defaultProviderMgmt,
      {
        ...defaultChannelMgmt,
        listChannels: (providerId) =>
          Effect.sync(() => {
            calls.push(providerId);
            return emptyChannelPage;
          }),
      },
      defaultLiffMgmt,
    );

    const response = await web.handler(new Request("http://localhost/line-channels?providerId="));

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });

  test("rejects an empty channelId before calling listLiffApps", async () => {
    const calls: Array<unknown> = [];
    const web = makeWebHandler(defaultProviderMgmt, defaultChannelMgmt, {
      ...defaultLiffMgmt,
      listLiffApps: (channelId) =>
        Effect.sync(() => {
          calls.push(channelId);
          return emptyLiffPage;
        }),
    });

    const response = await web.handler(new Request("http://localhost/line-liff-apps?channelId="));

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });
});
