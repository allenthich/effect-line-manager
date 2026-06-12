import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import {
  makeLineAccountManagementAdapter,
  makeLineAccountManagementClient,
  type LineAccountManagementClient,
} from "../../src/httpapi/index.ts";

const accountJson = {
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
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
  hasChannelSecret: true,
  hasChannelAccessToken: true,
  hasLoginChannelSecret: false,
};

describe("generated LINE account client", () => {
  test("uses the supplied HTTP client and base URL for relative API paths", async () => {
    const requests: HttpClientRequest.HttpClientRequest[] = [];
    const httpClient = HttpClient.make((request) => {
      requests.push(request);
      const response =
        request.method === "DELETE"
          ? new Response(null, { status: 204 })
          : new Response(
              JSON.stringify(
                request.method === "GET"
                  ? {
                      data: [accountJson],
                      pagination: {
                        page: 1,
                        pageSize: 1,
                        totalItems: 1,
                        totalPages: 1,
                      },
                    }
                  : accountJson,
              ),
              {
                status: request.method === "POST" ? 201 : 200,
                headers: { "content-type": "application/json" },
              },
            );
      return Effect.succeed(HttpClientResponse.fromWeb(request, response));
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeLineAccountManagementClient({
          baseUrl: "https://example.test/api/admin",
        });
        yield* client.lineAccounts.list();
        yield* client.lineAccounts.create({
          payload: {
            name: "Primary",
            channelId: "channel-1",
            channelSecret: "secret",
            channelAccessToken: "token",
            loginChannelId: null,
            loginChannelSecret: null,
            liffId: null,
          },
        });
        yield* client.lineAccounts.update({
          params: { id: "record-1" as never },
          payload: { name: "Renamed" },
        });
        yield* client.lineAccounts.delete({ params: { id: "record-1" as never } });
      }).pipe(Effect.provide(Layer.succeed(HttpClient.HttpClient)(httpClient))),
    );

    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ["GET", "https://example.test/api/admin/line-accounts"],
      ["POST", "https://example.test/api/admin/line-accounts"],
      ["PATCH", "https://example.test/api/admin/line-accounts/record-1"],
      ["DELETE", "https://example.test/api/admin/line-accounts/record-1"],
    ]);
    expect(requests[1]?.body.toString()).not.toContain("[REDACTED]");
  });

  test("bridges only the supplied generated client to the Promise web adapter", async () => {
    const calls: unknown[] = [];
    const fakeClient = {
      lineAccounts: {
        list: () =>
          Effect.sync(() => {
            calls.push("list");
            return {
              data: [accountJson],
              pagination: {
                page: 1,
                pageSize: 1,
                totalItems: 1,
                totalPages: 1,
              },
            };
          }),
        create: ({ payload }: { readonly payload: unknown }) =>
          Effect.sync(() => (calls.push(["create", payload]), accountJson)),
        update: ({ params, payload }: { readonly params: unknown; readonly payload: unknown }) =>
          Effect.sync(() => (calls.push(["update", params, payload]), accountJson)),
        delete: ({ params }: { readonly params: unknown }) =>
          Effect.sync(() => void calls.push(["delete", params])),
      },
    } as unknown as LineAccountManagementClient;
    const adapter = makeLineAccountManagementAdapter(fakeClient);

    await adapter.list();
    await adapter.create({
      name: "Primary",
      channelId: "channel-1",
      channelSecret: "secret",
      channelAccessToken: "token",
      loginChannelId: null,
      loginChannelSecret: null,
      liffId: null,
    });
    await adapter.update("record-1", { name: "Renamed" });
    await adapter.delete("record-1");

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
      ["update", { id: "record-1" }, { name: "Renamed" }],
      ["delete", { id: "record-1" }],
    ]);
  });
});
