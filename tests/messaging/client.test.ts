import { describe, expect, test } from "vite-plus/test";
import { Cause, Effect, Fiber, Option, Redacted, Schema } from "effect";
import { TestClock } from "effect/testing";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import {
  LineEmoji,
  LineEmojiSubstitutionObject,
  LineMessages,
  LineMentionSubstitutionObject,
  LineOutboundMessage,
  LineQuickReply,
  LineQuickReplyItem,
  LineSender,
  LineSubstitutionObject,
  LineTextMessage,
  LineTextMessageV2,
  makeLineApiClient,
  type LineMessageTuple,
} from "../../src/messaging/client.ts";

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

  test("fetches authenticated bot info and strips unknown official fields", async () => {
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
              premiumId: "P-premium",
              chatMode: "chat",
              markAsReadMode: "auto",
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
    expect(info).not.toHaveProperty("premiumId");
    expect(info).not.toHaveProperty("chatMode");
    expect(info).not.toHaveProperty("markAsReadMode");
  });

  test("strips extra fields beyond the official 7-field shape", async () => {
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
              premiumId: "P-premium",
              chatMode: "chat",
              markAsReadMode: "auto",
              someFutureField: "should-be-stripped",
              anotherExtra: 42,
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
    expect(info).not.toHaveProperty("someFutureField");
    expect(info).not.toHaveProperty("anotherExtra");
  });

  test("handles missing optional pictureUrl gracefully", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              userId: "U-bot-id",
              basicId: "@basic-id",
              displayName: "My Bot",
              premiumId: "P-premium",
              chatMode: "chat",
              markAsReadMode: "auto",
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
    });
    expect(info.pictureUrl).toBeUndefined();
  });

  test("rejects response with missing required userId field", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              basicId: "@basic-id",
              displayName: "My Bot",
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const error = await failure(client.getBotInfo);
    expect(error).toMatchObject({
      _tag: "LineRequestEncodingError",
      operation: "getBotInfo",
    });
  });

  test("rejects response with null pictureUrl (not a valid string)", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              userId: "U-bot-id",
              basicId: "@basic-id",
              displayName: "My Bot",
              pictureUrl: null,
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const error = await failure(client.getBotInfo);
    expect(error).toMatchObject({
      _tag: "LineRequestEncodingError",
      operation: "getBotInfo",
    });
  });

  test("accepts empty string displayName", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              userId: "U-bot-id",
              basicId: "@basic-id",
              displayName: "",
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const info = await Effect.runPromise(client.getBotInfo);
    expect(info.displayName).toBe("");
  });

  test("accepts response with only required fields and no extras", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              userId: "U-bot-id",
              basicId: "@basic-id",
              displayName: "My Bot",
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
    });
    expect(info).not.toHaveProperty("premiumId");
    expect(info).not.toHaveProperty("chatMode");
    expect(info).not.toHaveProperty("markAsReadMode");
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
        filter: { demographic: { type: "gender", oneOf: ["male"] } },
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
      filter: { demographic: { type: "gender", oneOf: ["male"] } },
    });
  });
});

