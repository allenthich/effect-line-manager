import { describe, expect, test } from "vite-plus/test";
import { createLineConsoleAdapter } from "../../src/web/developers-console/index.ts";

const jsonResponse = (value: unknown): Response =>
  ({
    ok: true,
    json: async () => value,
  }) as Response;

const endpoints = {
  providers: "/line-console/providers",
  channelsByProvider: (providerId: string) => `/line-console/providers/${providerId}/channels`,
  channel: (channelId: string) => `/line-console/channels/${channelId}`,
  liffApps: (channelId: string) => `/line-console/channels/${channelId}/liff-apps`,
};

describe("createLineConsoleAdapter response validation", () => {
  test("rejects a malformed list envelope instead of treating it as empty", async () => {
    const adapter = createLineConsoleAdapter({
      endpoints,
      fetch: async () => jsonResponse({ providers: [] }),
    });

    await expect(adapter.listProviders()).rejects.toThrow(
      "Invalid LINE Developers Console provider list response",
    );
  });

  test("rejects provider records that omit required fields", async () => {
    const adapter = createLineConsoleAdapter({
      endpoints,
      fetch: async () => jsonResponse([{ providerId: "provider-1" }]),
    });

    await expect(adapter.listProviders()).rejects.toThrow(
      "Invalid LINE Developers Console provider response",
    );
  });

  test("uses browser-managed credentials without accepting a Cookie header option", async () => {
    let requestInit: RequestInit | undefined;
    const adapter = createLineConsoleAdapter({
      endpoints,
      fetch: async (_input, init) => {
        requestInit = init;
        return jsonResponse([]);
      },
    });

    await adapter.listProviders();

    expect(requestInit?.credentials).toBe("include");
    expect(new Headers(requestInit?.headers).has("Cookie")).toBe(false);
  });
});
