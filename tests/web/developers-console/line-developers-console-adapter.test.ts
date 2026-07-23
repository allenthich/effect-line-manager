import { Schema } from "effect";
import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineDevelopersConsole,
  createLineConsoleAdapterFromProviderManagementAdapter,
  defineLineDevelopersConsole,
  type LineProviderManagementAdapter,
  type ProviderView,
  type LineMessagingChannelView,
  type LineLoginChannelView,
  type LiffAppView,
} from "../../../src/web/index.ts";
import { LineLoginChannelId } from "../../../src/shared/domain.ts";

const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("2222222222");

const mockProvider: ProviderView = {
  id: "provider-1",
  name: "Acme Corp",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockMessagingChannel: LineMessagingChannelView = {
  id: "msg-1",
  providerId: "provider-1",
  channelType: "messaging",
  name: "Support Bot",
  botDisplayName: "LINE Support",
  channelId: "1111111111",
  botUserId: "U123456",
  botBasicId: "@support",
  botPictureUrl: null,
  addFriendUrl: null,
  addFriendQrCodeUrl: null,
  isActive: true,
  channelSecret: "secret-messaging",
  channelAccessToken: "token-messaging",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockLoginChannel: LineLoginChannelView = {
  id: "login-1",
  providerId: "provider-1",
  channelType: "login",
  name: "Auth Channel",
  channelId: "2222222222",
  channelSecret: "secret-login",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockLiff: LiffAppView = {
  id: "liff-1",
  loginChannelId,
  liffId: "2222222222-AbCdEf",
  view: {
    type: "tall",
    url: "https://example.com/liff",
  },
  description: "Loyalty Card LIFF",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const makeEnvelopeProviderManagementAdapter = (): LineProviderManagementAdapter => ({
  listProviders: async () => ({
    data: [mockProvider],
    pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1 },
  }),
  createProvider: async () => mockProvider,
  updateProvider: async () => mockProvider,
  deleteProvider: async () => {},

  listMessagingChannels: async (query) => {
    const data =
      query?.providerId === "provider-1" || !query?.providerId ? [mockMessagingChannel] : [];
    return {
      data,
      pagination: { page: 1, pageSize: data.length, totalItems: data.length, totalPages: 1 },
    };
  },
  getMessagingChannel: async (id) => {
    if (id === "1111111111" || id === "msg-1") return mockMessagingChannel;
    throw new Error("not found");
  },
  createMessagingChannel: async () => mockMessagingChannel,
  updateMessagingChannel: async () => mockMessagingChannel,
  deleteMessagingChannel: async () => {},

  listLoginChannels: async (query) => {
    const data = query?.providerId === "provider-1" || !query?.providerId ? [mockLoginChannel] : [];
    return {
      data,
      pagination: { page: 1, pageSize: data.length, totalItems: data.length, totalPages: 1 },
    };
  },
  getLoginChannel: async (id) => {
    if (id === "2222222222" || id === "login-1") return mockLoginChannel;
    throw new Error("not found");
  },
  createLoginChannel: async () => mockLoginChannel,
  updateLoginChannel: async () => mockLoginChannel,
  deleteLoginChannel: async () => {},

  listLiffApps: async (query) => {
    const data = query?.channelId === "2222222222" || !query?.channelId ? [mockLiff] : [];
    return {
      data,
      pagination: { page: 1, pageSize: data.length, totalItems: data.length, totalPages: 1 },
    };
  },
  getLiffApp: async (id) => {
    if (id === "2222222222-AbCdEf" || id === "liff-1") return mockLiff;
    throw new Error("not found");
  },
  createLiffApp: async () => mockLiff,
  updateLiffApp: async () => mockLiff,
  deleteLiffApp: async () => {},
});

beforeAll(() => {
  defineLineDevelopersConsole();
});

afterEach(() => {
  document.body.replaceChildren();
});

const settle = async (element: LineDevelopersConsole): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
};

describe("LineProviderManagementAdapter normalization in <line-developers-console>", () => {
  test("createLineConsoleAdapterFromProviderManagementAdapter converts envelope adapter correctly", async () => {
    const mgmtAdapter = makeEnvelopeProviderManagementAdapter();
    const consoleAdapter = createLineConsoleAdapterFromProviderManagementAdapter(mgmtAdapter);

    const providers = await consoleAdapter.listProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0]?.providerId).toBe("provider-1");
    expect(providers[0]?.name).toBe("Acme Corp");

    const channels = await consoleAdapter.listChannels("provider-1");
    expect(channels).toHaveLength(2);
    expect(channels.map((c) => c.name)).toContain("Support Bot");
    expect(channels.map((c) => c.name)).toContain("Auth Channel");

    const liffApps = await consoleAdapter.listLiffApps("2222222222");
    expect(liffApps).toHaveLength(1);
    expect(liffApps[0]?.liffId).toBe("2222222222-AbCdEf");

    const channel = await consoleAdapter.getChannel("1111111111");
    expect(channel.name).toBe("Support Bot");
    expect(channel.type).toBe("messaging");
  });

  test("populates providers, messaging channels, login channels, and LIFF apps in variant='tree'", async () => {
    const mgmtAdapter = makeEnvelopeProviderManagementAdapter();
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.variant = "tree";
    element.adapter = mgmtAdapter;
    document.body.append(element);

    await settle(element);
    await element.expandAll();
    await settle(element);
    await settle(element);
    await settle(element);

    const text = element.shadowRoot?.textContent ?? "";

    // Toolbar summary
    expect(text).toContain("1 provider");
    expect(text).toContain("2 channels");
    expect(text).toContain("1 LIFF");

    // Provider node
    expect(text).toContain("Acme Corp");
    expect(text).toContain("Provider");

    // Channels
    expect(text).toContain("Support Bot");
    expect(text).toContain("Messaging API");
    expect(text).toContain("Auth Channel");
    expect(text).toContain("LINE Login");

    // LIFF App
    expect(text).toContain("Loyalty Card LIFF");
    expect(text).toContain("2222222222-AbCdEf");
  });
});