describe("LINE Messaging API nested schemas", () => {
  test("LineEmoji decodes a valid emoji object", () => {
    const result = Schema.decodeUnknownSync(LineEmoji)({
      index: 0,
      productId: "5ac1bfd5040ab15980c9b435",
      emojiId: "001",
    });
    expect(result).toEqual({
      index: 0,
      productId: "5ac1bfd5040ab15980c9b435",
      emojiId: "001",
    });
  });

  test("LineQuickReplyItem decodes a valid quick reply action", () => {
    const result = Schema.decodeUnknownSync(LineQuickReplyItem)({
      type: "action",
      action: { type: "message", label: "Yes", text: "Yes" },
    });
    expect(result).toEqual({
      type: "action",
      action: { type: "message", label: "Yes", text: "Yes" },
    });
  });

  test("LineQuickReply decodes a container with items", () => {
    const result = Schema.decodeUnknownSync(LineQuickReply)({
      items: [{ type: "action", action: { type: "message", label: "Yes", text: "Yes" } }],
    });
    expect(result).toEqual({
      items: [{ type: "action", action: { type: "message", label: "Yes", text: "Yes" } }],
    });
  });

  test("LineSender decodes a sender with both optional fields", () => {
    const result = Schema.decodeUnknownSync(LineSender)({
      name: "Test Bot",
      iconUrl: "https://example.com/icon.png",
    });
    expect(result).toEqual({
      name: "Test Bot",
      iconUrl: "https://example.com/icon.png",
    });
  });

  test("LineSender decodes a sender with no optional fields", () => {
    const result = Schema.decodeUnknownSync(LineSender)({});
    expect(result).toEqual({});
  });

  test("LineEmojiSubstitutionObject decodes a valid emoji substitution", () => {
    const result = Schema.decodeUnknownSync(LineEmojiSubstitutionObject)({
      type: "emoji",
      productId: "5ac1bfd5040ab15980c9b435",
      emojiId: "001",
    });
    expect(result).toEqual({
      type: "emoji",
      productId: "5ac1bfd5040ab15980c9b435",
      emojiId: "001",
    });
  });

  test("LineMentionSubstitutionObject decodes a valid mention substitution", () => {
    const result = Schema.decodeUnknownSync(LineMentionSubstitutionObject)({
      type: "mention",
      mentionee: { type: "user", userId: "U123456789" },
    });
    expect(result).toEqual({
      type: "mention",
      mentionee: { type: "user", userId: "U123456789" },
    });
  });

  test("LineMentionSubstitutionObject decodes a valid mention all substitution", () => {
    const result = Schema.decodeUnknownSync(LineMentionSubstitutionObject)({
      type: "mention",
      mentionee: { type: "all" },
    });
    expect(result).toEqual({
      type: "mention",
      mentionee: { type: "all" },
    });
  });

  test("LineSubstitutionObject discriminates emoji variant", () => {
    const result = Schema.decodeUnknownSync(LineSubstitutionObject)({
      type: "emoji",
      productId: "5ac1bfd5040ab15980c9b435",
      emojiId: "001",
    });
    expect(result).toEqual({
      type: "emoji",
      productId: "5ac1bfd5040ab15980c9b435",
      emojiId: "001",
    });
  });

  test("LineSubstitutionObject discriminates mention variant", () => {
    const result = Schema.decodeUnknownSync(LineSubstitutionObject)({
      type: "mention",
      mentionee: { type: "user", userId: "U123456789" },
    });
    expect(result).toEqual({
      type: "mention",
      mentionee: { type: "user", userId: "U123456789" },
    });
  });
});

