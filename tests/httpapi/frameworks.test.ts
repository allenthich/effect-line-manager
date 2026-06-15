import { afterEach, describe, expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import express4 from "express";
import express5 from "express5";
import type { Application } from "express";
import { request as nodeRequest, type Server } from "node:http";
import {
  LineAccountManagement,
  type LineAccountManagementService,
} from "../../src/account/management.ts";

const unusedManagementMethods: Omit<
  LineAccountManagementService,
  "list" | "create" | "update" | "delete"
> = {
  listProviders: Effect.die("unused"),
  getProvider: () => Effect.die("unused"),
  createProvider: () => Effect.die("unused"),
  updateProvider: () => Effect.die("unused"),
  deleteProvider: () => Effect.die("unused"),
  listChannels: () => Effect.die("unused"),
  getChannel: () => Effect.die("unused"),
  findChannelByBotUserId: () => Effect.die("unused"),
  createChannel: () => Effect.die("unused"),
  updateChannel: () => Effect.die("unused"),
  deleteChannel: () => Effect.die("unused"),
  listLiffApps: () => Effect.die("unused"),
  getLiffApp: () => Effect.die("unused"),
  createLiffApp: () => Effect.die("unused"),
  updateLiffApp: () => Effect.die("unused"),
  deleteLiffApp: () => Effect.die("unused"),
};

import { createHonoLineAccountManagementApp } from "../../examples/httpapi/hono.ts";
import { createExpressLineAccountManagementMiddleware } from "../../examples/httpapi/express.ts";

class SetupError extends Error {
  readonly _tag = "SetupError";
}

const account = {
  id: "record-1",
  name: "Primary",
  channelId: "channel-1",
  botUserId: null,
  basicId: "@primary",
  displayName: "Primary Bot",
  pictureUrl: null,
  isActive: true,
  loginChannelId: null,
  liffId: null,
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-11T00:00:00.000Z"),
  hasChannelSecret: true,
  hasChannelAccessToken: true,
  hasLoginChannelSecret: false,
};

const management: LineAccountManagementService = {
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
  create: (input) => Effect.succeed({ ...account, name: input.name }),
  update: (_id, input) => Effect.succeed({ ...account, ...input }),
  delete: () => Effect.void,
};

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error === undefined ? resolve() : reject(error)));
        }),
    ),
  );
});

const listen = async (app: Application): Promise<string> => {
  const server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", reject);
  });
  servers.push(server);
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing server address");
  return `http://127.0.0.1:${address.port}`;
};

const requestJson = (
  url: string,
  options: { readonly method?: string; readonly body?: unknown } = {},
) =>
  new Promise<{ readonly status: number; readonly body: unknown }>((resolve, reject) => {
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const request = nodeRequest(
      url,
      {
        method: options.method ?? "GET",
        headers:
          body === undefined
            ? undefined
            : {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(body),
              },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            resolve({
              status: response.statusCode ?? 0,
              body: text === "" ? undefined : JSON.parse(text),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("error", reject);
    if (body !== undefined) request.write(body);
    request.end();
  });

describe("HTTP API framework examples", () => {
  test("rejects malformed JSON responses from the request helper", async () => {
    const app = express4();
    app.get("/broken-json", (_request, response) => {
      response.type("application/json").send("{");
    });

    const baseUrl = await listen(app);

    await expect(requestJson(`${baseUrl}/broken-json`, {})).rejects.toBeInstanceOf(SyntaxError);
  });

  test("mounts the Fetch handler in Hono after consumer auth middleware and disposes resources", async () => {
    let authorized = false;
    let disposed = false;
    const managementLayer = Layer.effect(LineAccountManagement)(
      Effect.acquireRelease(Effect.succeed(management), () =>
        Effect.sync(() => void (disposed = true)),
      ),
    );
    const mounted = createHonoLineAccountManagementApp({
      prefix: "/api/admin",
      managementLayer,
      authorize: async (_context, next) => {
        authorized = true;
        await next();
      },
    });

    const response = await mounted.app.request("/api/admin/line-accounts");

    expect(response.status).toBe(200);
    expect(authorized).toBe(true);
    expect(await response.json()).toEqual({
      data: [
        {
          ...account,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: 1,
        totalPages: 1,
      },
    });
    await mounted.dispose();
    expect(disposed).toBe(true);
  });

  for (const [name, express] of [
    ["Express 4", express4],
    ["Express 5", express5],
  ] as const) {
    test(`mounts before body parsers with ${name} and forwards the unconsumed JSON body`, async () => {
      const app = express();
      const mounted = createExpressLineAccountManagementMiddleware({
        managementLayer: Layer.succeed(LineAccountManagement)(management),
      });
      app.use("/api/admin", mounted.middleware);
      app.use(express.json());
      const baseUrl = await listen(app);

      const response = await requestJson(`${baseUrl}/api/admin/line-accounts`, {
        method: "POST",
        body: {
          name: `${name} account`,
          channelId: "channel-1",
          channelSecret: "secret",
          channelAccessToken: "token",
          loginChannelId: null,
          loginChannelSecret: null,
          liffId: null,
        },
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: `${name} account` });
      await mounted.dispose();
    });
  }

  test("forwards asynchronous setup failures to Express next", async () => {
    const app = express4();
    const mounted = createExpressLineAccountManagementMiddleware({
      managementLayer: Layer.effect(LineAccountManagement)(
        Effect.fail(new SetupError("setup failed")),
      ),
    });
    app.use("/api/admin", mounted.middleware);
    app.use(
      (
        error: unknown,
        _request: express4.Request,
        response: express4.Response,
        _next: express4.NextFunction,
      ) => {
        response.status(503).json({ message: error instanceof Error ? error.message : "unknown" });
      },
    );
    const baseUrl = await listen(app);

    const response = await requestJson(`${baseUrl}/api/admin/line-accounts`);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: "setup failed" });
    await mounted.dispose();
  });
});
