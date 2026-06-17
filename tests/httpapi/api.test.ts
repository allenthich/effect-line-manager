import { describe, expect, test } from "vite-plus/test";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiTest } from "effect/unstable/httpapi";
import { ProviderView, LineProviderId } from "../../src/provider/domain.ts";
import { ChannelView, LineChannelRecordId, LineChannelId } from "../../src/channel/domain.ts";
import { LiffAppView, LineLiffRecordId } from "../../src/liff/domain.ts";
import {
  LineProviderNotFoundError,
  LineProviderDuplicateError,
} from "../../src/provider/errors.ts";
import { ChannelNotFoundError, ChannelDuplicateError } from "../../src/channel/errors.ts";
import { LiffAppNotFoundError, LiffAppDuplicateError } from "../../src/liff/errors.ts";
import { LineAccountPersistenceError } from "../../src/shared/errors.ts";
import {
  LineProviderManagement,
  type LineProviderManagementService,
} from "../../src/provider/service.ts";
import {
  LineChannelManagement,
  type LineChannelManagementService,
} from "../../src/channel/service.ts";
import { LineLiffManagement, type LineLiffManagementService } from "../../src/liff/service.ts";
import {
  LineApi,
  LineApiLayer,
  LineValidationMiddlewareLayer,
  providerHandlers,
  channelHandlers,
  liffAppHandlers,
} from "../../src/httpapi/index.ts";

const providerId = Schema.decodeUnknownSync(LineProviderId)("provider-1");
const channelRecordId = Schema.decodeUnknownSync(LineChannelRecordId)("channel-record-1");
const liffRecordId = Schema.decodeUnknownSync(LineLiffRecordId)("liff-record-1");

const providerView = Schema.decodeUnknownSync(ProviderView)({
  id: providerId,
  name: "LINE Marketing",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
});

const channelView = Schema.decodeUnknownSync(ChannelView)({
  id: channelRecordId,
  providerId,
  channelType: "messaging",
  name: "Support Channel",
  channelId: "1234567890",
  botUserId: null,
  basicId: null,
  displayName: null,
  pictureUrl: null,
  isActive: true,
  channelSecret: "channel-secret",
  channelAccessToken: "channel-token",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
});

const liffAppView = Schema.decodeUnknownSync(LiffAppView)({
  id: liffRecordId,
  loginChannelId: channelRecordId,
  liffId: "1234567890-AbCdEf12",
  view: {
    type: "tall",
    url: "https://example.com/liff",
  },
  description: "Loyalty Card Dashboard",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
});

const makeClient = (
  providerMgmt: LineProviderManagementService,
  channelMgmt: LineChannelManagementService,
  liffMgmt: LineLiffManagementService,
) =>
  HttpApiTest.groups(LineApi, ["lineProviders", "lineChannels", "lineLiffApps"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        providerHandlers.pipe(Layer.provide(Layer.succeed(LineProviderManagement)(providerMgmt))),
        channelHandlers.pipe(Layer.provide(Layer.succeed(LineChannelManagement)(channelMgmt))),
        liffAppHandlers.pipe(Layer.provide(Layer.succeed(LineLiffManagement)(liffMgmt))),
        LineValidationMiddlewareLayer,
        NodeHttpServer.layerHttpServices,
      ),
    ),
    Effect.scoped,
  );

const defaultProviderMgmt: LineProviderManagementService = {
  listProviders: Effect.succeed({
    data: [providerView],
    pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
  }),
  getProvider: () => Effect.succeed(providerView),
  createProvider: () => Effect.succeed(providerView),
  updateProvider: () => Effect.succeed(providerView),
  deleteProvider: () => Effect.void,
};