describe("LINE Messaging API client — LineOutboundMessage wiring", () => {
  test("encodes a textV2 message with substitution through pushMessage", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [
        {
          type: "textV2",
          text: "Hello {smile}!",
          substitution: {
            smile: { type: "emoji", productId: "p1", emojiId: "001" },
          },
        },
      ]),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({
      type: "textV2",
      text: "Hello {smile}!",
      substitution: {
        smile: { type: "emoji", productId: "p1", emojiId: "001" },
      },
    });
  });

  test("encodes a mixed tuple of classic text and textV2 through pushMessage", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [
        { type: "text", text: "classic" },
        {
          type: "textV2",
          text: "v2",
          substitution: {
            you: {
              type: "mention",
              mentionee: { type: "user", userId: "U1" },
            },
          },
        },
      ]),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ type: "text", text: "classic" });
    expect(body.messages[1]).toMatchObject({
      type: "textV2",
      text: "v2",
      substitution: {
        you: {
          type: "mention",
          mentionee: { type: "user", userId: "U1" },
        },
      },
    });
  });

  test("encodes a textV2 message through replyMessage", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.replyMessage("reply-token", [{ type: "textV2", text: "reply v2" }]),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.replyToken).toBe("reply-token");
    expect(body.messages[0]).toMatchObject({ type: "textV2", text: "reply v2" });
  });

  test("encodes a textV2 message through multicastMessage", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.multicastMessage(["U1", "U2"], [{ type: "textV2", text: "multicast v2" }]),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.to).toEqual(["U1", "U2"]);
    expect(body.messages[0]).toMatchObject({ type: "textV2", text: "multicast v2" });
  });

  test("encodes a textV2 message through narrowcastMessage", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(client.narrowcastMessage([{ type: "textV2", text: "narrowcast v2" }]));

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.messages[0]).toMatchObject({ type: "textV2", text: "narrowcast v2" });
  });

  test("preserves optional classic text fields through pushMessage encoding", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [
        {
          type: "text",
          text: "hello",
          emojis: [{ index: 0, productId: "p1", emojiId: "001" }],
          quoteToken: "qt-1",
          quickReply: {
            items: [{ type: "action", action: { type: "message", label: "Yes", text: "Yes" } }],
          },
          sender: { name: "Bot", iconUrl: "https://example.com/icon.png" },
        },
      ]),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.messages[0]).toMatchObject({
      type: "text",
      text: "hello",
      emojis: [{ index: 0, productId: "p1", emojiId: "001" }],
      quoteToken: "qt-1",
      sender: { name: "Bot", iconUrl: "https://example.com/icon.png" },
    });
    expect(body.messages[0].quickReply).toEqual({
      items: [{ type: "action", action: { type: "message", label: "Yes", text: "Yes" } }],
    });
  });
});

describe("LINE Messaging API — validation", () => {
  test("LineMessages rejects an empty array", () => {
    expect(() => Schema.decodeUnknownSync(LineMessages)([])).toThrow();
  });

  test("LineMessages rejects more than 5 messages", () => {
    const baseMessage = { type: "text" as const, text: "msg" };
    const messages = [baseMessage, baseMessage, baseMessage, baseMessage, baseMessage, baseMessage];
    expect(() => Schema.decodeUnknownSync(LineMessages)(messages)).toThrow();
  });

  test("TextV2 substitution field is validated by Schema", () => {
    expect(() =>
      Schema.decodeUnknownSync(LineTextMessageV2)({
        type: "textV2",
        text: "hello",
        substitution: {
          key: { type: "invalid", foo: "bar" },
        },
      }),
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(LineTextMessageV2)({
        type: "textV2",
        text: "hello",
        substitution: {
          key: { productId: "p1", emojiId: "001" },
        },
      }),
    ).toThrow();

    const valid = Schema.decodeUnknownSync(LineTextMessageV2)({
      type: "textV2",
      text: "hello",
      substitution: {
        key: { type: "emoji", productId: "p1", emojiId: "001" },
      },
    });
    expect(valid).toMatchObject({
      type: "textV2",
      text: "hello",
      substitution: {
        key: { type: "emoji", productId: "p1", emojiId: "001" },
      },
    });
  });
});

