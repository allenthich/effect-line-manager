import { describe, expect, test } from "vite-plus/test";
import { Redacted, Schema } from "effect";
import { inspect } from "node:util";
import { CreateLineChannelInput, LineChannel, LineMessages } from "../../src/line/domain.ts";

describe("LINE domain schemas", () => {
  test("constructs a channel with redacted credentials and a valid date", () => {
    const channelSecret = Redacted.make("channel-secret");
    const channelAccessToken = Redacted.make("access-token");
    const createdAt = new Date("2026-06-10T00:00:00.000Z");

    const channel = Schema.decodeUnknownSync(LineChannel)({
      id: "channel-record-1",
      name: "Primary",
      channelId: "1234567890",
      channelSecret,
      channelAccessToken,
      createdAt,
    });

    expect(channel.createdAt).toBe(createdAt);
    expect(Redacted.value(channel.channelSecret)).toBe("channel-secret");
    expect(Redacted.value(channel.channelAccessToken)).toBe("access-token");
    expect(inspect(channel)).not.toContain("channel-secret");
    expect(inspect(channel)).not.toContain("access-token");
  });

  test("rejects an invalid creation date", () => {
    expect(() =>
      Schema.decodeUnknownSync(LineChannel)({
        id: "channel-record-1",
        name: "Primary",
        channelId: "1234567890",
        channelSecret: Redacted.make("channel-secret"),
        channelAccessToken: Redacted.make("access-token"),
        createdAt: new Date("invalid"),
      }),
    ).toThrow();
  });

  test("models mutable channel creation fields", () => {
    const input = Schema.decodeUnknownSync(CreateLineChannelInput)({
      name: "Primary",
      channelId: "1234567890",
      channelSecret: Redacted.make("channel-secret"),
      channelAccessToken: Redacted.make("access-token"),
    });

    expect(input.name).toBe("Primary");
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("createdAt");
  });

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
