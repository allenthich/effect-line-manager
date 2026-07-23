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
    additionalUrlParameters: "campaign=spring&source=poster",
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
    expect(tree).toContain("Endpoint URL");
    expect(tree).toContain("https://liff.line.me/login-1-AbCdEf");
  });

  test("renders channel expansion and console navigation as separate interactive controls", async () => {
    const element = await mount();
    element.shadowRoot?.querySelector<HTMLButtonElement>(".node-header")!.click();
    await settle(element);

    const channelToggle =
      element.shadowRoot?.querySelector<HTMLButtonElement>(".channel-header-toggle");
    const consoleLink = element.shadowRoot?.querySelector<HTMLAnchorElement>(
      ".channel-header-row .open-link",
    );

    expect(channelToggle?.tagName).toBe("BUTTON");
    expect(channelToggle?.querySelector("button, a")).toBeNull();
    expect(consoleLink?.href).toBe("https://developers.line.biz/console/channel/msg-1");

    channelToggle!.click();
    await settle(element);
    expect(element.expandedChannelIds).toContain("msg-1");
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
    // provider row carries the tree viewer toggle + provider type badge
    const tvRow = element.shadowRoot?.querySelector<HTMLButtonElement>(".tv-row");
    expect(tvRow).not.toBeNull();
    expect(tvRow?.querySelector(".tv-name")?.textContent).toBe("Acme");
    expect(tvRow?.parentElement?.querySelector(".tv-type.t-provider")?.textContent).toBe(
      "Provider",
    );
    // Expand the provider so channels appear as tree rows with type chips.
    tvRow!.click();
    await settle(element);
    await settle(element);
    const tree = element.shadowRoot?.textContent ?? "";
    expect(tree).toContain("Messaging API");
    expect(tree).toContain("LINE Login");
    // expand the messaging channel to reveal its field block with masked secret
    const channelRows =
      element.shadowRoot?.querySelectorAll<HTMLElement>(
        ".tree-branch .tv-row-wrap, .tv-children .tv-row-wrap",
      ) ?? [];
    const msgRow = [...channelRows]
      .find((row) => row.textContent?.includes("Messaging API"))
      ?.querySelector<HTMLButtonElement>(".tv-row");
    expect(msgRow).toBeDefined();
    msgRow!.click();
    await settle(element);
    await settle(element);
    const expandedTree = element.shadowRoot?.textContent ?? "";
    expect(expandedTree).toContain("••••••••");
  });

  test("tree variant exposes the compact IDE surface and expands the complete hierarchy", async () => {
    const element = await mount();
    element.variant = "tree";
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".tv-surface")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".tv-toolbar")).not.toBeNull();

    const expandAll = element.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-action="expand-all"]',
    );
    expect(expandAll).not.toBeNull();
    expandAll!.click();
    await settle(element);
    await settle(element);
    await settle(element);

    const tree = element.shadowRoot?.textContent ?? "";
    expect(tree).toContain("Support Bot");
    expect(tree).toContain("Auth");
    expect(tree).toContain("Loyalty card");
    expect(element.shadowRoot?.querySelector(".tv-field-card")).not.toBeNull();
  });

  test("tree rows place copy controls beside IDs without appending provider region", async () => {
    const element = await mount();
    element.variant = "tree";
    await element.updateComplete;

    const expandAll = element.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-action="expand-all"]',
    );
    expandAll!.click();
    await settle(element);
    await settle(element);
    await settle(element);

    const providerRow = element.shadowRoot?.querySelector<HTMLElement>(".tv-row-wrap.r-provider");
    const providerId = providerRow?.querySelector<HTMLElement>(".tv-id");
    expect(providerId?.textContent?.trim()).toBe("(id: prov-1)");
    expect(providerId?.nextElementSibling?.classList.contains("icon-copy-btn")).toBe(true);
    expect(providerRow?.querySelector(".tv-actions .icon-copy-btn")).toBeNull();

    const channelRow = element.shadowRoot?.querySelector<HTMLElement>(".tv-row-wrap.r-messaging");
    const channelId = channelRow?.querySelector<HTMLElement>(".tv-id");
    expect(channelId?.nextElementSibling?.classList.contains("icon-copy-btn")).toBe(true);
    expect(channelRow?.querySelector(".tv-actions .icon-copy-btn")).toBeNull();

    const liffRow = element.shadowRoot?.querySelector<HTMLElement>(".tv-row-wrap.r-liff");
    const liffId = liffRow?.querySelector<HTMLElement>(".tv-id");
    expect(liffId?.nextElementSibling?.classList.contains("icon-copy-btn")).toBe(true);
    expect(liffRow?.querySelector(".tv-actions .icon-copy-btn")).toBeNull();
  });

  test("tree LIFF details show one complete generated URL and matching footer actions", async () => {
    const element = await mount();
    element.variant = "tree";
    await element.expandAll();
    await settle(element);

    const liffRow = element.shadowRoot?.querySelector<HTMLElement>(".tv-row-wrap.r-liff");
    const liffTreeItem = liffRow?.parentElement;
    const liffUrlField = [
      ...(liffTreeItem?.querySelectorAll<HTMLElement>(".tv-field-card") ?? []),
    ].find((field) => field.querySelector(".k")?.textContent?.trim() === "LIFF URL");
    const completeLiffUrl = "https://liff.line.me/login-1-AbCdEf?campaign=spring&source=poster";

    expect(liffUrlField?.querySelector(".v")?.textContent).toContain(completeLiffUrl);
    expect(liffTreeItem?.querySelector(".liff-url-link")).toBeNull();

    const footerActions =
      liffTreeItem?.querySelectorAll<HTMLElement>(".tv-detail-footer .tv-open-link") ?? [];
    expect(footerActions).toHaveLength(2);
    expect(footerActions[0]?.textContent?.trim()).toBe("Show QR code");
    expect(footerActions[1]?.textContent?.trim()).toBe("LIFF app ↗");
  });

  test("tree Edit buttons emit composed events with the selected entity", async () => {
    const element = await mount();
    element.variant = "tree";
    await element.expandAll();
    await settle(element);

    const providerEdit = element.shadowRoot?.querySelector<HTMLButtonElement>(
      ".r-provider .tv-actions .mini-btn",
    );
    const providerEvent = new Promise<CustomEvent>((resolve) => {
      element.addEventListener(
        "line-developers-console-edit",
        (event) => {
          resolve(event as CustomEvent);
        },
        { once: true },
      );
    });
    providerEdit!.click();

    await expect(providerEvent).resolves.toMatchObject({
      composed: true,
      detail: { kind: "provider", item: providers[0] },
    });
    expect(element.editingItem).toBeUndefined();

    const channelEdit = element.shadowRoot?.querySelector<HTMLButtonElement>(
      ".r-messaging .tv-actions .mini-btn",
    );
    const channelEvent = new Promise<CustomEvent>((resolve) => {
      element.addEventListener(
        "line-developers-console-edit",
        (event) => {
          resolve(event as CustomEvent);
        },
        { once: true },
      );
    });
    channelEdit!.click();

    await expect(channelEvent).resolves.toMatchObject({
      composed: true,
      detail: { kind: "channel", item: channels[0] },
    });
  });

  test("exposes expandAll for restoring the hierarchy after external updates", async () => {
    const element = await mount();
    element.variant = "tree";

    await element.expandAll();
    await settle(element);

    expect(element.shadowRoot?.textContent ?? "").toContain("Loyalty card");
    expect(element.expandedProviderIds).toEqual(new Set(["prov-1"]));
    expect(element.expandedChannelIds).toEqual(new Set(["msg-1", "login-1"]));
  });

  test("automatically populates data when adapter property is set after component is mounted", async () => {
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain(
      defaultLineDevelopersConsoleMessages.noAdapter,
    );

    element.adapter = adapter;
    await settle(element);
    await settle(element);

    expect(element.shadowRoot?.textContent).toContain("Acme");
    expect(element.shadowRoot?.textContent).toContain("1 provider");
  });

  test("renders the persisted LIFF launch URL in details", async () => {
    const element = await mount();
    // expand hierarchy
    element.shadowRoot?.querySelector<HTMLButtonElement>(".node-header")!.click();
    await settle(element);
    const channelHeaders =
      element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".node .node .node-header") ?? [];
    const loginHeader = [...channelHeaders].find((h) => h.textContent?.includes("LINE Login"));
    expect(loginHeader).toBeDefined();
    loginHeader!.click();
    await settle(element);

    // URL parameters input should NOT exist in details view
    const input = element.shadowRoot?.querySelector<HTMLInputElement>(
      "#liff-url-params-login-1-AbCdEf",
    );
    expect(input).toBeNull();

    const link = element.shadowRoot?.querySelector<HTMLAnchorElement>(".liff-url-link");
    expect(link?.href).toBe("https://liff.line.me/login-1-AbCdEf?campaign=spring&source=poster");
  });
});
