import { describe, expect, test } from "vite-plus/test";
import { Redacted, Schema } from "effect";
import { inspect } from "node:util";
import {
  LineProvider,
  MessagingChannel,
  LineProviderId,
  LineChannelRecordId,
  LineLiffRecordId,
} from "../../src/account/domain.ts";

describe("LINE account domain schemas", () => {
  test("constructs a provider", () => {
    const createdAt = new Date("2026-06-10T00:00:00.000Z");
    const provider = Schema.decodeUnknownSync(LineProvider)({
      id: "provider-1",
      name: "LINE Marketing",
      createdAt,
      updatedAt: createdAt,
    });

    expect(provider.name).toBe("LINE Marketing");
    expect(provider.createdAt).toBe(createdAt);
  });

  test("constructs a channel with redacted credentials", () => {
    const channelSecret = Redacted.make("channel-secret");
    const channelAccessToken = Redacted.make("access-token");
    const createdAt = new Date("2026-06-10T00:00:00.000Z");

    const channel = Schema.decodeUnknownSync(MessagingChannel)({
      id: "channel-record-1",
      providerId: "provider-1",
      channelType: "messaging",
      name: "Primary",
      channelId: "1234567890",
      channelSecret,
      channelAccessToken,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    });

    expect(channel.createdAt).toBe(createdAt);
    expect(Redacted.value(channel.channelSecret)).toBe("channel-secret");
    expect(Redacted.value(channel.channelAccessToken!)).toBe("access-token");
    expect(inspect(channel)).not.toContain("channel-secret");
    expect(inspect(inspect(channel))).not.toContain("access-token");
  });

  test("brands non-empty account identifiers at the domain boundary", () => {
    expect(Schema.decodeUnknownSync(LineProviderId)("provider-1")).toBe("provider-1");
    expect(Schema.decodeUnknownSync(LineChannelRecordId)("record-1")).toBe("record-1");
    expect(Schema.decodeUnknownSync(LineLiffRecordId)("liff-1")).toBe("liff-1");
    expect(() => Schema.decodeUnknownSync(LineChannelRecordId)("   ")).toThrow();
  });
});
