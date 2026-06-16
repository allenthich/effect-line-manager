import { describe, expect, test } from "vite-plus/test";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiTest } from "effect/unstable/httpapi";
import {
  CreateLineAccountInput,
  LineAccountView,
  LineChannelId,
  LineChannelRecordId,
} from "../../src/account/domain.ts";
import {
  LineAccountDuplicateChannelError,
  LineAccountNotFoundError,
  LineAccountPersistenceError,
} from "../../src/account/errors.ts";
import {
  LineAccountManagement,
  type LineAccountManagementService,
} from "../../src/account/management.ts";

const unusedManagementMethods: Omit<
  LineAccountManagementService,
  "list" | "create" | "update" | "delete"
> = {
  listProviders: Effect.die("unused in api test"),
  getProvider: () => Effect.die("unused in api test"),
  createProvider: () => Effect.die("unused in api test"),
  updateProvider: () => Effect.die("unused in api test"),
  deleteProvider: () => Effect.die("unused in api test"),
  listChannels: () => Effect.die("unused in api test"),
  getChannel: () => Effect.die("unused in api test"),
  findChannelByBotUserId: () => Effect.die("unused in api test"),
  createChannel: () => Effect.die("unused in api test"),
  updateChannel: () => Effect.die("unused in api test"),
  deleteChannel: () => Effect.die("unused in api test"),
  listLiffApps: () => Effect.die("unused in api test"),
  getLiffApp: () => Effect.die("unused in api test"),
  createLiffApp: () => Effect.die("unused in api test"),
  updateLiffApp: () => Effect.die("unused in api test"),
  deleteLiffApp: () => Effect.die("unused in api test"),
};
import {
  LineAccountManagementApi,
  LineAccountManagementApiLayer,
  LineAccountManagementHandlers,
  LineAccountValidationMiddlewareLayer,
} from "../../src/httpapi/index.ts";

const recordId = Schema.decodeUnknownSync(LineChannelRecordId)("record-1");
const account = Schema.decodeUnknownSync(LineAccountView)({
  id: recordId,
  name: "Primary",
  channelId: "channel-1",
  botUserId: null,
  basicId: "@primary",
  displayName: "Primary Bot",
  pictureUrl: null,
  isActive: true,
  loginChannelId: null,
  liffId: null,
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
  hasChannelSecret: true,
  hasChannelAccessToken: true,
  hasLoginChannelSecret: false,
});

const makeClient = (management: LineAccountManagementService) =>
  HttpApiTest.groups(LineAccountManagementApi, ["lineAccounts"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        LineAccountManagementHandlers.pipe(
          Layer.provide(Layer.succeed(LineAccountManagement)(management)),
        ),
        LineAccountValidationMiddlewareLayer,
        NodeHttpServer.layerHttpServices,
      ),
    ),
    Effect.scoped,
  );

const baseManagement = (): LineAccountManagementService => ({
  ...unusedManagementMethods,
  list: Effect.succeed({
    data: [account],
    pagination: {
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    },
  }),
  create: () => Effect.succeed(account),
  update: () => Effect.succeed(account),
  delete: () => Effect.void,
});