describe("LINE Messaging API — adversarial edge cases", () => {
  test("LineTextMessage accepts empty emojis array", () => {
    const result = Schema.decodeUnknownSync(LineTextMessage)({
      type: "text",
      text: "hello",
      emojis: [],
    });
    expect(result.emojis).toEqual([]);
  });

  test("LineTextMessageV2 encodes with no optional fields (minimal case)", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(client.pushMessage("U123", [{ type: "textV2", text: "bare minimum" }]));

    const body = await requestJson(requests[0]!);
    expect(body.messages[0]).toEqual({ type: "textV2", text: "bare minimum" });
  });

  test("LineTextMessageV2 encodes with all optional fields (maximum case)", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [
        {
          type: "textV2",
          text: "full featured",
          substitution: {
            smile: { type: "emoji", productId: "p1", emojiId: "001" },
          },
          quoteToken: "qt-full",
          quickReply: {
            items: [{ type: "action", action: { type: "message", label: "OK", text: "OK" } }],
          },
          sender: { name: "Bot", iconUrl: "https://example.com/icon.png" },
        },
      ]),
    );

    const body = await requestJson(requests[0]!);
    expect(body.messages[0]).toMatchObject({
      type: "textV2",
      text: "full featured",
      substitution: {
        smile: { type: "emoji", productId: "p1", emojiId: "001" },
      },
      quoteToken: "qt-full",
      sender: { name: "Bot", iconUrl: "https://example.com/icon.png" },
    });
    expect(body.messages[0].quickReply).toEqual({
      items: [{ type: "action", action: { type: "message", label: "OK", text: "OK" } }],
    });
  });

  test("preserves unicode and special characters in text field", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const specialText = "Hello 👋 world! こんにちは 🌍 \\n\\t\\r <\"&'>";
    await Effect.runPromise(client.pushMessage("U123", [{ type: "text", text: specialText }]));

    const body = await requestJson(requests[0]!);
    expect(body.messages[0].text).toBe(specialText);
  });

  test("encodes a 5-message mixed tuple through pushMessage (max boundary)", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [
        { type: "text", text: "msg1" },
        { type: "textV2", text: "msg2" },
        { type: "text", text: "msg3" },
        { type: "textV2", text: "msg4" },
        { type: "text", text: "msg5" },
      ]),
    );

    const body = await requestJson(requests[0]!);
    expect(body.messages).toHaveLength(5);
    expect(body.messages[0].type).toBe("text");
    expect(body.messages[1].type).toBe("textV2");
    expect(body.messages[4].type).toBe("text");
  });

  test("LineMessages accepts exactly 1 message", () => {
    const result = Schema.decodeUnknownSync(LineMessages)([{ type: "text", text: "solo" }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "text", text: "solo" });
  });

  test("LineMessages accepts exactly 5 messages", () => {
    const messages = [
      { type: "text" as const, text: "1" },
      { type: "text" as const, text: "2" },
      { type: "text" as const, text: "3" },
      { type: "text" as const, text: "4" },
      { type: "text" as const, text: "5" },
    ];
    const result = Schema.decodeUnknownSync(LineMessages)(messages);
    expect(result).toHaveLength(5);
  });

  test("LineTextMessageV2 rejects missing required text field", () => {
    expect(() => Schema.decodeUnknownSync(LineTextMessageV2)({ type: "textV2" })).toThrow();
  });

  test("LineTextMessageV2 rejects wrong type literal", () => {
    expect(() =>
      Schema.decodeUnknownSync(LineTextMessageV2)({ type: "text", text: "hello" }),
    ).toThrow();
  });

  test("LineOutboundMessage rejects unknown message type", () => {
    expect(() =>
      Schema.decodeUnknownSync(LineOutboundMessage)({
        type: "unsupported_type_xyz",
        originalContentUrl: "https://example.com/img.jpg",
        previewImageUrl: "https://example.com/preview.jpg",
      }),
    ).toThrow();
  });

  test("LineSubstitutionObject rejects unknown discriminator type", () => {
    expect(() =>
      Schema.decodeUnknownSync(LineSubstitutionObject)({
        type: "sticker",
        packageId: "1",
        stickerId: "1",
      }),
    ).toThrow();
  });

  test("LineEmoji rejects missing required fields", () => {
    expect(() => Schema.decodeUnknownSync(LineEmoji)({ index: 0 })).toThrow();
  });

  test("LineEmoji rejects index with wrong type (string instead of number)", () => {
    expect(() =>
      Schema.decodeUnknownSync(LineEmoji)({
        index: "0",
        productId: "p1",
        emojiId: "001",
      }),
    ).toThrow();
  });

  test("LineQuickReply with empty items array is accepted by schema", () => {
    const result = Schema.decodeUnknownSync(LineQuickReply)({ items: [] });
    expect(result).toEqual({ items: [] });
  });
});

