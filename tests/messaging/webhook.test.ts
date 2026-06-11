import { describe, expect, test } from "vite-plus/test";
import { Schema } from "effect";
import { LineMessages } from "../../src/messaging/client.ts";
import { LineWebhookRequestBody } from "../../src/messaging/webhook.ts";

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

  test("successfully decodes a valid follow event webhook payload", () => {
    const payload = {
      destination: "U1234567890abcdef1234567890abcdef",
      events: [
        {
          type: "follow",
          replyToken: "nH7w3O5gndHnsR0HNYglTyTA",
          source: {
            type: "user",
            userId: "U4af4980629...",
          },
          timestamp: 1462629479859,
          mode: "active",
          webhookEventId: "0123456789abcdef0123456789abcdef",
        },
      ],
    };

    const decoded = Schema.decodeUnknownSync(LineWebhookRequestBody)(payload);
    expect(decoded.destination).toBe(payload.destination);
    expect(decoded.events[0]?.type).toBe("follow");
  });
});
