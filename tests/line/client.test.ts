import { describe, expect, test } from "vite-plus/test";
import { Effect, Redacted } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import { makeLineApiClient } from "../../src/line/client.ts";
import type { LineMessageTuple } from "../../src/line/domain.ts";

const baseUrl = "https://line.test";

const makeCapturingClient = (status = 200) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = [];
  const client = HttpClient.make((request) => {
    requests.push(request);
    return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(null, { status })));
  });
  return { client, requests } as const;
};

const requestJson = async (request: HttpClientRequest.HttpClientRequest) => {
  const webRequest = await Effect.runPromise(HttpClientRequest.toWeb(request));
  return webRequest.json();
};

const failure = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

describe("LINE API client", () => {
  test("sends an authenticated push message with caller options", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), baseUrl);

    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        retryKey: "retry-1",
        notificationDisabled: true,
      }),
    );

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${baseUrl}/v2/bot/message/push`);
    expect(request.headers.authorization).toBe("Bearer access-token");
    expect(request.headers["x-line-retry-key"]).toBe("retry-1");
    expect(request.headers["content-type"]).toBe("application/json");
    await expect(requestJson(request)).resolves.toEqual({
      to: "U123",
      messages: [{ type: "text", text: "hello" }],
      notificationDisabled: true,
    });
  });

  test("sends an authenticated reply message without a retry header", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), `${baseUrl}/`);

    await Effect.runPromise(
      client.replyMessage("reply-token", [{ type: "text", text: "hello" }], {
        notificationDisabled: false,
      }),
    );

    const request = requests[0]!;
    expect(request.url).toBe(`${baseUrl}/v2/bot/message/reply`);
    expect(request.headers["x-line-retry-key"]).toBeUndefined();
    await expect(requestJson(request)).resolves.toEqual({
      replyToken: "reply-token",
      messages: [{ type: "text", text: "hello" }],
      notificationDisabled: false,
    });
  });

  test.each([200, 201, 204, 299])("accepts status %i as success", async (status) => {
    const { client: httpClient } = makeCapturingClient(status);
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), baseUrl);

    await expect(
      Effect.runPromise(client.pushMessage("U123", [{ type: "text", text: "hello" }])),
    ).resolves.toBeUndefined();
  });

  test("preserves LINE response details for a non-success status", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response('{"message":"invalid request"}', {
            status: 409,
            headers: {
              "x-line-request-id": "request-123",
              "x-line-accepted-request-id": "accepted-456",
            },
          }),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), baseUrl);

    await expect(
      failure(client.replyMessage("reply-token", [{ type: "text", text: "hello" }])),
    ).resolves.toMatchObject({
      _tag: "LineApiResponseError",
      operation: "replyMessage",
      status: 409,
      body: '{"message":"invalid request"}',
      requestId: "request-123",
      acceptedRequestId: "accepted-456",
    });
  });

  test("maps HTTP failures to a sanitized transport error", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.fail(
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({
            request,
            cause: new Error("network failed for access-token"),
          }),
        }),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), baseUrl);

    const error = await failure(client.pushMessage("U123", [{ type: "text", text: "hello" }]));

    expect(error).toMatchObject({
      _tag: "LineApiTransportError",
      operation: "pushMessage",
    });
    expect(JSON.stringify(error)).not.toContain("access-token");
    expect(String(error)).not.toContain("access-token");
  });

  test("redacts the access token if a response body echoes it", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response('{"message":"invalid access-token"}', { status: 401 }),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), baseUrl);

    const error = await failure(client.pushMessage("U123", [{ type: "text", text: "hello" }]));

    expect(error).toMatchObject({
      _tag: "LineApiResponseError",
      body: '{"message":"invalid [REDACTED]"}',
    });
    expect(JSON.stringify(error)).not.toContain("access-token");
  });

  test("distinguishes request encoding failures before HTTP execution", async () => {
    let executed = false;
    const httpClient = HttpClient.make((request) => {
      executed = true;
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, new Response(null, { status: 200 })),
      );
    });
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), baseUrl);
    const invalidMessages = [{ type: "text", text: 42 }] as unknown as LineMessageTuple;

    await expect(failure(client.pushMessage("U123", invalidMessages))).resolves.toMatchObject({
      _tag: "LineRequestEncodingError",
      operation: "pushMessage",
    });
    expect(executed).toBe(false);
  });
});
