import { describe, expect, test } from "vite-plus/test";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiTest } from "effect/unstable/httpapi";
import { ProviderView, LineProviderId } from "../../src/provider/domain.ts";
import { LineChannelId, LineLoginChannelId } from "../../src/shared/domain.ts";
import {
  LineMessagingChannelView,
  LineLoginChannelView,
} from "../../src/channels/management-domain.ts";
import { LiffAppView, LineLiffId } from "../../src/liff/domain.ts";
import {
  LineProviderNotFoundError,
  LineProviderDuplicateError,
} from "../../src/provider/errors.ts";
import { ChannelNotFoundError, ChannelDuplicateError } from "../../src/shared/errors.ts";
import { LiffAppNotFoundError, LiffAppDuplicateError } from "../../src/liff/errors.ts";
import { LinePersistenceError } from "../../src/shared/errors.ts";
import {
  LineProviderManagement,
  type LineProviderManagementService,
} from "../../src/provider/service.ts";
import {
  LineMessagingChannelManagement,
  type LineMessagingChannelManagementService,
  LineLoginChannelManagement,
  type LineLoginChannelManagementService,
} from "../../src/channels/management-service.ts";
import { LineLiffManagement, type LineLiffManagementService } from "../../src/liff/service.ts";
import {
  LineApi,
  LineApiLayer,
  LineValidationMiddlewareLayer,
  providerHandlers,
  messagingChannelHandlers,
  loginChannelHandlers,
  liffAppHandlers,
} from "../../src/httpapi/index.ts";

const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");
const channelRecordId = Schema.decodeUnknownSync(LineChannelId)("channel-record-1");
const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("channel-record-1");
const liffId = Schema.decodeUnknownSync(LineLiffId)("liff-record-1");

const providerView = Schema.decodeUnknownSync(ProviderView)({
  id: providerId,
  name: "LINE Marketing",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
});

const messagingChannelView: LineMessagingChannelView = {
  id: "channel-record-1",
  channelType: "messaging",
  providerId: "provider-1",
  name: "Support Channel",
  channelId: "1234567890",
  botUserId: null,
  botBasicId: null,
  botDisplayName: null,
  botPictureUrl: null,
  addFriendUrl: null,
  addFriendQrCodeUrl: null,
  isActive: true,
  channelSecret: "channel-secret",
  channelAccessToken: "channel-token",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-11T00:00:00.000Z"),
};

const loginChannelView: LineLoginChannelView = {
  id: "channel-record-2",
  channelType: "login",
  providerId: "provider-1",
  name: "Auth Portal",
  channelId: "0987654321",
  channelSecret: "channel-secret",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-11T00:00:00.000Z"),
};

const liffAppView = Schema.decodeUnknownSync(LiffAppView)({
  id: liffId,
  loginChannelId,
  liffId: "1234567890-AbCdEf12",
  view: {
    type: "tall",
    url: "https://example.com/liff",
  },
  description: "Loyalty Card Dashboard",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
});

const messagingChannelPage = {
  data: [messagingChannelView],
  pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
};

const loginChannelPage = {
  data: [loginChannelView],
  pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
};

const makeClient = (
  providerMgmt: LineProviderManagementService,
  messagingChannelMgmt: LineMessagingChannelManagementService,
  loginChannelMgmt: LineLoginChannelManagementService,
  liffMgmt: LineLiffManagementService,
) =>
  HttpApiTest.groups(LineApi, [
    "lineProviders",
    "lineMessagingChannels",
    "lineLoginChannels",
    "lineLiffApps",
  ]).pipe(
    Effect.provide(
      Layer.mergeAll(
        providerHandlers.pipe(Layer.provide(Layer.succeed(LineProviderManagement)(providerMgmt))),
        messagingChannelHandlers.pipe(
          Layer.provide(Layer.succeed(LineMessagingChannelManagement)(messagingChannelMgmt)),
        ),
        loginChannelHandlers.pipe(
          Layer.provide(Layer.succeed(LineLoginChannelManagement)(loginChannelMgmt)),
        ),
        liffAppHandlers.pipe(Layer.provide(Layer.succeed(LineLiffManagement)(liffMgmt))),
        LineValidationMiddlewareLayer,
        NodeHttpServer.layerHttpServices,
      ),
    ),
    Effect.scoped,
  );

const defaultProviderMgmt: LineProviderManagementService = {
  listProviders: () =>
    Effect.succeed({
      data: [providerView],
      pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
    }),
  getProvider: () => Effect.succeed(providerView),
  createProvider: () => Effect.succeed(providerView),
  updateProvider: () => Effect.succeed(providerView),
  deleteProvider: () => Effect.void,
};

