import { describe, expect, test } from "vite-plus/test";
import { Schema } from "effect";

import { CreateChannelInput } from "../../src/channel/domain.ts";

describe("CreateChannelInput", () => {
  test("requires messaging credentials", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateChannelInput)({
        channelType: "messaging",
        providerId: "provider-1",
        name: "Primary Messaging",
        channelId: "channel-1",
        channelSecret: "secret-1",
      }),
    ).toThrow();
  });

  test("requires a channel secret for login channels", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateChannelInput)({
        channelType: "login",
        providerId: "provider-1",
        name: "Primary Login",
        channelId: "channel-1",
      }),
    ).toThrow();
  });

  test("accepts a login channel without an access token", () => {
    const decoded = Schema.decodeUnknownSync(CreateChannelInput)({
      channelType: "login",
      providerId: "provider-1",
      name: "Primary Login",
      channelId: "channel-1",
      channelSecret: "secret-1",
    });

    expect(decoded).toEqual({
      channelType: "login",
      providerId: "provider-1",
      name: "Primary Login",
      channelId: "channel-1",
      channelSecret: "secret-1",
    });
  });
});
