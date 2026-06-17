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
});
