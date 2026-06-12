import { describe, expect, test } from "vite-plus/test";
import { Cause, Effect, Fiber, Option, Redacted } from "effect";
import { TestClock } from "effect/testing";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import { makeLineApiClient, type LineMessageTuple } from "../../src/messaging/client.ts";

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

describe("LINE Messaging API client", () => {
  test("sends an authenticated push message with caller options", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

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
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), {
      baseUrl: `${baseUrl}/`,
    });

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

  test("fetches authenticated bot info details", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              userId: "U-bot-id",
              basicId: "@basic-id",
              displayName: "My Bot",
              pictureUrl: "https://example.com/pic.png",
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const info = await Effect.runPromise(client.getBotInfo);
    expect(info).toEqual({
      userId: "U-bot-id",
      basicId: "@basic-id",
      displayName: "My Bot",
      pictureUrl: "https://example.com/pic.png",
    });
  });

  test.each([200, 201, 204, 299])("accepts status %i as success", async (status) => {
    const { client: httpClient } = makeCapturingClient(status);
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

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
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

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
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const error = await failure(client.pushMessage("U123", [{ type: "text", text: "hello" }]));

    expect(error).toMatchObject({
      _tag: "LineApiTransportError",
      operation: "pushMessage",
      cause: expect.objectContaining({ message: "TransportError" }),
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
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const error = await failure(client.pushMessage("U123", [{ type: "text", text: "hello" }]));

    expect(error).toMatchObject({
      _tag: "LineApiAuthenticationError",
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
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });
    const invalidMessages = [{ type: "text", text: 42 }] as unknown as LineMessageTuple;

    const error = await failure(client.pushMessage("U123", invalidMessages));

    expect(error).toMatchObject({
      _tag: "LineRequestEncodingError",
      operation: "pushMessage",
    });
    const cause = error.cause;
    expect(cause).toBeInstanceOf(Error);
    if (!(cause instanceof Error)) throw new Error("Expected sanitized cause to be an Error");
    expect(cause.message).not.toBe("UnknownHttpError");
    expect(executed).toBe(false);
  });

  test.each([401, 403])("distinguishes authentication status %i", async (status) => {
    const { client: httpClient } = makeCapturingClient(status);
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await expect(
      failure(client.pushMessage("U123", [{ type: "text", text: "hello" }])),
    ).resolves.toMatchObject({
      _tag: "LineApiAuthenticationError",
      operation: "pushMessage",
      status,
    });
  });

  test("distinguishes rate limiting and preserves retry metadata", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response('{"message":"slow down"}', {
            status: 429,
            headers: { "retry-after": "10" },
          }),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await expect(
      failure(client.pushMessage("U123", [{ type: "text", text: "hello" }])),
    ).resolves.toMatchObject({
      _tag: "LineApiRateLimitError",
      operation: "pushMessage",
      status: 429,
      retryAfter: "10",
    });
  });

  test("times out a provider request using the configured policy", async () => {
    const httpClient = HttpClient.make(() => Effect.never);
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), {
      baseUrl,
      requestTimeout: "1 second",
    });

    const error = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* client
          .pushMessage("U123", [{ type: "text", text: "hello" }])
          .pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        yield* TestClock.adjust("2 seconds");
        return yield* Fiber.join(fiber).pipe(Effect.flip);
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(error).toMatchObject({
      _tag: "LineApiTimeoutError",
      operation: "pushMessage",
    });
  });

  test("times out while reading a stalled provider error body", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(new ReadableStream({ start: () => undefined }), { status: 500 }),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), {
      baseUrl,
      requestTimeout: "1 second",
    });

    const polled = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* client
          .pushMessage("U123", [{ type: "text", text: "hello" }])
          .pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        yield* TestClock.adjust("2 seconds");
        yield* Effect.yieldNow;
        const exit = fiber.pollUnsafe();
        yield* Fiber.interrupt(fiber);
        return exit;
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(polled).toBeDefined();
    expect(polled?._tag).toBe("Failure");
    if (polled?._tag === "Failure") {
      const error = Cause.findErrorOption(polled.cause);
      expect(Option.isSome(error)).toBe(true);
      if (Option.isSome(error)) {
        expect(error.value).toMatchObject({
          _tag: "LineApiTimeoutError",
          operation: "pushMessage",
        });
      }
    }
  });

  test("sends an authenticated narrowcast message with options", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.narrowcastMessage([{ type: "text", text: "hello" }], {
        retryKey: "retry-1",
        notificationDisabled: true,
        limit: { max: 100, upToRemainingQuota: true, forbidPartialDelivery: false },
        recipient: { type: "operator" },
        filter: { demographic: { gender: "male" } },
      }),
    );

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${baseUrl}/v2/bot/message/narrowcast`);
    expect(request.headers.authorization).toBe("Bearer access-token");
    expect(request.headers["x-line-retry-key"]).toBe("retry-1");
    await expect(requestJson(request)).resolves.toEqual({
      messages: [{ type: "text", text: "hello" }],
      notificationDisabled: true,
      limit: { max: 100, upToRemainingQuota: true, forbidPartialDelivery: false },
      recipient: { type: "operator" },
      filter: { demographic: { gender: "male" } },
    });
  });
});
