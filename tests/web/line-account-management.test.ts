import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountCard,
  LineAccountList,
  LineAccountManagement,
  defineLineAccountManagementElements,
  type ProviderView,
  type ChannelView,
  type LiffAppView,
  type LineProviderManagementAdapter,
} from "../../src/web/index.ts";

const mockProvider: ProviderView = {
  id: "provider-1",
  name: "LINE Marketing",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockChannel: ChannelView = {
  id: "channel-1",
  providerId: "provider-1",
  channelType: "messaging",
  name: "Support Channel",
  displayName: "LINE Support",
  channelId: "1234567890",
  botUserId: null,
  basicId: null,
  pictureUrl: null,
  isActive: true,
  hasChannelSecret: true,
  hasChannelAccessToken: true,
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockChannelLogin: ChannelView = {
  id: "channel-2",
  providerId: "provider-1",
  channelType: "login",
  name: "Login Channel",
  channelId: "0987654321",
  hasChannelSecret: true,
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockLiff: LiffAppView = {
  id: "liff-1",
  loginChannelId: "channel-1",
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
  loginChannelId: "channel-2",
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
  channels: ChannelView[] = [],
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
    listChannels: async () => ({
      data: channels,
      pagination: {
        page: 1,
        pageSize: channels.length,
        totalItems: channels.length,
        totalPages: 1,
      },
    }),
    getChannel: async (id) => {
      const c = channels.find((x) => x.id === id);
      if (!c) throw new Error("not found");
      return c;
    },
    createChannel: async (input) => {
      const c = {
        ...mockChannel,
        name: input.name,
        channelId: input.channelId,
        providerId: input.providerId,
        id: `channel-${channels.length + 1}`,
      };
      channels.push(c);
      return c;
    },
    updateChannel: async (id, input) => {
      const c = channels.find((x) => x.id === id);
      if (!c) throw new Error("not found");
      const updated =
        c.channelType === "messaging"
          ? {
              ...c,
              name: input.name ?? c.name,
              isActive: input.isActive ?? c.isActive,
            }
          : {
              ...c,
              name: input.name ?? c.name,
            };
      channels = channels.map((x) => (x.id === id ? updated : x));
      return updated as ChannelView;
    },
    deleteChannel: async (id) => {
      channels = channels.filter((x) => x.id !== id);
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
      const l = liffApps.find((x) => x.id === id);
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
      const l = liffApps.find((x) => x.id === id);
      if (!l) throw new Error("not found");
      const updated = { ...l, liffId: input.liffId ?? l.liffId };
      liffApps = liffApps.map((x) => (x.id === id ? updated : x));
      return updated;
    },
    deleteLiffApp: async (id) => {
      liffApps = liffApps.filter((x) => x.id !== id);
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

const getList = (element: LineAccountManagement): LineAccountList => {
  const list = element.shadowRoot?.querySelector<LineAccountList>("line-account-list");
  if (list === null || list === undefined) throw new Error("Missing list");
  return list;
};

const getCards = (element: LineAccountManagement) =>
  getList(element).shadowRoot?.querySelectorAll<LineAccountCard>("line-account-card") ?? [];

describe("LineAccountManagement", () => {
  test("renders tab bar and updates active tab", async () => {
    const adapter = makeAdapter([mockProvider], [mockChannel], [mockLiff]);
    const element = await mount(adapter);

    const tabs = element.shadowRoot?.querySelectorAll(".tab-btn");
    expect(tabs).toHaveLength(3);

    // Initial tab is provider
    expect(element.currentTab).toBe("provider");
    expect(getCards(element)).toHaveLength(1);

    // Click channels tab
    const channelsTabBtn = element.shadowRoot?.querySelectorAll(".tab-btn")[1] as HTMLButtonElement;
    channelsTabBtn.click();
    await settle(element);

    expect(element.currentTab).toBe("channel");
    expect(getCards(element)).toHaveLength(1);
  });

  test("drill-down navigation on selection in grid mode", async () => {
    const adapter = makeAdapter([mockProvider], [mockChannelLogin], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.variant = "grid";
    await settle(element);

    // Click on provider card to drill down to channels
    const providerCard = getCards(element)[0];
    const providerCardInner = providerCard.shadowRoot?.querySelector(".card") as HTMLElement;
    providerCardInner.click();
    await settle(element);

    expect(element.currentTab).toBe("channel");
    expect(element.selectedProviderId).toBe("provider-1");

    // Click on channel card to drill down to LIFF apps
    const channelCard = getCards(element)[0];
    const channelCardInner = channelCard.shadowRoot?.querySelector(".card") as HTMLElement;
    channelCardInner.click();
    await settle(element);

    expect(element.currentTab).toBe("liff");
    expect(element.selectedChannelId).toBe("channel-2");
  });

  test("breadcrumb navigation", async () => {
    const adapter = makeAdapter([mockProvider], [mockChannelLogin], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.selectedProviderId = "provider-1";
    element.selectedChannelId = "channel-2";
    element.currentTab = "liff";
    await settle(element);

    // Verify breadcrumbs are rendered
    const breadcrumbLinks = element.shadowRoot?.querySelectorAll(".breadcrumb-link");
    expect(breadcrumbLinks).toBeDefined();

    // Reset to providers via first breadcrumb link click
    const rootLink = breadcrumbLinks?.[0] as HTMLElement;
    rootLink.click();
    await settle(element);

    expect(element.currentTab).toBe("provider");
    expect(element.selectedProviderId).toBe("");
    expect(element.selectedChannelId).toBe("");
  });

  test("nested child lists in details pane", async () => {
    const adapter = makeAdapter([mockProvider], [mockChannelLogin], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.variant = "split";
    element.currentTab = "provider";
    element.selectedItemId = "provider-1";
    await settle(element);

    // Verify channels list is rendered in the details pane
    const detailsPane = element.shadowRoot?.querySelector(".split-details");
    expect(detailsPane?.textContent).toContain("Channels");
    expect(detailsPane?.textContent).toContain("Login Channel");

    // Switch to channel tab and select the login channel
    element.currentTab = "channel";
    element.selectedItemId = "channel-2";
    await settle(element);

    // Verify LIFF apps list is rendered in the details pane
    expect(detailsPane?.textContent).toContain("LIFF Applications");
    expect(detailsPane?.textContent).toContain("0987654321-AbCdEf12");
  });

  test("form scoped pre-population and disabled selectors", async () => {
    const adapter = makeAdapter([mockProvider], [mockChannelLogin], [mockLiffForLogin]);
    const element = await mount(adapter);
    element.selectedProviderId = "provider-1";
    element.currentTab = "channel";
    await settle(element);

    // Open create dialog
    const createBtn = element.shadowRoot?.querySelector(".add-btn") as HTMLButtonElement;
    createBtn.click();
    await settle(element);

    const form = element.shadowRoot?.querySelector("line-account-form");
    expect(form).toBeDefined();

    // We wait for form rendering
    await settle(element);

    // Pre-populated provider ID should match selectedProviderId
    const providerSelect = form?.shadowRoot?.querySelector(
      "#channelProviderId",
    ) as HTMLSelectElement;
    expect(providerSelect.value).toBe("provider-1");
    expect(providerSelect.disabled).toBe(true);
  });
});
