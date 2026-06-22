import { Schema } from "effect";
import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountHierarchy,
  LineAccountManagement,
  defineLineAccountManagementElements,
  type ProviderView,
  type LiffAppView,
  type LineProviderManagementAdapter,
} from "../../src/web/index.ts";
import { LineLoginChannelId } from "../../src/shared/domain.ts";
import type {
  LineMessagingChannelView,
  LineLoginChannelView,
} from "../../src/channels/management-domain.ts";

const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("0987654321");

const mockProvider: ProviderView = {
  id: "provider-1",
  name: "LINE Marketing",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockMessagingChannel: LineMessagingChannelView = {
  id: "channel-1",
  providerId: "provider-1",
  channelType: "messaging",
  name: "Support Channel",
  botDisplayName: "LINE Support",
  channelId: "1234567890",
  botUserId: null,
  botBasicId: null,
  botPictureUrl: null,
  addFriendUrl: null,
  addFriendQrCodeUrl: null,
  isActive: true,
  channelSecret: "channel-secret",
  channelAccessToken: "channel-token",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockLoginChannel: LineLoginChannelView = {
  id: "channel-2",
  providerId: "provider-1",
  channelType: "login",
  name: "Login Channel",
  channelId: "0987654321",
  channelSecret: "channel-secret",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockLiff: LiffAppView = {
  id: "liff-1",
  loginChannelId,
  liffId: "1234567890-AbCdEf12",
  view: {
    type: "tall",
    url: "https://example.com/liff",
  },
  description: "Loyalty card dashboard",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockLiffForLogin: LiffAppView = {
  id: "liff-2",
  loginChannelId,
  liffId: "0987654321-AbCdEf12",
  view: {
    type: "full",
    url: "https://example.com/login-liff",
  },
  description: "Login App",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

beforeAll(() => {
  defineLineAccountManagementElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: LineAccountManagement): Promise<void> => {
  for (let index = 0; index < 4; index++) {
    await Promise.resolve();
    await element.updateComplete;
  }
};

const makeAdapter = (
  providers: ProviderView[] = [],
  messagingChannels: LineMessagingChannelView[] = [],
  loginChannels: LineLoginChannelView[] = [],
  liffApps: LiffAppView[] = [],
): LineProviderManagementAdapter => {
  return {
    listProviders: async () => ({
      data: providers,
      pagination: {
        page: 1,
        pageSize: providers.length,
        totalItems: providers.length,
        totalPages: 1,
      },
    }),
    createProvider: async (input) => {
      const p = { ...mockProvider, name: input.name, id: `provider-${providers.length + 1}` };
      providers.push(p);
      return p;
    },
    updateProvider: async (id, input) => {
      const p = providers.find((x) => x.id === id);
      if (!p) throw new Error("not found");
      const updated = { ...p, name: input.name ?? p.name };
      providers = providers.map((x) => (x.id === id ? updated : x));
      return updated;
    },
    deleteProvider: async (id) => {
      providers = providers.filter((x) => x.id !== id);
    },

    listMessagingChannels: async (query) => {
      let filtered = messagingChannels;
      if (query?.providerId) {
        filtered = filtered.filter((c) => c.providerId === query.providerId);
      }
      return {
        data: filtered,
        pagination: {
          page: 1,
          pageSize: filtered.length,
          totalItems: filtered.length,
          totalPages: 1,
        },
      };
    },
    getMessagingChannel: async (id) => {
      const c = messagingChannels.find((x) => x.channelId === id);
      if (!c) throw new Error("not found");
      return c;
    },
    createMessagingChannel: async (input) => {
      const c: LineMessagingChannelView = {
        ...mockMessagingChannel,
        name: input.name,
        channelId: input.channelId,
        providerId: input.providerId,
        id: `channel-${messagingChannels.length + 1}`,
      };
      messagingChannels.push(c);
      return c;
    },
    updateMessagingChannel: async (id, input) => {
      const c = messagingChannels.find((x) => x.channelId === id);
      if (!c) throw new Error("not found");
      const updated: LineMessagingChannelView = {
        ...c,
        name: input.name ?? c.name,
        isActive: input.isActive ?? c.isActive,
      };
      messagingChannels = messagingChannels.map((x) => (x.channelId === id ? updated : x));
      return updated;
    },
    deleteMessagingChannel: async (id) => {
      messagingChannels = messagingChannels.filter((x) => x.channelId !== id);
    },

    listLoginChannels: async (query) => {
      let filtered = loginChannels;
      if (query?.providerId) {
        filtered = filtered.filter((c) => c.providerId === query.providerId);
      }
      return {
        data: filtered,
        pagination: {
          page: 1,
          pageSize: filtered.length,
          totalItems: filtered.length,
          totalPages: 1,
        },
      };
    },
    getLoginChannel: async (id) => {
      const c = loginChannels.find((x) => x.channelId === id);
      if (!c) throw new Error("not found");
      return c;
    },
    createLoginChannel: async (input) => {
      const c: LineLoginChannelView = {
        ...mockLoginChannel,
        name: input.name,
        channelId: input.channelId,
        providerId: input.providerId,
        id: `channel-${loginChannels.length + 1}`,
      };
      loginChannels.push(c);
      return c;
    },
    updateLoginChannel: async (id, input) => {
      const c = loginChannels.find((x) => x.channelId === id);
      if (!c) throw new Error("not found");
      const updated: LineLoginChannelView = { ...c, name: input.name ?? c.name };
      loginChannels = loginChannels.map((x) => (x.channelId === id ? updated : x));
      return updated;
    },
    deleteLoginChannel: async (id) => {
      loginChannels = loginChannels.filter((x) => x.channelId !== id);
    },

    listLiffApps: async () => ({
      data: liffApps,
      pagination: {
        page: 1,
        pageSize: liffApps.length,
        totalItems: liffApps.length,
        totalPages: 1,
      },
    }),
    getLiffApp: async (id) => {
      const l = liffApps.find((x) => x.liffId === id);
      if (!l) throw new Error("not found");
      return l;
    },
    createLiffApp: async (input) => {
      const l = {
        ...mockLiff,
        liffId: input.liffId,
        loginChannelId: input.loginChannelId,
        id: `liff-${liffApps.length + 1}`,
      };
      liffApps.push(l);
      return l;
    },
    updateLiffApp: async (id, input) => {
      const l = liffApps.find((x) => x.liffId === id);
      if (!l) throw new Error("not found");
      const updated = { ...l, liffId: input.liffId ?? l.liffId };
      liffApps = liffApps.map((x) => (x.liffId === id ? updated : x));
      return updated;
    },
    deleteLiffApp: async (id) => {
      liffApps = liffApps.filter((x) => x.liffId !== id);
    },
  };
};

const mount = async (adapter?: LineProviderManagementAdapter) => {
  const element = document.createElement("line-account-management") as LineAccountManagement;
  element.adapter = adapter;
  document.body.append(element);
  await settle(element);
  return element;
};

const getHierarchy = (element: LineAccountManagement): LineAccountHierarchy => {
  const hierarchy =
    element.shadowRoot?.querySelector<LineAccountHierarchy>("line-account-hierarchy");
  if (hierarchy === null || hierarchy === undefined) throw new Error("Missing hierarchy");
  return hierarchy;
};

const getNodes = (element: LineAccountManagement) =>
  getHierarchy(element).shadowRoot?.querySelectorAll('[part="node"]') ?? [];

describe("LineAccountManagement", () => {
  test("renders hierarchy tree with provider nodes", async () => {
    const adapter = makeAdapter([mockProvider], [mockMessagingChannel], [], [mockLiff]);
    const element = await mount(adapter);

    const nodes = getNodes(element);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0]?.textContent).toContain("LINE Marketing");
  });

  test("expand provider in hierarchy to reveal channels", async () => {
    const adapter = makeAdapter([mockProvider], [], [mockLoginChannel], [mockLiffForLogin]);
    const element = await mount(adapter);

    const hierarchy = getHierarchy(element);
    const providerHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    expect(providerHeaders).toBeDefined();
    expect(providerHeaders!.length).toBeGreaterThan(0);

    (providerHeaders![0] as HTMLElement).click();
    await settle(element);

    const allNodes = hierarchy.shadowRoot?.querySelectorAll('[part="node"]');
    expect(allNodes!.length).toBeGreaterThan(1);
    expect(hierarchy.shadowRoot?.textContent).toContain("Login Channel");
  });

  test("nested child lists in details pane", async () => {
    const adapter = makeAdapter([mockProvider], [], [mockLoginChannel], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.variant = "split";
    element.currentTab = "provider";
    element.selectedItemId = "provider-1";
    await settle(element);

    const detailPanel = element.shadowRoot?.querySelector("line-account-detail-panel");
    expect(detailPanel?.shadowRoot?.textContent).toContain("Channels");
    expect(detailPanel?.shadowRoot?.textContent).toContain("Login Channel");

    element.currentTab = "loginChannel";
    element.selectedItemId = "channel-2";
    await settle(element);

    expect(detailPanel?.shadowRoot?.textContent).toContain("LIFF Applications");
    expect(detailPanel?.shadowRoot?.textContent).toContain("0987654321-AbCdEf12");
  });

  test("form scoped pre-population and disabled selectors", async () => {
    const adapter = makeAdapter([mockProvider], [], [mockLoginChannel], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.selectedProviderId = "provider-1";
    element.currentTab = "loginChannel";
    await settle(element);

    const createBtn = element.shadowRoot?.querySelector(".add-btn") as HTMLButtonElement;
    createBtn.click();
    await settle(element);

    const form = element.shadowRoot?.querySelector("line-account-form");
    expect(form).toBeDefined();

    await settle(element);

    const providerSelect = form?.shadowRoot?.querySelector(
      "#channelProviderId",
    ) as HTMLSelectElement;
    expect(providerSelect.value).toBe("provider-1");
    expect(providerSelect.disabled).toBe(true);
  });

  test("clicking a channel list item in non-split mode expands its details inline", async () => {
    const adapter = makeAdapter([mockProvider], [mockMessagingChannel], [], [mockLiff]);
    const element = await mount(adapter);
    element.variant = "grid";
    await settle(element);

    const hierarchy = getHierarchy(element);

    const providerHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    (providerHeaders![0] as HTMLElement).click();
    await settle(element);

    const treeNodeHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    const channelHeader = Array.from(treeNodeHeaders!).find((h) =>
      h.textContent?.includes("Support Channel"),
    );
    expect(channelHeader).toBeDefined();

    (channelHeader as HTMLElement).click();
    await settle(element);

    const detailsPanel = hierarchy.shadowRoot?.querySelector("line-account-detail-panel");
    expect(detailsPanel).toBeDefined();
    expect((detailsPanel as any).readonly).toBe(true);
  });

  test("clicking an already selected channel list item collapses it", async () => {
    const adapter = makeAdapter([mockProvider], [mockMessagingChannel], [], [mockLiff]);
    const element = await mount(adapter);
    element.variant = "grid";
    await settle(element);

    const hierarchy = getHierarchy(element);

    const providerHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    (providerHeaders![0] as HTMLElement).click();
    await settle(element);

    const treeNodeHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    const channelHeader = Array.from(treeNodeHeaders!).find((h) =>
      h.textContent?.includes("Support Channel"),
    );
    (channelHeader as HTMLElement).click();
    await settle(element);

    let detailsPanel = hierarchy.shadowRoot?.querySelector("line-account-detail-panel");
    expect(detailsPanel).toBeDefined();

    (channelHeader as HTMLElement).click();
    await settle(element);

    detailsPanel = hierarchy.shadowRoot?.querySelector("line-account-detail-panel");
    expect(detailsPanel).toBeNull();
  });

  test("line-account-detail-panel in inline mode hides the details header", async () => {
    const adapter = makeAdapter([mockProvider], [mockMessagingChannel], [], [mockLiff]);
    const element = await mount(adapter);
    element.variant = "grid";
    await settle(element);

    const hierarchy = getHierarchy(element);

    const providerHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    (providerHeaders![0] as HTMLElement).click();
    await settle(element);

    const treeNodeHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    const channelHeader = Array.from(treeNodeHeaders!).find((h) =>
      h.textContent?.includes("Support Channel"),
    );
    (channelHeader as HTMLElement).click();
    await settle(element);

    const detailsPanel = hierarchy.shadowRoot?.querySelector("line-account-detail-panel");
    expect(detailsPanel).toBeDefined();
    expect((detailsPanel as any).inline).toBe(true);

    const header = detailsPanel?.shadowRoot?.querySelector(".details-header");
    expect(header).toBeNull();
  });

  test("line-account-detail-panel in inline mode hides the LIFF applications table for login channels", async () => {
    const adapter = makeAdapter([mockProvider], [], [mockLoginChannel], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.variant = "grid";
    await settle(element);

    const hierarchy = getHierarchy(element);

    const providerHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    (providerHeaders![0] as HTMLElement).click();
    await settle(element);

    const treeNodeHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    const channelHeader = Array.from(treeNodeHeaders!).find((h) =>
      h.textContent?.includes("Login Channel"),
    );
    (channelHeader as HTMLElement).click();
    await settle(element);

    const detailsPanel = hierarchy.shadowRoot?.querySelector("line-account-detail-panel");
    expect(detailsPanel).toBeDefined();
    expect((detailsPanel as any).inline).toBe(true);

    const liffSection = detailsPanel?.shadowRoot?.textContent;
    expect(liffSection).not.toContain("LIFF Applications");
  });

  test("clicking a LIFF app list item expands its details inline", async () => {
    const adapter = makeAdapter([mockProvider], [], [mockLoginChannel], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.variant = "grid";
    await settle(element);

    const hierarchy = getHierarchy(element);

    const providerHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    (providerHeaders![0] as HTMLElement).click();
    await settle(element);

    const treeNodeHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    const channelHeader = Array.from(treeNodeHeaders!).find((h) =>
      h.textContent?.includes("Login Channel"),
    );
    (channelHeader as HTMLElement).click();
    await settle(element);

    const updatedHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    const liffHeader = Array.from(updatedHeaders!).find((h) =>
      h.textContent?.includes("0987654321-AbCdEf12"),
    );
    expect(liffHeader).toBeDefined();

    (liffHeader as HTMLElement).click();
    await settle(element);

    const detailsPanels = hierarchy.shadowRoot?.querySelectorAll("line-account-detail-panel") ?? [];
    expect(detailsPanels.length).toBe(2);

    const liffPanel = detailsPanels[1];
    expect(liffPanel).toBeDefined();
    expect((liffPanel as any).readonly).toBe(true);
    expect((liffPanel as any).inline).toBe(true);
    expect((liffPanel as any).item.id).toBe("liff-2");
  });

  test("line-account-hierarchy does not expand inline details and hides actions when in split mode", async () => {
    const adapter = makeAdapter([mockProvider], [mockMessagingChannel], [], [mockLiff]);
    const element = await mount(adapter);
    element.variant = "split";
    await settle(element);

    const hierarchy = getHierarchy(element);

    const providerHeader = hierarchy.shadowRoot?.querySelector(".tree-node-header");
    expect(providerHeader?.querySelector(".node-actions")).toBeNull();

    (providerHeader as HTMLElement).click();
    await settle(element);

    expect(hierarchy.shadowRoot?.querySelector(".add-child-btn")).toBeNull();

    const treeNodeHeaders = hierarchy.shadowRoot?.querySelectorAll(".tree-node-header");
    const channelHeader = Array.from(treeNodeHeaders!).find((h) =>
      h.textContent?.includes("Support Channel"),
    );
    expect(channelHeader).toBeDefined();

    expect(channelHeader!.querySelector(".node-actions")).toBeNull();

    (channelHeader as HTMLElement).click();
    await settle(element);

    const detailsPanel = hierarchy.shadowRoot?.querySelector("line-account-detail-panel");
    expect(detailsPanel).toBeNull();
  });
});