const makeWebHandler = (management: LineAccountManagementService) =>
  HttpRouter.toWebHandler(
    LineAccountManagementApiLayer.pipe(
      Layer.provide(Layer.succeed(LineAccountManagement)(management)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

describe("LineAccountManagementApi", () => {
  test("exercises all four credential-safe endpoints through HttpApiTest", async () => {
    const calls: Array<unknown> = [];
    const management: LineAccountManagementService = {
      ...unusedManagementMethods,
      list: Effect.sync(() => {
        calls.push("list");
        return {
          data: [account],
          pagination: {
            page: 1,
            pageSize: 1,
            totalItems: 1,
            totalPages: 1,
          },
        };
      }),
      create: (input) => Effect.sync(() => (calls.push(["create", input]), account)),
      update: (id, input) => Effect.sync(() => (calls.push(["update", id, input]), account)),
      delete: (id) => Effect.sync(() => void calls.push(["delete", id])),
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient(management);
        const listed = yield* client.lineAccounts.list();
        const payload = yield* Schema.decodeUnknownEffect(CreateLineAccountInput)({
          name: "Primary",
          channelId: "channel-1",
          channelSecret: "secret",
          channelAccessToken: "token",
          loginChannelId: null,
          loginChannelSecret: null,
          liffId: null,
        });
        const created = yield* client.lineAccounts.create({
          payload,
        });
        const updated = yield* client.lineAccounts.update({
          params: { id: recordId },
          payload: { name: "Renamed" },
        });
        yield* client.lineAccounts.delete({ params: { id: recordId } });

        expect(listed).toEqual({
          data: [account],
          pagination: {
            page: 1,
            pageSize: 1,
            totalItems: 1,
            totalPages: 1,
          },
        });
        expect(created).toEqual(account);
        expect(updated).toEqual(account);
      }),
    );

    expect(calls).toEqual([
      "list",
      [
        "create",
        {
          name: "Primary",
          channelId: "channel-1",
          channelSecret: "secret",
          channelAccessToken: "token",
          loginChannelId: null,
          loginChannelSecret: null,
          liffId: null,
        },
      ],
      ["update", "record-1", { name: "Renamed" }],
      ["delete", "record-1"],
    ]);
    expect(JSON.stringify(calls[0])).not.toContain("secret");
  });

  test("maps expected service failures to stable typed HTTP errors", async () => {
    const duplicate = new LineAccountDuplicateChannelError({
      channelId: Schema.decodeUnknownSync(LineChannelId)("channel-1"),
    });
    const notFound = new LineAccountNotFoundError({ recordId });
    const management: LineAccountManagementService = {
      ...baseManagement(),
      create: () => Effect.fail(duplicate),
      update: () => Effect.fail(notFound),
      delete: () => Effect.fail(notFound),
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient(management);
        const createError = yield* client.lineAccounts
          .create({
            payload: {
              name: "Primary",
              channelId: "channel-1",
              channelSecret: "secret",
              channelAccessToken: "token",
              loginChannelId: null,
              loginChannelSecret: null,
              liffId: null,
            },
          })
          .pipe(Effect.flip);
        const updateError = yield* client.lineAccounts
          .update({ params: { id: recordId }, payload: { name: "Renamed" } })
          .pipe(Effect.flip);
        const deleteError = yield* client.lineAccounts
          .delete({ params: { id: recordId } })
          .pipe(Effect.flip);

        expect(createError).toMatchObject({
          _tag: "LineAccountDuplicateChannelHttpError",
          channelId: "channel-1",
        });
        expect(updateError).toMatchObject({
          _tag: "LineAccountNotFoundHttpError",
          recordId: "record-1",
        });
        expect(deleteError).toMatchObject({
          _tag: "LineAccountNotFoundHttpError",
          recordId: "record-1",
        });
      }),
    );
  });

  test("sanitizes persistence failures", async () => {
    const management: LineAccountManagementService = {
      ...baseManagement(),
      list: Effect.fail(new LineAccountPersistenceError({ operation: "listAll" })),
    };

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient(management);
        const error = yield* client.lineAccounts.list().pipe(Effect.flip);
        expect(error).toMatchObject({
          _tag: "LineAccountPersistenceHttpError",
          operation: "listAll",
        });
        expect(JSON.stringify(error)).not.toContain("cause");
      }),
    );
  });

  test("returns declared success and validation statuses over Fetch", async () => {
    const web = makeWebHandler(baseManagement());

    const listResponse = await web.handler(new Request("http://localhost/line-accounts"));
    const createResponse = await web.handler(
      new Request("http://localhost/line-accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Primary",
          channelId: "channel-1",
          channelSecret: "secret",
          channelAccessToken: "token",
          loginChannelId: null,
          loginChannelSecret: null,
          liffId: null,
        }),
      }),
    );
    const updateResponse = await web.handler(
      new Request("http://localhost/line-accounts/record-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      }),
    );
    const deleteResponse = await web.handler(
      new Request("http://localhost/line-accounts/record-1", { method: "DELETE" }),
    );
    const validationResponse = await web.handler(
      new Request("http://localhost/line-accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Missing credentials" }),
      }),
    );

    expect(listResponse.status).toBe(200);
    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(204);
    expect(validationResponse.status).toBe(400);
    expect(await validationResponse.json()).toEqual({
      _tag: "LineAccountValidationError",
      message: "The request did not match the expected schema.",
    });
    await web.dispose();
  });

  test("returns 404, 409, and sanitized 500 responses over Fetch", async () => {
    const duplicate = new LineAccountDuplicateChannelError({
      channelId: Schema.decodeUnknownSync(LineChannelId)("channel-1"),
    });
    const notFound = new LineAccountNotFoundError({ recordId });
    const web = makeWebHandler({
      ...baseManagement(),
      list: Effect.fail(new LineAccountPersistenceError({ operation: "listAll" })),
      create: () => Effect.fail(duplicate),
      update: () => Effect.fail(notFound),
      delete: () => Effect.fail(notFound),
    });

    const persistenceResponse = await web.handler(new Request("http://localhost/line-accounts"));
    const duplicateResponse = await web.handler(
      new Request("http://localhost/line-accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Primary",
          channelId: "channel-1",
          channelSecret: "secret",
          channelAccessToken: "token",
          loginChannelId: null,
          loginChannelSecret: null,
          liffId: null,
        }),
      }),
    );
    const notFoundResponse = await web.handler(
      new Request("http://localhost/line-accounts/record-1", { method: "DELETE" }),
    );

    expect(persistenceResponse.status).toBe(500);
    expect(await persistenceResponse.json()).toEqual({
      _tag: "LineAccountPersistenceHttpError",
      operation: "listAll",
    });
    expect(duplicateResponse.status).toBe(409);
    expect(notFoundResponse.status).toBe(404);
    await web.dispose();
  });
});
