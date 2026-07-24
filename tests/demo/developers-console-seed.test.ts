import { describe, expect, test } from "vite-plus/test";
import { createLineAccountDemoData } from "../../demo/line-account-demo-data.ts";
import { createDemoConsoleEditor } from "../../demo/developers-console-seed.ts";

describe("developers console demo editor", () => {
  test("uses the canonical LINE account management demo content", async () => {
    const accountData = createLineAccountDemoData();
    const editor = createDemoConsoleEditor();

    expect(accountData.providers.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "demo-provider-1", name: "LINE Marketing" },
    ]);
    expect(await editor.adapter.listProviders()).toEqual([
      expect.objectContaining({ providerId: "demo-provider-1", name: "LINE Marketing" }),
    ]);
    expect(await editor.adapter.listChannels("demo-provider-1")).toEqual([
      expect.objectContaining({
        channelId: "2001043291",
        name: "Customer Support",
        botDisplayName: "LINE Support",
      }),
      expect.objectContaining({ channelId: "2001043310", name: "Customer Auth Portal" }),
    ]);
    expect(await editor.adapter.listLiffApps("2001043310")).toEqual([
      expect.objectContaining({
        liffId: "2001043291-AbCdEf12",
        description: "Loyalty card dashboard for customers.",
      }),
    ]);
  });

  test("applies provider edits to subsequent console reads", async () => {
    const editor = createDemoConsoleEditor();
    const [provider] = await editor.adapter.listProviders();
    const target = editor.resolveEdit({ kind: "provider", item: provider! });

    editor.update(target, {
      type: "provider",
      mode: "edit",
      input: { name: "LINE Growth" },
    });

    expect(await editor.adapter.listProviders()).toEqual([
      expect.objectContaining({ providerId: "demo-provider-1", name: "LINE Growth" }),
    ]);
  });

  test("applies messaging channel and Bot Profile edits", async () => {
    const editor = createDemoConsoleEditor();
    const [channel] = await editor.adapter.listChannels("demo-provider-1");
    const target = editor.resolveEdit({ kind: "channel", item: channel! });

    editor.update(target, {
      type: "messagingChannel",
      mode: "edit",
      input: {
        name: "Member Support",
        botDisplayName: "Member Concierge",
        botBasicId: "@member-support",
        botPictureUrl: "https://example.com/bot.png",
      },
    });

    const [updated] = await editor.adapter.listChannels("demo-provider-1");
    expect(updated).toEqual(
      expect.objectContaining({
        name: "Member Support",
        botDisplayName: "Member Concierge",
        botBasicId: "@member-support",
        botPictureUrl: "https://example.com/bot.png",
      }),
    );
  });

  test("applies login channel and LIFF edits", async () => {
    const editor = createDemoConsoleEditor();
    const channels = await editor.adapter.listChannels("demo-provider-1");
    const login = channels.find(({ type }) => type === "login")!;
    const loginTarget = editor.resolveEdit({ kind: "channel", item: login });

    editor.update(loginTarget, {
      type: "loginChannel",
      mode: "edit",
      input: { name: "Customer Sign In" },
    });

    const [liff] = await editor.adapter.listLiffApps(login.channelId);
    const liffTarget = editor.resolveEdit({ kind: "liff", item: liff! });
    editor.update(liffTarget, {
      type: "liff",
      mode: "edit",
      input: {
        view: { type: "full", url: "https://example.com/member-card" },
        description: "Member card dashboard",
      },
    });

    const updatedChannels = await editor.adapter.listChannels("demo-provider-1");
    expect(updatedChannels.find(({ type }) => type === "login")?.name).toBe("Customer Sign In");
    expect(await editor.adapter.listLiffApps(login.channelId)).toEqual([
      expect.objectContaining({
        view: { type: "full", url: "https://example.com/member-card" },
        description: "Member card dashboard",
      }),
    ]);
  });
});
