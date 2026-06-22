import type {
  LineProviderManagementAdapter,
  ProviderView,
  ChannelView,
  LiffAppView,
} from "../src/web/index.ts";
import { paginate, normalizePageQuery, type PageQuery } from "../src/shared/domain.ts";
import type { ListChannelsQuery } from "../src/adapter/compat.ts";
import type { ListLiffAppsQuery } from "../src/liff/domain.ts";
import {
  isLineMessagingChannelView,
  isLineLoginChannelView,
  type LineMessagingChannelView,
  type LineLoginChannelView,
  type LineMessagingChannelListPage,
  type LineLoginChannelListPage,
} from "../src/channels/management-domain.ts";

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

  const paginateViews = <A>(items: A[], query?: PageQuery) =>
    paginate(items, normalizePageQuery(query ?? {}));

  return {
    listProviders: async (query) => paginateViews(providers, query),
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
          liffApps = liffApps.filter((l) => l.loginChannelId !== channel.channelId);
        }
      }
    },

    listChannels: async (query?: ListChannelsQuery) => {
      let filtered = channels;
      if (query?.providerId) {
        filtered = filtered.filter((c) => c.providerId === query.providerId);
      }
      return paginateViews(filtered.map(copy), query);
    },
    getChannel: async (id) => {
      const channel = channels.find((c) => c.channelId === id);
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
          channelSecret: input.channelSecret,
          channelAccessToken: input.channelAccessToken,
          isActive: true,
          botDisplayName: input.botDisplayName ?? null,
          botUserId: input.botUserId ?? null,
          botBasicId: input.botBasicId ?? null,
          botPictureUrl: input.botPictureUrl ?? null,
          addFriendUrl: input.addFriendUrl ?? null,
          addFriendQrCodeUrl: input.addFriendQrCodeUrl ?? null,
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
          channelSecret: input.channelSecret,
          createdAt: now,
          updatedAt: now,
        };
      }
      channels = [...channels, channel];
      return copy(channel);
    },
    updateChannel: async (id, input) => {
      const index = channels.findIndex((c) => c.channelId === id);
      if (index === -1) throw new Error(`Channel not found: ${id}`);
      const current = channels[index];
      let updated: ChannelView;
      if (current.channelType === "messaging") {
        updated = {
          ...current,
          name: input.name ?? current.name,
          channelId: input.channelId ?? current.channelId,
          channelSecret: input.channelSecret ?? current.channelSecret,
          channelAccessToken: input.channelAccessToken ?? current.channelAccessToken,
          isActive: input.isActive ?? current.isActive,
          botDisplayName:
            input.botDisplayName !== undefined ? input.botDisplayName : current.botDisplayName,
          botUserId: input.botUserId !== undefined ? input.botUserId : current.botUserId,
          botBasicId: input.botBasicId !== undefined ? input.botBasicId : current.botBasicId,
          botPictureUrl:
            input.botPictureUrl !== undefined ? input.botPictureUrl : current.botPictureUrl,
          addFriendUrl:
            input.addFriendUrl !== undefined ? input.addFriendUrl : current.addFriendUrl,
          addFriendQrCodeUrl:
            input.addFriendQrCodeUrl !== undefined
              ? input.addFriendQrCodeUrl
              : current.addFriendQrCodeUrl,
          updatedAt: new Date(),
        };
      } else {
        updated = {
          ...current,
          name: input.name ?? current.name,
          channelId: input.channelId ?? current.channelId,
          channelSecret: input.channelSecret ?? current.channelSecret,
          updatedAt: new Date(),
        };
      }
      channels[index] = updated;
      return copy(updated);
    },
    deleteChannel: async (id) => {
      channels = channels.filter((c) => c.channelId !== id);
      liffApps = liffApps.filter((l) => l.loginChannelId !== id);
    },

    // Aggregate-specific messaging channel methods.
    listMessagingChannels: async (query) => {
      let filtered: ChannelView[] = channels.filter(isLineMessagingChannelView);
      if (query?.providerId) {
        filtered = filtered.filter((c) => c.providerId === query.providerId);
      }
      return paginateViews(filtered.map(copy), query) as LineMessagingChannelListPage;
    },
    getMessagingChannel: async (id) => {
      const channel = channels.find(
        (c): c is LineMessagingChannelView => c.channelId === id && isLineMessagingChannelView(c),
      );
      if (!channel) throw new Error(`Messaging channel not found: ${id}`);
      return copy(channel);
    },
    createMessagingChannel: async (input) => {
      const now = new Date();
      const id = `demo-channel-${nextChannelId++}`;
      const channel: LineMessagingChannelView = {
        id,
        providerId: input.providerId,
        channelType: "messaging",
        name: input.name,
        channelId: input.channelId,
        channelSecret: input.channelSecret,
        channelAccessToken: input.channelAccessToken,
        isActive: true,
        botDisplayName: input.botDisplayName ?? null,
        botUserId: input.botUserId ?? null,
        botBasicId: input.botBasicId ?? null,
        botPictureUrl: input.botPictureUrl ?? null,
        addFriendUrl: input.addFriendUrl ?? null,
        addFriendQrCodeUrl: input.addFriendQrCodeUrl ?? null,
        createdAt: now,
        updatedAt: now,
      };
      channels = [...channels, channel];
      return copy(channel);
    },
    updateMessagingChannel: async (id, input) => {
      const index = channels.findIndex(
        (c): c is LineMessagingChannelView => c.channelId === id && isLineMessagingChannelView(c),
      );
      if (index === -1) throw new Error(`Messaging channel not found: ${id}`);
      const current = channels[index] as LineMessagingChannelView;
      const updated: LineMessagingChannelView = {
        ...current,
        name: input.name ?? current.name,
        channelId: input.channelId ?? current.channelId,
        channelSecret: input.channelSecret ?? current.channelSecret,
        channelAccessToken: input.channelAccessToken ?? current.channelAccessToken,
        isActive: input.isActive ?? current.isActive,
        botDisplayName:
          input.botDisplayName !== undefined ? input.botDisplayName : current.botDisplayName,
        botUserId: input.botUserId !== undefined ? input.botUserId : current.botUserId,
        botBasicId: input.botBasicId !== undefined ? input.botBasicId : current.botBasicId,
        botPictureUrl:
          input.botPictureUrl !== undefined ? input.botPictureUrl : current.botPictureUrl,
        addFriendUrl: input.addFriendUrl !== undefined ? input.addFriendUrl : current.addFriendUrl,
        addFriendQrCodeUrl:
          input.addFriendQrCodeUrl !== undefined
            ? input.addFriendQrCodeUrl
            : current.addFriendQrCodeUrl,
        updatedAt: new Date(),
      };
      channels[index] = updated;
      return copy(updated);
    },
    deleteMessagingChannel: async (id) => {
      channels = channels.filter((c) => !(c.channelId === id && c.channelType === "messaging"));
      liffApps = liffApps.filter((l) => l.loginChannelId !== id);
    },

    // Aggregate-specific login channel methods.
    listLoginChannels: async (query) => {
      let filtered: ChannelView[] = channels.filter(isLineLoginChannelView);
      if (query?.providerId) {
        filtered = filtered.filter((c) => c.providerId === query.providerId);
      }
      return paginateViews(filtered.map(copy), query) as LineLoginChannelListPage;
    },
    getLoginChannel: async (id) => {
      const channel = channels.find(
        (c): c is LineLoginChannelView => c.channelId === id && isLineLoginChannelView(c),
      );
      if (!channel) throw new Error(`Login channel not found: ${id}`);
      return copy(channel);
    },
    createLoginChannel: async (input) => {
      const now = new Date();
      const id = `demo-channel-${nextChannelId++}`;
      const channel: LineLoginChannelView = {
        id,
        providerId: input.providerId,
        channelType: "login",
        name: input.name,
        channelId: input.channelId,
        channelSecret: input.channelSecret,
        createdAt: now,
        updatedAt: now,
      };
      channels = [...channels, channel];
      return copy(channel);
    },
    updateLoginChannel: async (id, input) => {
      const index = channels.findIndex(
        (c): c is LineLoginChannelView => c.channelId === id && isLineLoginChannelView(c),
      );
      if (index === -1) throw new Error(`Login channel not found: ${id}`);
      const current = channels[index] as LineLoginChannelView;
      const updated: LineLoginChannelView = {
        ...current,
        name: input.name ?? current.name,
        channelId: input.channelId ?? current.channelId,
        channelSecret: input.channelSecret ?? current.channelSecret,
        updatedAt: new Date(),
      };
      channels[index] = updated;
      return copy(updated);
    },
    deleteLoginChannel: async (id) => {
      channels = channels.filter((c) => !(c.channelId === id && c.channelType === "login"));
      liffApps = liffApps.filter((l) => l.loginChannelId !== id);
    },

    listLiffApps: async (query?: ListLiffAppsQuery) => {
      let filtered = liffApps;
      if (query?.channelId) {
        filtered = filtered.filter((l) => l.loginChannelId === query.channelId);
      }
      return paginateViews(filtered.map(copy), query);
    },
    getLiffApp: async (id) => {
      const liff = liffApps.find((l) => l.liffId === id);
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
      const index = liffApps.findIndex((l) => l.liffId === id);
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
      liffApps = liffApps.filter((l) => l.liffId !== id);
    },
  };
};
