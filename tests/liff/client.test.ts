import { describe, expect, test } from "vite-plus/test";
import { Effect, Redacted } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { makeLineLiffClient } from "../../src/liff/client.ts";

const baseUrl = "https://line-liff.test";

describe("LINE LIFF API client", () => {
  test("fetches all liff applications", async () => {
    const requests: any[] = [];
    const httpClient = HttpClient.make((request) => {
      requests.push(request);
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              apps: [
                {
                  liffId: "liff-id-1",
                  view: { type: "full", url: "https://my-app.test" },
                  description: "My App",
                },
              ],
            }),
            { status: 200 },
          ),
        ),
      );
    });

    const client = makeLineLiffClient(httpClient, Redacted.make("access-token-123"), { baseUrl });

    const apps = await Effect.runPromise(client.getLiffApps());
    expect(apps).toEqual([
      {
        liffId: "liff-id-1",
        view: { type: "full", url: "https://my-app.test" },
        description: "My App",
      },
    ]);

    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.method).toBe("GET");
    expect(req.url).toBe(`${baseUrl}/liff/v1/apps`);
    expect(req.headers.authorization).toBe("Bearer access-token-123");
  });

  test("creates a liff app returning its identifier", async () => {
    const requests: any[] = [];
    const httpClient = HttpClient.make((request) => {
      requests.push(request);
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ liffId: "new-liff-id" }), { status: 200 }),
        ),
      );
    });

    const client = makeLineLiffClient(httpClient, Redacted.make("access-token-123"), { baseUrl });

    const liffId = await Effect.runPromise(
      client.createLiffApp({
        view: { type: "tall", url: "https://my-app.test/view" },
        description: "tall view app",
      }),
    );

    expect(liffId).toBe("new-liff-id");
    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.method).toBe("POST");
    expect(req.url).toBe(`${baseUrl}/liff/v1/apps`);
  });

  test("updates a liff app", async () => {
    const requests: any[] = [];
    const httpClient = HttpClient.make((request) => {
      requests.push(request);
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, new Response(null, { status: 200 })),
      );
    });

    const client = makeLineLiffClient(httpClient, Redacted.make("access-token-123"), { baseUrl });

    await Effect.runPromise(
      client.updateLiffApp("liff-id-1", {
        view: { type: "compact", url: "https://my-app.test/compact" },
      }),
    );

    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.method).toBe("PUT");
    expect(req.url).toBe(`${baseUrl}/liff/v1/apps/liff-id-1`);
  });

  test("deletes a liff app", async () => {
    const requests: any[] = [];
    const httpClient = HttpClient.make((request) => {
      requests.push(request);
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, new Response(null, { status: 200 })),
      );
    });

    const client = makeLineLiffClient(httpClient, Redacted.make("access-token-123"), { baseUrl });

    await Effect.runPromise(client.deleteLiffApp("liff-id-1"));

    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.method).toBe("DELETE");
    expect(req.url).toBe(`${baseUrl}/liff/v1/apps/liff-id-1`);
  });
});
