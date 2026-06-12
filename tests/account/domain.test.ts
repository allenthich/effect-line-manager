import { describe, expect, test } from "vite-plus/test";
import { Redacted, Schema } from "effect";
import { inspect } from "node:util";
import {
  CreateLineAccountRecordInput,
  LineAccount,
  LineChannelId,
  LineChannelRecordId,
  LineLoginChannelId,
  LineLiffId,
} from "../../src/account/domain.ts";

describe("LINE account domain schemas", () => {
  test("constructs an account with redacted credentials and a valid date", () => {
    const channelSecret = Redacted.make("channel-secret");
    const channelAccessToken = Redacted.make("access-token");
    const loginChannelSecret = Redacted.make("login-secret");
    const createdAt = new Date("2026-06-10T00:00:00.000Z");

    const account = Schema.decodeUnknownSync(LineAccount)({
      id: "channel-record-1",
      name: "Primary",
      channelId: "1234567890",
      channelSecret,
      channelAccessToken,
      isActive: true,
      loginChannelId: "login-channel-123",
      loginChannelSecret,
      liffId: "liff-123",
      createdAt,
      updatedAt: createdAt,
    });

    expect(account.createdAt).toBe(createdAt);
    expect(Redacted.value(account.channelSecret)).toBe("channel-secret");
    expect(Redacted.value(account.channelAccessToken)).toBe("access-token");
    expect(account.loginChannelId).toBe("login-channel-123");
    expect(account.liffId).toBe("liff-123");
    expect(inspect(account)).not.toContain("channel-secret");
    expect(inspect(account)).not.toContain("access-token");
    expect(inspect(account)).not.toContain("login-secret");
  });

  test("rejects an invalid creation date", () => {
    expect(() =>
      Schema.decodeUnknownSync(LineAccount)({
        id: "channel-record-1",
        name: "Primary",
        channelId: "1234567890",
        channelSecret: Redacted.make("channel-secret"),
        channelAccessToken: Redacted.make("access-token"),
        isActive: true,
        loginChannelId: null,
        loginChannelSecret: null,
        liffId: null,
        createdAt: new Date("invalid"),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });

  test("models mutable account creation fields", () => {
    const input = Schema.decodeUnknownSync(CreateLineAccountRecordInput)({
      name: "Primary",
      channelId: "1234567890",
      channelSecret: Redacted.make("channel-secret"),
      channelAccessToken: Redacted.make("access-token"),
      loginChannelId: null,
      loginChannelSecret: null,
      liffId: null,
    });

    expect(input.name).toBe("Primary");
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("createdAt");
  });

  test("brands non-empty account identifiers at the domain boundary", () => {
    expect(Schema.decodeUnknownSync(LineChannelRecordId)("record-1")).toBe("record-1");
    expect(Schema.decodeUnknownSync(LineChannelId)("channel-1")).toBe("channel-1");
    expect(Schema.decodeUnknownSync(LineLoginChannelId)("login-1")).toBe("login-1");
    expect(Schema.decodeUnknownSync(LineLiffId)("liff-1")).toBe("liff-1");
    expect(() => Schema.decodeUnknownSync(LineChannelRecordId)("   ")).toThrow();
    expect(() => Schema.decodeUnknownSync(LineChannelId)("")).toThrow();
  });

  test("rejects blank names and credentials", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateLineAccountRecordInput)({
        name: "   ",
        channelId: "channel-1",
        channelSecret: Redacted.make("channel-secret"),
        channelAccessToken: Redacted.make("access-token"),
        loginChannelId: null,
        loginChannelSecret: null,
        liffId: null,
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(CreateLineAccountRecordInput)({
        name: "Primary",
        channelId: "channel-1",
        channelSecret: Redacted.make("   "),
        channelAccessToken: Redacted.make("access-token"),
        loginChannelId: null,
        loginChannelSecret: null,
        liffId: null,
      }),
    ).toThrow();
  });
});