const defaultMessagingChannelMgmt: LineMessagingChannelManagementService = {
  listChannels: () => Effect.succeed(messagingChannelPage),
  getChannel: () => Effect.succeed(messagingChannelView),
  findChannelByBotUserId: () => Effect.die("unused"),
  createChannel: () => Effect.succeed(messagingChannelView),
  updateChannel: () => Effect.succeed(messagingChannelView),
  deleteChannel: () => Effect.void,
};

const defaultLoginChannelMgmt: LineLoginChannelManagementService = {
  listChannels: () => Effect.succeed(loginChannelPage),
  getChannel: () => Effect.succeed(loginChannelView),
  createChannel: () => Effect.succeed(loginChannelView),
  updateChannel: () => Effect.succeed(loginChannelView),
  deleteChannel: () => Effect.void,
};

const defaultLiffMgmt: LineLiffManagementService = {
  listLiffApps: () =>
    Effect.succeed({
      data: [liffAppView],
      pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
    }),
  getLiffApp: () => Effect.succeed(liffAppView),
  createLiffApp: () => Effect.succeed(liffAppView),
  updateLiffApp: () => Effect.succeed(liffAppView),
  deleteLiffApp: () => Effect.void,
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

describe("LineApi", () => {
  test("exercises all credential-safe endpoints through HttpApiTest", async () => {
    const calls: Array<unknown> = [];
    const providerMgmt: LineProviderManagementService = {
      listProviders: () =>
        Effect.sync(() => {
          calls.push("listProviders");
          return {
            data: [providerView],
            pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
          };
        }),
      getProvider: (id) => Effect.sync(() => (calls.push(["getProvider", id]), providerView)),
      createProvider: (input) =>
        Effect.sync(() => (calls.push(["createProvider", input]), providerView)),
      updateProvider: (id, input) =>
        Effect.sync(() => (calls.push(["updateProvider", id, input]), providerView)),
      deleteProvider: (id) => Effect.sync(() => void calls.push(["deleteProvider", id])),
    };

    const messagingMgmt: LineMessagingChannelManagementService = {
      listChannels: (query) =>
        Effect.sync(() => {
          calls.push(["listMessagingChannels", query]);
          return messagingChannelPage;
        }),
      getChannel: (id) =>
        Effect.sync(() => (calls.push(["getMessagingChannel", id]), messagingChannelView)),
      findChannelByBotUserId: () => Effect.die("unused in api test"),
      createChannel: (input) =>
        Effect.sync(() => (calls.push(["createMessagingChannel", input]), messagingChannelView)),
      updateChannel: (id, input) =>
        Effect.sync(
          () => (calls.push(["updateMessagingChannel", id, input]), messagingChannelView),
        ),
      deleteChannel: (id) => Effect.sync(() => void calls.push(["deleteMessagingChannel", id])),
    };

    const loginMgmt: LineLoginChannelManagementService = {
      listChannels: (query) =>
        Effect.sync(() => {
          calls.push(["listLoginChannels", query]);
          return loginChannelPage;
        }),
      getChannel: (id) =>
        Effect.sync(() => (calls.push(["getLoginChannel", id]), loginChannelView)),
      createChannel: (input) =>
        Effect.sync(() => (calls.push(["createLoginChannel", input]), loginChannelView)),
      updateChannel: (id, input) =>
        Effect.sync(() => (calls.push(["updateLoginChannel", id, input]), loginChannelView)),
      deleteChannel: (id) => Effect.sync(() => void calls.push(["deleteLoginChannel", id])),
    };

    const liffMgmt: LineLiffManagementService = {
      listLiffApps: (query) =>
        Effect.sync(() => {
          calls.push(["listLiffApps", query]);
          return {
            data: [liffAppView],
            pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
          };
        }),
      getLiffApp: (id) => Effect.sync(() => (calls.push(["getLiffApp", id]), liffAppView)),
      createLiffApp: (input) =>
        Effect.sync(() => (calls.push(["createLiffApp", input]), liffAppView)),
      updateLiffApp: (id, input) =>
        Effect.sync(() => (calls.push(["updateLiffApp", id, input]), liffAppView)),
      deleteLiffApp: (id) => Effect.sync(() => void calls.push(["deleteLiffApp", id])),
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient(providerMgmt, messagingMgmt, loginMgmt, liffMgmt);

        // Providers
        const listedProviders = yield* client.lineProviders.listProviders({ query: {} });
        const createdProvider = yield* client.lineProviders.createProvider({
          payload: { name: "LINE Marketing" },
        });
        const updatedProvider = yield* client.lineProviders.updateProvider({
          params: { id: providerId },
          payload: { name: "Updated Marketing" },
        });
        const gottenProvider = yield* client.lineProviders.getProvider({
          params: { id: providerId },
        });
        yield* client.lineProviders.deleteProvider({ params: { id: providerId } });

        // Messaging Channels
        const listedMessaging = yield* client.lineMessagingChannels.listMessagingChannels({
          query: {},
        });
        const createdMessaging = yield* client.lineMessagingChannels.createMessagingChannel({
          payload: {
            providerId: "provider-1",
            name: "Support Channel",
            channelId: "1234567890",
            channelSecret: "secret",
            channelAccessToken: "token",
          },
        });
        const updatedMessaging = yield* client.lineMessagingChannels.updateMessagingChannel({
          params: { id: channelRecordId },
          payload: { name: "New Support Bot" },
        });
        const gottenMessaging = yield* client.lineMessagingChannels.getMessagingChannel({
          params: { id: channelRecordId },
        });
        yield* client.lineMessagingChannels.deleteMessagingChannel({
          params: { id: channelRecordId },
        });

        // Login Channels
        const listedLogin = yield* client.lineLoginChannels.listLoginChannels({ query: {} });
        const createdLogin = yield* client.lineLoginChannels.createLoginChannel({
          payload: {
            providerId: "provider-1",
            name: "Auth Portal",
            channelId: "0987654321",
            channelSecret: "secret",
          },
        });
        const updatedLogin = yield* client.lineLoginChannels.updateLoginChannel({
          params: { id: channelRecordId },
          payload: { name: "Renamed Auth Portal" },
        });
        const gottenLogin = yield* client.lineLoginChannels.getLoginChannel({
          params: { id: channelRecordId },
        });
        yield* client.lineLoginChannels.deleteLoginChannel({ params: { id: channelRecordId } });

        // LIFF Apps
        const listedLiffs = yield* client.lineLiffApps.listLiffApps({ query: {} });
        const createdLiff = yield* client.lineLiffApps.createLiffApp({
          payload: {
            loginChannelId,
            liffId: "1234567890-AbCdEf12",
            view: { type: "tall", url: "https://example.com/liff" },
            description: "Loyalty Card Dashboard",
          },
        });
        const updatedLiff = yield* client.lineLiffApps.updateLiffApp({
          params: { id: liffId },
          payload: { view: { type: "tall", url: "https://example.com/liff" } },
        });
        const gottenLiff = yield* client.lineLiffApps.getLiffApp({
          params: { id: liffId },
        });
        yield* client.lineLiffApps.deleteLiffApp({ params: { id: liffId } });

        expect(listedProviders.data).toEqual([providerView]);
        expect(createdProvider).toEqual(providerView);
        expect(updatedProvider).toEqual(providerView);
        expect(gottenProvider).toEqual(providerView);

        expect(listedMessaging.data).toEqual([messagingChannelView]);
        expect(createdMessaging).toEqual(messagingChannelView);
        expect(updatedMessaging).toEqual(messagingChannelView);
        expect(gottenMessaging).toEqual(messagingChannelView);

        expect(listedLogin.data).toEqual([loginChannelView]);
        expect(createdLogin).toEqual(loginChannelView);
        expect(updatedLogin).toEqual(loginChannelView);
        expect(gottenLogin).toEqual(loginChannelView);

        expect(listedLiffs.data).toEqual([liffAppView]);
        expect(createdLiff).toEqual(liffAppView);
        expect(updatedLiff).toEqual(liffAppView);
        expect(gottenLiff).toEqual(liffAppView);
      }).pipe(Effect.orDie),
    );

    expect(calls).toContainEqual("listProviders");
    expect(calls).toContainEqual(["createProvider", { name: "LINE Marketing" }]);
    expect(calls).toContainEqual(["updateProvider", "provider-1", { name: "Updated Marketing" }]);
    expect(calls).toContainEqual(["getProvider", "provider-1"]);
    expect(calls).toContainEqual(["deleteProvider", "provider-1"]);

    expect(calls.some((c) => Array.isArray(c) && c[0] === "listMessagingChannels")).toBe(true);
    expect(calls).toContainEqual(["getMessagingChannel", "channel-record-1"]);
    expect(calls).toContainEqual(["deleteMessagingChannel", "channel-record-1"]);

    expect(calls.some((c) => Array.isArray(c) && c[0] === "listLoginChannels")).toBe(true);
    expect(calls).toContainEqual(["getLoginChannel", "channel-record-1"]);
    expect(calls).toContainEqual(["deleteLoginChannel", "channel-record-1"]);

    expect(calls.some((c) => Array.isArray(c) && c[0] === "listLiffApps")).toBe(true);
    expect(calls).toContainEqual(["getLiffApp", "liff-record-1"]);
    expect(calls).toContainEqual(["deleteLiffApp", "liff-record-1"]);
  });

  test("maps expected service failures to stable typed HTTP errors", async () => {
    const providerDuplicate = new LineProviderDuplicateError({ name: "LINE Marketing" });
    const providerNotFound = new LineProviderNotFoundError({ providerId });
    const channelDuplicate = new ChannelDuplicateError({
      channelId: Schema.decodeUnknownSync(LineChannelId)("1234567890"),
    });
    const channelNotFound = new ChannelNotFoundError({ channelId: channelRecordId });
    const liffDuplicate = new LiffAppDuplicateError({ liffId: "1234567890-AbCdEf12" });
    const liffNotFound = new LiffAppNotFoundError({ liffId });

    const providerMgmt: LineProviderManagementService = {
      ...defaultProviderMgmt,
      createProvider: () => Effect.fail(providerDuplicate),
      getProvider: () => Effect.fail(providerNotFound),
    };

    const messagingMgmt: LineMessagingChannelManagementService = {
      ...defaultMessagingChannelMgmt,
      createChannel: () => Effect.fail(channelDuplicate),
      getChannel: () => Effect.fail(channelNotFound),
    };

    const liffMgmt: LineLiffManagementService = {
      ...defaultLiffMgmt,
      createLiffApp: () => Effect.fail(liffDuplicate),
      getLiffApp: () => Effect.fail(liffNotFound),
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient(
          providerMgmt,
          messagingMgmt,
          defaultLoginChannelMgmt,
          liffMgmt,
        );

        const providerDupErr = yield* client.lineProviders
          .createProvider({ payload: { name: "LINE Marketing" } })
          .pipe(Effect.flip);
        const providerNotErr = yield* client.lineProviders
          .getProvider({ params: { id: providerId } })
          .pipe(Effect.flip);

        const channelDupErr = yield* client.lineMessagingChannels
          .createMessagingChannel({
            payload: {
              providerId: "provider-1",
              name: "Support Channel",
              channelId: "1234567890",
              channelSecret: "secret",
              channelAccessToken: "token",
            },
          })
          .pipe(Effect.flip);
        const channelNotErr = yield* client.lineMessagingChannels
          .getMessagingChannel({ params: { id: channelRecordId } })
          .pipe(Effect.flip);

        const liffDupErr = yield* client.lineLiffApps
          .createLiffApp({
            payload: {
              loginChannelId,
              liffId: "1234567890-AbCdEf12",
              view: { type: "tall", url: "https://example.com/liff" },
              description: "Loyalty Card Dashboard",
            },
          })
          .pipe(Effect.flip);
        const liffNotErr = yield* client.lineLiffApps
          .getLiffApp({ params: { id: liffId } })
          .pipe(Effect.flip);

        expect(providerDupErr).toMatchObject({
          _tag: "ProviderDuplicateHttpError",
          name: "LINE Marketing",
        });
        expect(providerNotErr).toMatchObject({
          _tag: "ProviderNotFoundHttpError",
          providerId: "provider-1",
        });
        expect(channelDupErr).toMatchObject({
          _tag: "ChannelDuplicateHttpError",
          channelId: "1234567890",
        });
        expect(channelNotErr).toMatchObject({
          _tag: "ChannelNotFoundHttpError",
          channelId: "channel-record-1",
        });
        expect(liffDupErr).toMatchObject({
          _tag: "LiffAppDuplicateHttpError",
          liffId: "1234567890-AbCdEf12",
        });
        expect(liffNotErr).toMatchObject({
          _tag: "LiffAppNotFoundHttpError",
          liffId: "liff-record-1",
        });
      }).pipe(Effect.orDie),
    );
  });

  test("sanitizes persistence failures", async () => {
    const providerMgmt: LineProviderManagementService = {
      ...defaultProviderMgmt,
      listProviders: () => Effect.fail(new LinePersistenceError({ operation: "listProviders" })),
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient(
          providerMgmt,
          defaultMessagingChannelMgmt,
          defaultLoginChannelMgmt,
          defaultLiffMgmt,
        );
        const error = yield* client.lineProviders.listProviders({ query: {} }).pipe(Effect.flip);
        expect(error).toMatchObject({
          _tag: "LinePersistenceHttpError",
          operation: "listProviders",
        });
        expect(JSON.stringify(error)).not.toContain("cause");
      }).pipe(Effect.orDie),
    );
  });

  test("returns declared success and validation statuses over Fetch", async () => {
    const web = makeWebHandler(
      defaultProviderMgmt,
      defaultMessagingChannelMgmt,
      defaultLoginChannelMgmt,
      defaultLiffMgmt,
    );

    const listResponse = await web.handler(new Request("http://localhost/line-providers"));
    const createResponse = await web.handler(
      new Request("http://localhost/line-providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "LINE Marketing",
        }),
      }),
    );
    const validationResponse = await web.handler(
      new Request("http://localhost/line-providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(listResponse.status).toBe(200);
    expect(createResponse.status).toBe(201);
    expect(validationResponse.status).toBe(400);
    expect(await validationResponse.json()).toEqual({
      _tag: "LineValidationError",
      message: "The request did not match the expected schema.",
    });
    await web.dispose();
  });
});
