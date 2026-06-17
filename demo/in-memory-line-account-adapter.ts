import type {
  LineProviderManagementAdapter,
  ProviderView,
  ChannelView,
  LiffAppView,
} from "../src/web/index.ts";

export const createInMemoryLineAccountAdapter = (
  initialProviders: ProviderView[] = [],
  initialChannels: ChannelView[] = [],
  initialLiffApps: LiffAppView[] = [],
): LineProviderManagementAdapter => {
  let providers = [...initialProviders];
  let channels = [...initialChannels];
  let liffApps = [...initialLiffApps];

  let nextProviderId = providers.length + 1;
  let nextChannelId = channels.length + 1;
  let nextLiffId = liffApps.length + 1;

  const copy = <T>(obj: T): T => ({ ...obj });

  return {
    listProviders: async () => ({
      data: providers.map(copy),
      pagination: {
        page: 1,
        pageSize: providers.length,
        totalItems: providers.length,
        totalPages: providers.length === 0 ? 0 : 1,
      },
    }),
    createProvider: async (input) => {
      const now = new Date();
      const provider: ProviderView = {
        id: `demo-provider-${nextProviderId++}`,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      };
      providers = [...providers, provider];
      return copy(provider);
    },
    updateProvider: async (id, input) => {
      const index = providers.findIndex((p) => p.id === id);
      if (index === -1) throw new Error(`Provider not found: ${id}`);
      const updated: ProviderView = {
        ...providers[index],
        name: input.name ?? providers[index].name,
        updatedAt: new Date(),
      };
      providers[index] = updated;
      return copy(updated);
    },
    deleteProvider: async (id) => {
      providers = providers.filter((p) => p.id !== id);
      const channelsToDelete = channels.filter((c) => c.providerId === id);
      channels = channels.filter((c) => c.providerId !== id);
      for (const channel of channelsToDelete) {
        if (channel.channelType === "login") {
          liffApps = liffApps.filter((l) => l.loginChannelId !== channel.id);
        }
      }
    },

    listChannels: async (providerId) => {
      let filtered = channels;
      if (providerId) {
        filtered = filtered.filter((c) => c.providerId === providerId);
      }
      return {
        data: filtered.map(copy),
        pagination: {
          page: 1,
          pageSize: filtered.length,
          totalItems: filtered.length,
          totalPages: filtered.length === 0 ? 0 : 1,
        },
      };
    },
    getChannel: async (id) => {
      const channel = channels.find((c) => c.id === id);
      if (!channel) throw new Error(`Channel not found: ${id}`);
      return copy(channel);
    },
    createChannel: async (input) => {
      const now = new Date();
      const id = `demo-channel-${nextChannelId++}`;
      let channel: ChannelView;
      if (input.channelType === "messaging") {
        channel = {
          id,
          providerId: input.providerId,
          channelType: "messaging",
          name: input.name,
          channelId: input.channelId,
          channelSecret: "channel-secret",
          channelAccessToken: "channel-token",
          isActive: true,
          basicId: `@demo-${input.name.toLowerCase().replace(/\s+/g, "-")}`,
          displayName: input.name,
          botUserId: `U${Math.random().toString().slice(2, 12)}`,
          pictureUrl: null,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        channel = {
          id,
          providerId: input.providerId,
          channelType: "login",
          name: input.name,
          channelId: input.channelId,
          channelSecret: "channel-secret",
          createdAt: now,
          updatedAt: now,
        };
      }
      channels = [...channels, channel];
      return copy(channel);
    },
    updateChannel: async (id, input) => {
      const index = channels.findIndex((c) => c.id === id);
      if (index === -1) throw new Error(`Channel not found: ${id}`);
      const current = channels[index];
      const updated: ChannelView =
        current.channelType === "messaging"
          ? {
              ...current,
              name: input.name ?? current.name,
              channelId: input.channelId ?? current.channelId,
              isActive: input.isActive ?? current.isActive,
              updatedAt: new Date(),
            }
          : {
              ...current,
              name: input.name ?? current.name,
              channelId: input.channelId ?? current.channelId,
              updatedAt: new Date(),
            };
      channels[index] = updated;
      return copy(updated);
    },
    deleteChannel: async (id) => {
      channels = channels.filter((c) => c.id !== id);
      liffApps = liffApps.filter((l) => l.loginChannelId !== id);
    },

    listLiffApps: async (channelId) => {
      let filtered = liffApps;
      if (channelId) {
        filtered = filtered.filter((l) => l.loginChannelId === channelId);
      }
      return {
        data: filtered.map(copy),
        pagination: {
          page: 1,
          pageSize: filtered.length,
          totalItems: filtered.length,
          totalPages: filtered.length === 0 ? 0 : 1,
        },
      };
    },
    getLiffApp: async (id) => {
      const liff = liffApps.find((l) => l.id === id);
      if (!liff) throw new Error(`LIFF App not found: ${id}`);
      return copy(liff);
    },
    createLiffApp: async (input) => {
      const now = new Date();
      const liff: LiffAppView = {
        id: `demo-liff-${nextLiffId++}`,
        loginChannelId: input.loginChannelId,
        liffId: input.liffId,
        view: {
          type: input.view.type,
          url: input.view.url,
        },
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
      };
      liffApps = [...liffApps, liff];
      return copy(liff);
    },
    updateLiffApp: async (id, input) => {
      const index = liffApps.findIndex((l) => l.id === id);
      if (index === -1) throw new Error(`LIFF App not found: ${id}`);
      const current = liffApps[index];
      const updated: LiffAppView = {
        ...current,
        liffId: input.liffId ?? current.liffId,
        view: input.view ?? current.view,
        description: input.description === undefined ? current.description : input.description,
        updatedAt: new Date(),
      };
      liffApps[index] = updated;
      return copy(updated);
    },
    deleteLiffApp: async (id) => {
      liffApps = liffApps.filter((l) => l.id !== id);
    },
  };
};