describe("LINE Messaging API — customAggregationUnits", () => {
  test("Push with customAggregationUnits → body includes customAggregationUnits field", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: ["unit-a", "unit-b"],
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual(["unit-a", "unit-b"]);
  });

  test("Multicast with customAggregationUnits → body includes customAggregationUnits field", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.multicastMessage(["U1", "U2"], [{ type: "text", text: "hello" }], {
        customAggregationUnits: ["unit-x"],
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual(["unit-x"]);
  });

  test("Push without customAggregationUnits → body does NOT include customAggregationUnits field", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(client.pushMessage("U123", [{ type: "text", text: "hello" }]));

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toBeUndefined();
  });

  test("Multicast without customAggregationUnits → body does NOT include customAggregationUnits field", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.multicastMessage(["U1", "U2"], [{ type: "text", text: "hello" }]),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toBeUndefined();
  });

  test("retryKey still header (X-Line-Retry-Key), not body, when customAggregationUnits present", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        retryKey: "retry-42",
        customAggregationUnits: ["unit-1"],
      }),
    );

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.headers["x-line-retry-key"]).toBe("retry-42");
    const body = await requestJson(request);
    expect(body.customAggregationUnits).toEqual(["unit-1"]);
    expect(body.retryKey).toBeUndefined();
  });

  test("Push with empty customAggregationUnits array → body includes empty array", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: [],
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual([]);
  });

  test("Push with single-unit customAggregationUnits → body includes single-element array", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: ["unit1"],
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual(["unit1"]);
  });

  test("Push with 5 customAggregationUnits → body includes all 5", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const units = ["u1", "u2", "u3", "u4", "u5"];
    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: units,
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual(units);
    expect(body.customAggregationUnits).toHaveLength(5);
  });

  test("Push with special characters in customAggregationUnits → all pass through", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const units = ["<>&\"'", "unit with spaces", "emoji: 👋", "日本語", "new\nline\ttab"];
    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: units,
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual(units);
  });

  test("Push with duplicate customAggregationUnits → duplicates preserved", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    const units = ["same", "same"];
    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: units,
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual(["same", "same"]);
  });

  test("Push with empty string as customAggregationUnit → passes through", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: [""],
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual([""]);
  });

  test("Multicast with empty customAggregationUnits array → body includes empty array", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.multicastMessage(["U1"], [{ type: "text", text: "hello" }], {
        customAggregationUnits: [],
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toEqual([]);
  });

  test("Multicast retryKey still header, not body, when customAggregationUnits present", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.multicastMessage(["U1", "U2"], [{ type: "text", text: "hello" }], {
        retryKey: "retry-multi-99",
        customAggregationUnits: ["unit-z"],
      }),
    );

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.headers["x-line-retry-key"]).toBe("retry-multi-99");
    const body = await requestJson(request);
    expect(body.customAggregationUnits).toEqual(["unit-z"]);
    expect(body.retryKey).toBeUndefined();
  });

  test("Reply message encodes correctly (no customAggregationUnits path)", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(client.replyMessage("reply-token", [{ type: "text", text: "reply" }]));

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.replyToken).toBe("reply-token");
    expect(body.messages).toHaveLength(1);
    expect(body.customAggregationUnits).toBeUndefined();
  });

  test("Narrowcast message encodes correctly (no customAggregationUnits path)", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(client.narrowcastMessage([{ type: "text", text: "narrowcast" }]));

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.messages).toHaveLength(1);
    expect(body.customAggregationUnits).toBeUndefined();
  });

  test("Push with customAggregationUnits=undefined → does NOT include field (not empty array)", async () => {
    const { client: httpClient, requests } = makeCapturingClient();
    const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

    await Effect.runPromise(
      client.pushMessage("U123", [{ type: "text", text: "hello" }], {
        customAggregationUnits: undefined,
      }),
    );

    expect(requests).toHaveLength(1);
    const body = await requestJson(requests[0]!);
    expect(body.customAggregationUnits).toBeUndefined();
  });

  describe("LINE Messaging API — Additional Message Types", () => {
    test("sends an image message with required fields", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "image",
            originalContentUrl: "https://example.com/image.jpg",
            previewImageUrl: "https://example.com/preview.jpg",
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "image",
            originalContentUrl: "https://example.com/image.jpg",
            previewImageUrl: "https://example.com/preview.jpg",
          },
        ],
      });
    });

    test("sends a flex message with altText and contents", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "flex",
            altText: "Flex message",
            contents: {
              type: "bubble",
              body: { type: "box", layout: "vertical", contents: [] },
            },
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "flex",
            altText: "Flex message",
            contents: expect.objectContaining({ type: "bubble" }),
          },
        ],
      });
    });

    test("sends a sticker message with packageId and stickerId", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "sticker",
            packageId: "6325",
            stickerId: "10979904",
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "sticker",
            packageId: "6325",
            stickerId: "10979904",
          },
        ],
      });
    });

    test("sends a video message with required fields", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "video",
            originalContentUrl: "https://example.com/video.mp4",
            previewImageUrl: "https://example.com/preview.jpg",
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "video",
            originalContentUrl: "https://example.com/video.mp4",
            previewImageUrl: "https://example.com/preview.jpg",
          },
        ],
      });
    });

    test("sends an audio message with required fields", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "audio",
            originalContentUrl: "https://example.com/audio.mp3",
            duration: 5000,
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "audio",
            originalContentUrl: "https://example.com/audio.mp3",
            duration: 5000,
          },
        ],
      });
    });

    test("sends a location message with coordinates", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "location",
            title: "Tokyo",
            address: "Shibuya",
            latitude: 35.659,
            longitude: 139.701,
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "location",
            title: "Tokyo",
            address: "Shibuya",
            latitude: 35.659,
            longitude: 139.701,
          },
        ],
      });
    });

    test("sends an imagemap message with baseSize and actions", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "imagemap",
            baseUrl: "https://example.com/map",
            altText: "Map",
            baseSize: { width: 1040, height: 1040 },
            actions: [{ type: "uri", linkUri: "https://example.com" }],
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "imagemap",
            baseUrl: "https://example.com/map",
            altText: "Map",
            baseSize: { width: 1040, height: 1040 },
            actions: [{ type: "uri", linkUri: "https://example.com" }],
          },
        ],
      });
    });

    test("sends a template message with template object", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "template",
            altText: "Buttons template",
            template: {
              type: "buttons",
              text: "Choose an option",
              actions: [{ type: "postback", label: "Buy", data: "action=buy" }],
            },
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "template",
            altText: "Buttons template",
            template: expect.objectContaining({ type: "buttons" }),
          },
        ],
      });
    });

    test("sends a coupon message with optional deliveryTag", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          {
            type: "coupon",
            couponId: "COUPON_001",
            deliveryTag: "summer-sale",
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      await expect(requestJson(requests[0]!)).resolves.toMatchObject({
        to: "U123",
        messages: [
          {
            type: "coupon",
            couponId: "COUPON_001",
            deliveryTag: "summer-sale",
          },
        ],
      });
    });

    test("sends mixed message types in a single push request", async () => {
      const { client: httpClient, requests } = makeCapturingClient();
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });

      await Effect.runPromise(
        client.pushMessage("U123", [
          { type: "text", text: "Check this out" },
          {
            type: "image",
            originalContentUrl: "https://example.com/img.jpg",
            previewImageUrl: "https://example.com/preview.jpg",
          },
          {
            type: "sticker",
            packageId: "6325",
            stickerId: "10979904",
          },
        ]),
      );

      expect(requests).toHaveLength(1);
      const json = await requestJson(requests[0]!);
      expect(json.to).toBe("U123");
      expect(json.messages).toHaveLength(3);
      expect(json.messages[0].type).toBe("text");
      expect(json.messages[1].type).toBe("image");
      expect(json.messages[2].type).toBe("sticker");
    });

    test("rejects a malformed sticker message missing packageId before HTTP execution", async () => {
      let executed = false;
      const httpClient = HttpClient.make((request) => {
        executed = true;
        return Effect.succeed(
          HttpClientResponse.fromWeb(request, new Response(null, { status: 200 })),
        );
      });
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });
      const invalidMessages = [{ type: "sticker", stickerId: "2" }] as unknown as LineMessageTuple;

      await expect(failure(client.pushMessage("U123", invalidMessages))).resolves.toMatchObject({
        _tag: "LineRequestEncodingError",
        operation: "pushMessage",
      });
      expect(executed).toBe(false);
    });

    test("rejects a malformed audio message missing duration before HTTP execution", async () => {
      let executed = false;
      const httpClient = HttpClient.make((request) => {
        executed = true;
        return Effect.succeed(
          HttpClientResponse.fromWeb(request, new Response(null, { status: 200 })),
        );
      });
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });
      const invalidMessages = [
        { type: "audio", originalContentUrl: "https://example.com/audio.mp3" },
      ] as unknown as LineMessageTuple;

      await expect(failure(client.pushMessage("U123", invalidMessages))).resolves.toMatchObject({
        _tag: "LineRequestEncodingError",
        operation: "pushMessage",
      });
      expect(executed).toBe(false);
    });

    test("rejects a malformed location message missing latitude before HTTP execution", async () => {
      let executed = false;
      const httpClient = HttpClient.make((request) => {
        executed = true;
        return Effect.succeed(
          HttpClientResponse.fromWeb(request, new Response(null, { status: 200 })),
        );
      });
      const client = makeLineApiClient(httpClient, Redacted.make("access-token"), { baseUrl });
      const invalidMessages = [
        { type: "location", title: "Tokyo", address: "Shibuya", longitude: 139.701 },
      ] as unknown as LineMessageTuple;

      await expect(failure(client.pushMessage("U123", invalidMessages))).resolves.toMatchObject({
        _tag: "LineRequestEncodingError",
        operation: "pushMessage",
      });
      expect(executed).toBe(false);
    });
  });

  describe("LINE Messaging API — Additional Message Types Validation", () => {
    test("accepts a text message with quickReply containing imageUrl", () => {
      const messages = [
        {
          type: "text" as const,
          text: "hello",
          quickReply: {
            items: [
              {
                imageUrl: "https://example.com/icon.png",
                action: { type: "message", label: "Yes", text: "yes" },
              },
            ],
          },
        },
      ];

      const decoded = Schema.decodeUnknownSync(LineMessages)(messages);
      expect(decoded).toEqual(messages);
    });

    test("accepts a text message with sender", () => {
      const messages = [
        {
          type: "text" as const,
          text: "hello",
          sender: {
            name: "Bot",
            iconUrl: "https://example.com/bot.png",
          },
        },
      ];

      const decoded = Schema.decodeUnknownSync(LineMessages)(messages);
      expect(decoded).toEqual(messages);
    });

    test("accepts an image message in the message collection", () => {
      const messages = [
        {
          type: "image" as const,
          originalContentUrl: "https://example.com/image.jpg",
          previewImageUrl: "https://example.com/preview.jpg",
        },
      ];

      const decoded = Schema.decodeUnknownSync(LineMessages)(messages);
      expect(decoded).toEqual(messages);
    });

    test("accepts a sticker message in the message collection", () => {
      const messages = [
        {
          type: "sticker" as const,
          packageId: "1",
          stickerId: "1",
        },
      ];

      const decoded = Schema.decodeUnknownSync(LineMessages)(messages);
      expect(decoded).toEqual(messages);
    });

    test("rejects an unsupported message type", () => {
      expect(() =>
        Schema.decodeUnknownSync(LineMessages)([{ type: "unknown_type", data: "test" }]),
      ).toThrow();
    });

    test("rejects a malformed image message missing required fields", () => {
      expect(() =>
        Schema.decodeUnknownSync(LineMessages)([
          { type: "image", originalContentUrl: "https://example.com/image.jpg" },
        ]),
      ).toThrow();
    });

    test.each([
      {
        label: "video",
        payload: {
          type: "video" as const,
          originalContentUrl: "https://example.com/video.mp4",
          previewImageUrl: "https://example.com/thumb.jpg",
        },
      },
      {
        label: "audio",
        payload: {
          type: "audio" as const,
          originalContentUrl: "https://example.com/audio.mp3",
          duration: 5000,
        },
      },
      {
        label: "location",
        payload: {
          type: "location" as const,
          title: "Tokyo",
          address: "Shibuya",
          latitude: 35.659,
          longitude: 139.701,
        },
      },
      {
        label: "textV2",
        payload: { type: "textV2" as const, text: "Hello" },
      },
      {
        label: "textV2 with substitution",
        payload: {
          type: "textV2" as const,
          text: "Hello {name}",
          substitution: { name: { type: "emoji", productId: "123", emojiId: "456" } },
        },
      },
      {
        label: "imagemap",
        payload: {
          type: "imagemap" as const,
          baseUrl: "https://example.com/map",
          altText: "Map",
          baseSize: { width: 1040, height: 1040 },
          actions: [{ type: "uri", linkUri: "https://example.com" }],
        },
      },
      {
        label: "template",
        payload: {
          type: "template" as const,
          altText: "Buttons",
          template: { type: "buttons", text: "Choose", actions: [] },
        },
      },
      {
        label: "coupon",
        payload: { type: "coupon" as const, couponId: "COUPON_001" },
      },
    ])("accepts a $label message in the message collection", ({ payload }) => {
      const messages = [payload];
      const decoded = Schema.decodeUnknownSync(LineMessages)(messages);
      expect(decoded).toEqual(messages);
    });

    test("accepts a collection containing 3 different message types", () => {
      const messages = [
        { type: "text" as const, text: "hello" },
        {
          type: "sticker" as const,
          packageId: "1",
          stickerId: "2",
        },
        {
          type: "image" as const,
          originalContentUrl: "https://example.com/a.jpg",
          previewImageUrl: "https://example.com/b.jpg",
        },
      ];

      const decoded = Schema.decodeUnknownSync(LineMessages)(messages);
      expect(decoded).toEqual(messages);
      expect(decoded).toHaveLength(3);
      expect(decoded[0]!.type).toBe("text");
      expect(decoded[1]!.type).toBe("sticker");
      expect(decoded[2]!.type).toBe("image");
    });

    test("rejects a malformed sticker message missing packageId", () => {
      expect(() =>
        Schema.decodeUnknownSync(LineMessages)([{ type: "sticker", stickerId: "2" }]),
      ).toThrow();
    });

    test("rejects a malformed audio message missing duration", () => {
      expect(() =>
        Schema.decodeUnknownSync(LineMessages)([
          { type: "audio", originalContentUrl: "https://example.com/audio.mp3" },
        ]),
      ).toThrow();
    });

    test("rejects a malformed location message missing latitude", () => {
      expect(() =>
        Schema.decodeUnknownSync(LineMessages)([
          { type: "location", title: "Tokyo", address: "Shibuya", longitude: 139.701 },
        ]),
      ).toThrow();
    });

    test("rejects a malformed video message missing previewImageUrl", () => {
      expect(() =>
        Schema.decodeUnknownSync(LineMessages)([
          { type: "video", originalContentUrl: "https://example.com/video.mp4" },
        ]),
      ).toThrow();
    });

    test("rejects a malformed imagemap message missing baseSize", () => {
      expect(() =>
        Schema.decodeUnknownSync(LineMessages)([
          {
            type: "imagemap",
            baseUrl: "https://example.com/map",
            altText: "Map",
            actions: [],
          },
        ]),
      ).toThrow();
    });
  });
});
