import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";

import { type ProviderListPage } from "../../src/provider/domain.ts";
import {
  type LineMessagingChannelListPage,
  type LineLoginChannelListPage,
} from "../../src/channels/management-domain.ts";
import { type LiffAppListPage } from "../../src/liff/domain.ts";
import {
  LineProviderManagement,
  type LineProviderManagementService,
} from "../../src/provider/service.ts";
import {
  LineMessagingChannelManagement,
  type LineMessagingChannelManagementService,
} from "../../src/channels/management-service.ts";
import {
  LineLoginChannelManagement,
  type LineLoginChannelManagementService,
} from "../../src/channels/management-service.ts";
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

const emptyMessagingChannelPage: LineMessagingChannelListPage = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 0,
    totalItems: 0,
    totalPages: 1,
  },
};

const emptyLoginChannelPage: LineLoginChannelListPage = {
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
  listProviders: () => Effect.succeed(emptyProviderPage),
  getProvider: () => Effect.die("unused"),
  createProvider: () => Effect.die("unused"),
  updateProvider: () => Effect.die("unused"),
  deleteProvider: () => Effect.die("unused"),
};

const defaultMessagingChannelMgmt: LineMessagingChannelManagementService = {
  listChannels: () => Effect.succeed(emptyMessagingChannelPage),
  getChannel: () => Effect.die("unused"),
  findChannelByBotUserId: () => Effect.die("unused"),
  createChannel: () => Effect.die("unused"),
  updateChannel: () => Effect.die("unused"),
  deleteChannel: () => Effect.die("unused"),
};

const defaultLoginChannelMgmt: LineLoginChannelManagementService = {
  listChannels: () => Effect.succeed(emptyLoginChannelPage),
  getChannel: () => Effect.die("unused"),
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
  messagingChannelMgmt: LineMessagingChannelManagementService,
  loginChannelMgmt: LineLoginChannelManagementService,
  liffMgmt: LineLiffManagementService,
) =>
  HttpRouter.toWebHandler(
    LineApiLayer.pipe(
      Layer.provide(Layer.succeed(LineProviderManagement)(providerMgmt)),
      Layer.provide(Layer.succeed(LineMessagingChannelManagement)(messagingChannelMgmt)),
      Layer.provide(Layer.succeed(LineLoginChannelManagement)(loginChannelMgmt)),
      Layer.provide(Layer.succeed(LineLiffManagement)(liffMgmt)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

describe("LineApi query validation", () => {
  test("rejects an empty providerId before calling listMessagingChannels", async () => {
    const calls: Array<unknown> = [];
    const web = makeWebHandler(
      defaultProviderMgmt,
      {
        ...defaultMessagingChannelMgmt,
        listChannels: (query) =>
          Effect.sync(() => {
            calls.push(query);
            return emptyMessagingChannelPage;
          }),
      },
      defaultLoginChannelMgmt,
      defaultLiffMgmt,
    );

    const response = await web.handler(
      new Request("http://localhost/line-messaging-channels?providerId="),
    );

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });

  test("rejects an empty channelId before calling listLiffApps", async () => {
    const calls: Array<unknown> = [];
    const web = makeWebHandler(
      defaultProviderMgmt,
      defaultMessagingChannelMgmt,
      defaultLoginChannelMgmt,
      {
        ...defaultLiffMgmt,
        listLiffApps: (query) =>
          Effect.sync(() => {
            calls.push(query);
            return emptyLiffPage;
          }),
      },
    );

    const response = await web.handler(new Request("http://localhost/line-liff-apps?channelId="));

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });
});
