import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import {
  makeLineClient,
  makeLineProviderManagementAdapter,
  type LineClient,
} from "../../src/httpapi/index.ts";

const providerJson = {
  id: "record-1",
  name: "Primary Provider",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
};

describe("generated LINE HTTP client", () => {
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
                      data: [providerJson],
                      pagination: {
                        page: 1,
                        pageSize: 1,
                        totalItems: 1,
                        totalPages: 1,
                      },
                    }
                  : providerJson,
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
        const client = yield* makeLineClient({
          baseUrl: "https://example.test/api/admin",
        });
        yield* client.lineProviders.listProviders();
        yield* client.lineProviders.createProvider({
          payload: {
            name: "Primary Provider",
          },
        });
        yield* client.lineProviders.updateProvider({
          params: { id: "record-1" as any },
          payload: { name: "Renamed" },
        });
        yield* client.lineProviders.deleteProvider({ params: { id: "record-1" as any } });
      }).pipe(Effect.provide(Layer.succeed(HttpClient.HttpClient)(httpClient))),
    );

    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ["GET", "https://example.test/api/admin/line-providers"],
      ["POST", "https://example.test/api/admin/line-providers"],
      ["PATCH", "https://example.test/api/admin/line-providers/record-1"],
      ["DELETE", "https://example.test/api/admin/line-providers/record-1"],
    ]);
  });

  test("bridges only the supplied generated client to the Promise web adapter", async () => {
    const calls: unknown[] = [];
    const fakeClient = {
      lineProviders: {
        listProviders: () =>
          Effect.sync(() => {
            calls.push("listProviders");
            return {
              data: [providerJson],
              pagination: {
                page: 1,
                pageSize: 1,
                totalItems: 1,
                totalPages: 1,
              },
            };
          }),
        createProvider: ({ payload }: { readonly payload: unknown }) =>
          Effect.sync(() => (calls.push(["createProvider", payload]), providerJson)),
        updateProvider: ({
          params,
          payload,
        }: {
          readonly params: unknown;
          readonly payload: unknown;
        }) => Effect.sync(() => (calls.push(["updateProvider", params, payload]), providerJson)),
        deleteProvider: ({ params }: { readonly params: unknown }) =>
          Effect.sync(() => void calls.push(["deleteProvider", params])),
      },
    } as unknown as LineClient;
    const adapter = makeLineProviderManagementAdapter(fakeClient);

    await adapter.listProviders();
    await adapter.createProvider({
      name: "Primary Provider",
    });
    await adapter.updateProvider("record-1", { name: "Renamed" });
    await adapter.deleteProvider("record-1");

    expect(calls).toEqual([
      "listProviders",
      [
        "createProvider",
        {
          name: "Primary Provider",
        },
      ],
      ["updateProvider", { id: "record-1" }, { name: "Renamed" }],
      ["deleteProvider", { id: "record-1" }],
    ]);
  });
});
