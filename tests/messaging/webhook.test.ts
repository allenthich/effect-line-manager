import { describe, expect, test } from "vite-plus/test";
import { Schema } from "effect";
import { LineMessages } from "../../src/messaging/client.ts";
import {
  LineEventSource,
  LineFollowEvent,
  LinePostbackEvent,
  LineTextMessageEvent,
  LineUserSource,
  LineGroupSource,
  LineRoomSource,
  LineWebhookRequestBody,
} from "../../src/messaging/webhook.ts";

describe("LINE messaging schemas", () => {
  test.each([1, 2, 3, 4, 5])("accepts %i text messages", (count) => {
    const messages = Array.from({ length: count }, (_, index) => ({
      type: "text" as const,
      text: `message-${index}`,
    }));

    expect(Schema.decodeUnknownSync(LineMessages)(messages)).toEqual(messages);
  });

  test("rejects empty and oversized message collections", () => {
    expect(() => Schema.decodeUnknownSync(LineMessages)([])).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(LineMessages)(
        Array.from({ length: 6 }, (_, index) => ({
          type: "text",
          text: `message-${index}`,
        })),
      ),
    ).toThrow();
  });
});

describe("LINE webhook schema", () => {
  // ── Acceptance Criterion 2: Schema tests (4 event types) ──

  test("decodes a valid text message event", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "message",
          replyToken: "nH7w3O5gndHnsR0HNYglTyTA",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
          message: {
            id: "12345678901234",
            type: "text",
            text: "Hello, world!",
          },
        },
      ],
    };

    const decoded = Schema.decodeUnknownSync(LineWebhookRequestBody)(payload);
    expect(decoded.destination).toBe(payload.destination);
    expect(decoded.events).toHaveLength(1);
    expect(decoded.events[0]?.type).toBe("message");
    const event = decoded.events[0] as typeof LineTextMessageEvent.Type;
    expect(event.message.text).toBe("Hello, world!");
    expect(event.replyToken).toBe("nH7w3O5gndHnsR0HNYglTyTA");
  });

  test("decodes a valid follow event", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "follow",
          replyToken: "nH7w3O5gndHnsR0HNYglTyTA",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
        },
      ],
    };

    const decoded = Schema.decodeUnknownSync(LineWebhookRequestBody)(payload);
    expect(decoded.destination).toBe(payload.destination);
    expect(decoded.events).toHaveLength(1);
    expect(decoded.events[0]?.type).toBe("follow");
    const event = decoded.events[0] as typeof LineFollowEvent.Type;
    expect(event.replyToken).toBe("nH7w3O5gndHnsR0HNYglTyTA");
  });

  test("decodes a valid unfollow event", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "unfollow",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
        },
      ],
    };

    const decoded = Schema.decodeUnknownSync(LineWebhookRequestBody)(payload);
    expect(decoded.destination).toBe(payload.destination);
    expect(decoded.events).toHaveLength(1);
    expect(decoded.events[0]?.type).toBe("unfollow");
  });

  test("decodes a valid postback event", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "postback",
          replyToken: "nH7w3O5gndHnsR0HNYglTyTA",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
          postback: {
            data: "action=buy&itemid=123",
            params: {
              datetime: "2017-12-25T00:00",
            },
          },
        },
      ],
    };

    const decoded = Schema.decodeUnknownSync(LineWebhookRequestBody)(payload);
    expect(decoded.destination).toBe(payload.destination);
    expect(decoded.events).toHaveLength(1);
    expect(decoded.events[0]?.type).toBe("postback");
    const event = decoded.events[0] as typeof LinePostbackEvent.Type;
    expect(event.postback.data).toBe("action=buy&itemid=123");
    expect(event.postback.params?.datetime).toBe("2017-12-25T00:00");
  });

  test("decodes a valid postback event without params", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "postback",
          replyToken: "nH7w3O5gndHnsR0HNYglTyTA",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
          postback: {
            data: "action=buy&itemid=123",
          },
        },
      ],
    };

    const decoded = Schema.decodeUnknownSync(LineWebhookRequestBody)(payload);
    expect(decoded.events[0]?.type).toBe("postback");
    const event = decoded.events[0] as typeof LinePostbackEvent.Type;
    expect(event.postback.params).toBeUndefined();
  });

  // ── Acceptance Criterion 3: Source coverage (3 source types) ──

  test("decodes User source with required userId", () => {
    const source = {
      type: "user",
      userId: "U4af4980629abcdef",
    };

    const decoded = Schema.decodeUnknownSync(LineUserSource)(source);
    expect(decoded.type).toBe("user");
    expect(decoded.userId).toBe("U4af4980629abcdef");
  });

  test("rejects User source missing required userId", () => {
    const source = {
      type: "user",
    };

    expect(() => Schema.decodeUnknownSync(LineUserSource)(source)).toThrow();
  });

  test("decodes Group source with optional userId present", () => {
    const source = {
      type: "group",
      groupId: "G4af4980629abcdef",
      userId: "U4af4980629abcdef",
    };

    const decoded = Schema.decodeUnknownSync(LineGroupSource)(source);
    expect(decoded.type).toBe("group");
    expect(decoded.groupId).toBe("G4af4980629abcdef");
    expect(decoded.userId).toBe("U4af4980629abcdef");
  });

  test("decodes Group source without optional userId", () => {
    const source = {
      type: "group",
      groupId: "G4af4980629abcdef",
    };

    const decoded = Schema.decodeUnknownSync(LineGroupSource)(source);
    expect(decoded.type).toBe("group");
    expect(decoded.groupId).toBe("G4af4980629abcdef");
    expect(decoded.userId).toBeUndefined();
  });

  test("decodes Room source with optional userId present", () => {
    const source = {
      type: "room",
      roomId: "R4af4980629abcdef",
      userId: "U4af4980629abcdef",
    };

    const decoded = Schema.decodeUnknownSync(LineRoomSource)(source);
    expect(decoded.type).toBe("room");
    expect(decoded.roomId).toBe("R4af4980629abcdef");
    expect(decoded.userId).toBe("U4af4980629abcdef");
  });

  test("decodes Room source without optional userId", () => {
    const source = {
      type: "room",
      roomId: "R4af4980629abcdef",
    };

    const decoded = Schema.decodeUnknownSync(LineRoomSource)(source);
    expect(decoded.type).toBe("room");
    expect(decoded.roomId).toBe("R4af4980629abcdef");
    expect(decoded.userId).toBeUndefined();
  });

  test("rejects unknown source type", () => {
    const source = {
      type: "unknown",
    };

    expect(() => Schema.decodeUnknownSync(LineEventSource)(source)).toThrow();
  });

  // ── Acceptance Criterion 4: Rejection tests ──

  test("rejects unsupported event type (e.g., unsend)", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "unsend",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
          unsend: {
            messageId: "12345678901234",
          },
        },
      ],
    };

    expect(() => Schema.decodeUnknownSync(LineWebhookRequestBody)(payload)).toThrow();
  });

  test("rejects unsupported message type (e.g., image)", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "message",
          replyToken: "nH7w3O5gndHnsR0HNYglTyTA",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
          message: {
            id: "12345678901234",
            type: "image",
            contentProvider: {
              type: "line",
            },
          },
        },
      ],
    };

    expect(() => Schema.decodeUnknownSync(LineWebhookRequestBody)(payload)).toThrow();
  });

  // ── Acceptance Criterion 5: No widening — verify existing field constraints ──

  test("rejects text message event missing required replyToken", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "message",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
          message: {
            id: "12345678901234",
            type: "text",
            text: "Hello",
          },
        },
      ],
    };

    expect(() => Schema.decodeUnknownSync(LineWebhookRequestBody)(payload)).toThrow();
  });

  test("rejects postback event missing required replyToken", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "postback",
          source: {
            type: "user",
            userId: "U4af4980629abcdef",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
          postback: {
            data: "action=buy",
          },
        },
      ],
    };

    expect(() => Schema.decodeUnknownSync(LineWebhookRequestBody)(payload)).toThrow();
  });

  test("rejects webhook payload with missing source", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "follow",
          replyToken: "nH7w3O5gndHnsR0HNYglTyTA",
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
        },
      ],
    };

    expect(() => Schema.decodeUnknownSync(LineWebhookRequestBody)(payload)).toThrow();
  });
});