const defaultChannelMgmt: LineChannelManagementService = {
  listChannels: () =>
    Effect.succeed({
      data: [channelView],
      pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
    }),
  getChannel: () => Effect.succeed(channelView),
  findChannelByBotUserId: () => Effect.die("unused"),
  createChannel: () => Effect.succeed(channelView),
  updateChannel: () => Effect.succeed(channelView),
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

describe("LineApi", () => {
  test("exercises all credential-safe endpoints through HttpApiTest", async () => {
    const calls: Array<unknown> = [];
    const providerMgmt: LineProviderManagementService = {
      listProviders: Effect.sync(() => {
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

    const channelMgmt: LineChannelManagementService = {
      listChannels: (providerId) =>
        Effect.sync(() => {
          calls.push(["listChannels", providerId]);
          return {
            data: [channelView],
            pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
          };
        }),
      getChannel: (id) => Effect.sync(() => (calls.push(["getChannel", id]), channelView)),
      findChannelByBotUserId: () => Effect.die("unused in api test"),
      createChannel: (input) =>
        Effect.sync(() => (calls.push(["createChannel", input]), channelView)),
      updateChannel: (id, input) =>
        Effect.sync(() => (calls.push(["updateChannel", id, input]), channelView)),
      deleteChannel: (id) => Effect.sync(() => void calls.push(["deleteChannel", id])),
    };

    const liffMgmt: LineLiffManagementService = {
      listLiffApps: (channelId) =>
        Effect.sync(() => {
          calls.push(["listLiffApps", channelId]);
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
        const client = yield* makeClient(providerMgmt, channelMgmt, liffMgmt);

        // Providers
        const listedProviders = yield* client.lineProviders.listProviders();
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

        // Channels
        const listedChannels = yield* client.lineChannels.listChannels({ query: {} });
        const createdChannel = yield* client.lineChannels.createChannel({
          payload: {
            providerId: "provider-1",
            channelType: "messaging",
            name: "Support Channel",
            channelId: "1234567890",
            channelSecret: "secret",
            channelAccessToken: "token",
          },
        });
        const updatedChannel = yield* client.lineChannels.updateChannel({
          params: { id: channelRecordId },
          payload: { name: "New Support Bot" },
        });
        const gottenChannel = yield* client.lineChannels.getChannel({
          params: { id: channelRecordId },
        });
        yield* client.lineChannels.deleteChannel({ params: { id: channelRecordId } });

        // LIFF Apps
        const listedLiffs = yield* client.lineLiffApps.listLiffApps({ query: {} });
        const createdLiff = yield* client.lineLiffApps.createLiffApp({
          payload: {
            loginChannelId: "channel-record-1",
            liffId: "1234567890-AbCdEf12",
            view: { type: "tall", url: "https://example.com/liff" },
            description: "Loyalty Card Dashboard",
          },
        });
        const updatedLiff = yield* client.lineLiffApps.updateLiffApp({
          params: { id: liffRecordId },
          payload: { view: { type: "tall", url: "https://example.com/liff" } },
        });
        const gottenLiff = yield* client.lineLiffApps.getLiffApp({
          params: { id: liffRecordId },
        });
        yield* client.lineLiffApps.deleteLiffApp({ params: { id: liffRecordId } });

        expect(listedProviders.data).toEqual([providerView]);
        expect(createdProvider).toEqual(providerView);
        expect(updatedProvider).toEqual(providerView);
        expect(gottenProvider).toEqual(providerView);

        expect(listedChannels.data).toEqual([channelView]);
        expect(createdChannel).toEqual(channelView);
        expect(updatedChannel).toEqual(channelView);
        expect(gottenChannel).toEqual(channelView);

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

    expect(calls).toContainEqual(["listChannels", undefined]);
    expect(calls).toContainEqual(["getChannel", "channel-record-1"]);
    expect(calls).toContainEqual(["deleteChannel", "channel-record-1"]);

    expect(calls).toContainEqual(["listLiffApps", undefined]);
    expect(calls).toContainEqual(["getLiffApp", "liff-record-1"]);
    expect(calls).toContainEqual(["deleteLiffApp", "liff-record-1"]);
  });

  test("maps expected service failures to stable typed HTTP errors", async () => {
    const providerDuplicate = new LineProviderDuplicateError({ name: "LINE Marketing" });
    const providerNotFound = new LineProviderNotFoundError({ providerId });
    const channelDuplicate = new ChannelDuplicateError({
      channelId: Schema.decodeUnknownSync(LineChannelId)("1234567890"),
    });
    const channelNotFound = new ChannelNotFoundError({ recordId: channelRecordId });
    const liffDuplicate = new LiffAppDuplicateError({ liffId: "1234567890-AbCdEf12" });
    const liffNotFound = new LiffAppNotFoundError({ recordId: liffRecordId });

    const providerMgmt: LineProviderManagementService = {
      ...defaultProviderMgmt,
      createProvider: () => Effect.fail(providerDuplicate),
      getProvider: () => Effect.fail(providerNotFound),
    };

    const channelMgmt: LineChannelManagementService = {
      ...defaultChannelMgmt,
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
        const client = yield* makeClient(providerMgmt, channelMgmt, liffMgmt);

        const providerDupErr = yield* client.lineProviders
          .createProvider({ payload: { name: "LINE Marketing" } })
          .pipe(Effect.flip);
        const providerNotErr = yield* client.lineProviders
          .getProvider({ params: { id: providerId } })
          .pipe(Effect.flip);

        const channelDupErr = yield* client.lineChannels
          .createChannel({
            payload: {
              providerId: "provider-1",
              channelType: "messaging",
              name: "Support Channel",
              channelId: "1234567890",
              channelSecret: "secret",
              channelAccessToken: "token",
            },
          })
          .pipe(Effect.flip);
        const channelNotErr = yield* client.lineChannels
          .getChannel({ params: { id: channelRecordId } })
          .pipe(Effect.flip);

        const liffDupErr = yield* client.lineLiffApps
          .createLiffApp({
            payload: {
              loginChannelId: "channel-record-1",
              liffId: "1234567890-AbCdEf12",
              view: { type: "tall", url: "https://example.com/liff" },
              description: "Loyalty Card Dashboard",
            },
          })
          .pipe(Effect.flip);
        const liffNotErr = yield* client.lineLiffApps
          .getLiffApp({ params: { id: liffRecordId } })
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
          recordId: "channel-record-1",
        });
        expect(liffDupErr).toMatchObject({
          _tag: "LiffAppDuplicateHttpError",
          liffId: "1234567890-AbCdEf12",
        });
        expect(liffNotErr).toMatchObject({
          _tag: "LiffAppNotFoundHttpError",
          recordId: "liff-record-1",
        });
      }).pipe(Effect.orDie),
    );
  });

  test("sanitizes persistence failures", async () => {
    const providerMgmt: LineProviderManagementService = {
      ...defaultProviderMgmt,
      listProviders: Effect.fail(new LineAccountPersistenceError({ operation: "listProviders" })),
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient(providerMgmt, defaultChannelMgmt, defaultLiffMgmt);
        const error = yield* client.lineProviders.listProviders().pipe(Effect.flip);
        expect(error).toMatchObject({
          _tag: "LinePersistenceHttpError",
          operation: "listProviders",
        });
        expect(JSON.stringify(error)).not.toContain("cause");
      }).pipe(Effect.orDie),
    );
  });

  test("returns declared success and validation statuses over Fetch", async () => {
    const web = makeWebHandler(defaultProviderMgmt, defaultChannelMgmt, defaultLiffMgmt);

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
