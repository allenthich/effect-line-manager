import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineDevelopersConsole,
  createInMemoryConsoleAdapter,
  defineLineDevelopersConsole,
  defaultLineDevelopersConsoleMessages,
  type ConsoleChannelView,
  type ConsoleLiffAppView,
  type ConsoleProviderView,
} from "../../src/web/developers-console/index.ts";

const providers: readonly ConsoleProviderView[] = [
  { providerId: "prov-1", name: "Acme", region: "jp", certified: false, createdAt: "2026-06-01" },
];

const channels: readonly ConsoleChannelView[] = [
  {
    providerId: "prov-1",
    channelId: "msg-1",
    type: "messaging",
    name: "Support Bot",
    status: "Active",
    channelSecret: "secret-value",
    channelAccessToken: "token-value",
    botBasicId: "@support",
  },
  {
    providerId: "prov-1",
    channelId: "login-1",
    type: "login",
    name: "Auth",
    status: "Published",
    channelSecret: "login-secret",
    callbackUrl: "https://example.com/cb",
  },
];

const liffApps: readonly ConsoleLiffAppView[] = [
  {
    channelId: "login-1",
    liffId: "login-1-AbCdEf",
    view: { type: "tall", url: "https://example.com/liff" },
    description: "Loyalty card",
  },
];

const adapter = createInMemoryConsoleAdapter({ providers, channels, liffApps });

beforeAll(() => {
  defineLineDevelopersConsole();
});

afterEach(() => {
  document.body.replaceChildren();
});

const mount = async (): Promise<LineDevelopersConsole> => {
  const element = document.createElement("line-developers-console") as LineDevelopersConsole;
  element.adapter = adapter;
  document.body.append(element);
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
  return element;
};

const settle = async (element: LineDevelopersConsole): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
};

describe("line-developers-console", () => {
  test("renders providers and counts in the toolbar", async () => {
    const element = await mount();
    await element.updateComplete;
    const text = element.shadowRoot?.textContent ?? "";
    expect(text).toContain("Acme");
    expect(text).toContain("1 provider");
  });

  test("expands a provider to reveal channels tagged with their type badge", async () => {
    const element = await mount();
    const providerButton = element.shadowRoot?.querySelector<HTMLButtonElement>(".node-header");
    expect(providerButton).not.toBeNull();
    providerButton!.click();
    await settle(element);
    const tree = element.shadowRoot?.textContent ?? "";
    expect(tree).toContain("Messaging API");
    expect(tree).toContain("LINE Login");
    expect(tree).toContain("Support Bot");
  });

  test("expands a login channel to reveal nested LIFF apps", async () => {
    const element = await mount();
    // open provider
    element.shadowRoot?.querySelector<HTMLButtonElement>(".node-header")!.click();
    await settle(element);
    // open the login channel (second channel header)
    const channelHeaders =
      element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".node .node .node-header") ?? [];
    const loginHeader = [...channelHeaders].find((h) => h.textContent?.includes("LINE Login"));
    expect(loginHeader).toBeDefined();
    loginHeader!.click();
    await settle(element);
    const tree = element.shadowRoot?.textContent ?? "";
    expect(tree).toContain("login-1-AbCdEf");
    expect(tree).toContain("TALL");
  });

  test("masks secrets by default and reveals on demand", async () => {
    const element = await mount();
    element.shadowRoot?.querySelector<HTMLButtonElement>(".node-header")!.click();
    await settle(element);
    // open messaging channel
    const channelHeaders =
      element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".node .node .node-header") ?? [];
    const msgHeader = [...channelHeaders].find((h) => h.textContent?.includes("Messaging API"));
    msgHeader!.click();
    await settle(element);
    const text = element.shadowRoot?.textContent ?? "";
    expect(text).toContain("••••••••");
    expect(text).not.toContain("secret-value");
    const reveal = element.shadowRoot?.querySelector<HTMLButtonElement>(".mini-btn");
    expect(reveal?.textContent?.trim()).toBe(defaultLineDevelopersConsoleMessages.reveal);
    reveal!.click();
    await element.updateComplete;
    expect(element.shadowRoot?.textContent ?? "").toContain("secret-value");
  });

  test("emits a composed error event when the adapter throws", async () => {
    const failingAdapter = {
      listProviders: async () => {
        throw new Error("boom");
      },
      listChannels: async (providerId: string) =>
        channels.filter((c) => c.providerId === providerId),
      getChannel: async (channelId: string) => channels.find((c) => c.channelId === channelId)!,
      listLiffApps: async (channelId: string) => liffApps.filter((l) => l.channelId === channelId),
    };
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.adapter = failingAdapter;
    document.body.append(element);
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;
    const event = await new Promise<CustomEvent>((resolve) => {
      element.addEventListener("line-developers-console-error", (e) => resolve(e as CustomEvent), {
        once: true,
      });
      void element.refresh();
    });
    expect(event.composed).toBe(true);
    expect((event.detail as { operation: string }).operation).toBe("listProviders");
  });

  test("renders an empty state when no adapter is supplied", async () => {
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain(
      defaultLineDevelopersConsoleMessages.noAdapter,
    );
  });

  test("variant='tree' renders the IDE tree viewer with guide-line connectors", async () => {
    const element = await mount();
    element.variant = "tree";
    await element.updateComplete;
    // provider row carries the tree viewer toggle + provider node avatar
    const tvRow = element.shadowRoot?.querySelector<HTMLButtonElement>(".tv-row");
    expect(tvRow).not.toBeNull();
    expect(tvRow?.querySelector(".tv-node.n-provider")).not.toBeNull();
    expect(tvRow?.querySelector(".tv-type.t-provider")?.textContent).toBe("Provider");
    // expand the provider — channels appear as tree rows with type chips
    tvRow!.click();
    await settle(element);
    await settle(element);
    const tree = element.shadowRoot?.textContent ?? "";
    expect(tree).toContain("Messaging API");
    expect(tree).toContain("LINE Login");
    // expand the messaging channel to reveal its field block with masked secret
    const channelRows =
      element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".tv-children .tv-row") ?? [];
    const msgRow = [...channelRows].find((r) => r.textContent?.includes("Messaging API"));
    expect(msgRow).toBeDefined();
    msgRow!.click();
    await settle(element);
    await settle(element);
    const expandedTree = element.shadowRoot?.textContent ?? "";
    expect(expandedTree).toContain("••••••••");
  });
});
