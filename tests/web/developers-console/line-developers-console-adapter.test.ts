import { Schema } from "effect";
import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  type LineProviderManagementAdapter,
  type ProviderView,
  type LineMessagingChannelView,
  type LineLoginChannelView,
  type LiffAppView,
  type LineAccountFormSubmitDetail,
} from "../../../src/web/index.ts";
import {
  LineDevelopersConsole,
  createLineConsoleAdapterFromProviderManagementAdapter,
  defineLineDevelopersConsole,
} from "../../../src/web/developers-console/index.ts";
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
  additionalUrlParameters: "campaign=spring&source=poster",
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

  test("opens edit modal dialog when an edit button is clicked in tree view", async () => {
    const mgmtAdapter = makeEnvelopeProviderManagementAdapter();
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.variant = "tree";
    element.adapter = mgmtAdapter;
    document.body.append(element);

    await settle(element);
    await element.expandAll();
    await settle(element);
    await settle(element);

    const editBtn = element.shadowRoot?.querySelector<HTMLButtonElement>(
      '.r-provider .tv-actions [data-action="edit"]',
    );
    expect(editBtn).not.toBeNull();
    editBtn!.click();
    await settle(element);

    const dialog = element.shadowRoot?.querySelector('line-account-dialog[data-kind="edit"]');
    expect(dialog).not.toBeNull();
    expect((dialog as any).open).toBe(true);
    expect((dialog as any).heading).toBe("Edit LINE Provider");
  });

  test("saves edits from the tree view dialog footer", async () => {
    let updatedProvider:
      | {
          id: string;
          input: { readonly name?: string };
        }
      | undefined;
    const mgmtAdapter: LineProviderManagementAdapter = {
      ...makeEnvelopeProviderManagementAdapter(),
      updateProvider: async (id, input) => {
        updatedProvider = { id, input };
        return { ...mockProvider, name: input.name ?? mockProvider.name };
      },
    };
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.variant = "tree";
    element.adapter = mgmtAdapter;
    document.body.append(element);

    await settle(element);
    await element.expandAll();
    await settle(element);
    element.shadowRoot
      ?.querySelector<HTMLButtonElement>('.r-provider .tv-actions [data-action="edit"]')
      ?.click();
    await settle(element);

    const dialog = element.shadowRoot?.querySelector('line-account-dialog[data-kind="edit"]');
    const footerButtons = dialog?.querySelectorAll<HTMLButtonElement>('button[slot="footer"]');
    expect(footerButtons).toHaveLength(2);
    expect(footerButtons?.[0]?.textContent?.trim()).toBe("Cancel");
    expect(footerButtons?.[1]?.textContent?.trim()).toBe("Save changes");

    footerButtons?.[1]?.click();
    await settle(element);
    await settle(element);

    expect(updatedProvider).toEqual({
      id: "provider-1",
      input: { name: "Acme Corp" },
    });
  });

  test("opens contextual create dialogs from the tree toolbar and rows", async () => {
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.variant = "tree";
    element.adapter = makeEnvelopeProviderManagementAdapter();
    document.body.append(element);

    await settle(element);
    await element.expandAll();
    await settle(element);

    element.shadowRoot
      ?.querySelector<HTMLButtonElement>('[data-action="create-provider"]')
      ?.click();
    await settle(element);

    const createDialog = element.shadowRoot?.querySelector(
      'line-account-dialog[data-kind="create"]',
    );
    const createForm = createDialog?.querySelector("line-account-form");
    expect((createDialog as any)?.open).toBe(true);
    expect((createDialog as any)?.heading).toBe("Add LINE Provider");
    expect((createForm as any)?.type).toBe("provider");
    expect((createForm as any)?.mode).toBe("create");

    createDialog?.querySelector<HTMLButtonElement>('button[slot="footer"]:not(.primary)')?.click();
    await settle(element);

    element.shadowRoot
      ?.querySelector<HTMLButtonElement>('[data-action="create-messaging-channel"]')
      ?.click();
    await settle(element);

    expect((createDialog as any)?.open).toBe(true);
    expect((createDialog as any)?.heading).toBe("Add LINE Messaging Channel");
    expect((createForm as any)?.type).toBe("messagingChannel");
    expect((createForm as any)?.selectedProviderId).toBe("provider-1");

    createDialog?.querySelector<HTMLButtonElement>('button[slot="footer"]:not(.primary)')?.click();
    await settle(element);

    element.shadowRoot
      ?.querySelector<HTMLButtonElement>('[data-action="create-login-channel"]')
      ?.click();
    await settle(element);

    expect((createDialog as any)?.heading).toBe("Add LINE Login Channel");
    expect((createForm as any)?.type).toBe("loginChannel");
    expect((createForm as any)?.selectedProviderId).toBe("provider-1");

    createDialog?.querySelector<HTMLButtonElement>('button[slot="footer"]:not(.primary)')?.click();
    await settle(element);

    element.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="create-liff"]')?.click();
    await settle(element);

    expect((createDialog as any)?.heading).toBe("Add LIFF Application");
    expect((createForm as any)?.type).toBe("liff");
    expect((createForm as any)?.selectedChannelId).toBe("2222222222");
  });

  test("confirms and deletes every tree entity through the management adapter", async () => {
    const deleted: Array<{ type: string; id: string }> = [];
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.variant = "tree";
    element.adapter = {
      ...makeEnvelopeProviderManagementAdapter(),
      deleteProvider: async (id) => {
        deleted.push({ type: "provider", id });
      },
      deleteMessagingChannel: async (id) => {
        deleted.push({ type: "messagingChannel", id });
      },
      deleteLoginChannel: async (id) => {
        deleted.push({ type: "loginChannel", id });
      },
      deleteLiffApp: async (id) => {
        deleted.push({ type: "liff", id });
      },
    };
    document.body.append(element);

    await settle(element);
    await element.expandAll();
    await settle(element);

    const cases = [
      { row: ".r-provider", type: "provider", id: "provider-1" },
      { row: ".r-messaging", type: "messagingChannel", id: "1111111111" },
      { row: ".r-login", type: "loginChannel", id: "2222222222" },
      { row: ".r-liff", type: "liff", id: "2222222222-AbCdEf" },
    ] as const;

    for (const item of cases) {
      element.shadowRoot
        ?.querySelector<HTMLButtonElement>(`${item.row} [data-action="delete"]`)
        ?.click();
      await settle(element);

      const deleteDialog = element.shadowRoot?.querySelector(
        'line-account-dialog[data-kind="delete"]',
      );
      expect((deleteDialog as any)?.open).toBe(true);
      deleteDialog?.querySelector<HTMLButtonElement>('[part="confirm-delete-button"]')?.click();
      await settle(element);
      await settle(element);
      await settle(element);

      expect(deleted).toContainEqual({ type: item.type, id: item.id });
    }
  });

  test("reveals a newly created LIFF app when its login channel started collapsed", async () => {
    const createdLiff: LiffAppView = {
      ...mockLiff,
      id: "liff-2",
      liffId: "2222222222-NewApp",
      description: "New tree LIFF",
    };
    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.variant = "tree";
    element.adapter = {
      ...makeEnvelopeProviderManagementAdapter(),
      createLiffApp: async () => createdLiff,
      listLiffApps: async (query?: { readonly channelId?: string }) => {
        const data =
          query?.channelId === "2222222222" || !query?.channelId ? [mockLiff, createdLiff] : [];
        return {
          data,
          pagination: { page: 1, pageSize: data.length, totalItems: data.length, totalPages: 1 },
        };
      },
    };
    document.body.append(element);

    await settle(element);
    await element.expandAll();
    element.expandedChannelIds = new Set();
    await settle(element);

    element.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="create-liff"]')?.click();
    await settle(element);

    element.shadowRoot
      ?.querySelector('line-account-dialog[data-kind="create"] line-account-form')
      ?.dispatchEvent(
        new CustomEvent<LineAccountFormSubmitDetail>("line-account-form-submit", {
          bubbles: true,
          composed: true,
          detail: {
            type: "liff",
            mode: "create",
            input: {
              loginChannelId,
              liffId: createdLiff.liffId,
              view: createdLiff.view,
              description: createdLiff.description ?? undefined,
            },
          },
        }),
      );
    await settle(element);
    await settle(element);
    await settle(element);

    expect(element.expandedChannelIds).toContain("2222222222");
    expect(element.shadowRoot?.textContent).toContain("New tree LIFF");
  });
});
