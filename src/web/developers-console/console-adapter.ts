import { Schema } from "effect";
import type { LineProviderManagementAdapter } from "../../adapter/types.ts";
import type {
  LineLoginChannelView,
  LineMessagingChannelView,
} from "../../channels/management-domain.ts";
import type { LiffAppView } from "../../liff/domain.ts";
import type { ProviderView } from "../../provider/domain.ts";
import type {
  ConsoleChannelView,
  ConsoleLiffAppView,
  ConsoleProviderView,
  LineConsoleAdapter,
  ConsoleResponseMappers,
} from "./types.ts";

/**
 * Explicit endpoints for a host-owned LINE Developers Console proxy.
 *
 * LINE does not publish a stable console REST contract, so the library does
 * not guess endpoint paths. Hosts must provide endpoints they control.
 */
export interface ConsoleEndpoints {
  readonly providers: string;
  readonly channelsByProvider: (providerId: string) => string;
  readonly channel: (channelId: string) => string;
  readonly liffApps: (channelId: string) => string;
}

/** Options for {@link createLineConsoleAdapter}. */
export interface LineConsoleAdapterOptions {
  /** Host-owned endpoint definitions. Relative URLs target the current origin. */
  readonly endpoints: ConsoleEndpoints;
  /** Custom fetch implementation (e.g. a proxy-aware or extension fetch). */
  readonly fetch?: typeof fetch;
  /** Map raw console responses into view objects. Defaults pass through. */
  readonly mappers?: ConsoleResponseMappers;
}

const readArrayResponse = (value: unknown, resource: string): readonly unknown[] => {
  if (Array.isArray(value)) return value;
  if (
    value !== null &&
    typeof value === "object" &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: unknown[] }).data;
  }
  throw new TypeError(`Invalid LINE Developers Console ${resource} list response`);
};

const pageData = <A>(value: readonly A[] | { readonly data: readonly A[] }): readonly A[] =>
  Array.isArray(value) ? value : (value as { readonly data: readonly A[] }).data;

const NullableString = Schema.optional(Schema.NullOr(Schema.String));

const ConsoleProviderResponse = Schema.Struct({
  providerId: Schema.String,
  name: Schema.String,
  region: NullableString,
  certified: Schema.optional(Schema.NullOr(Schema.Boolean)),
  createdAt: NullableString,
});

const ConsoleChannelResponse = Schema.Struct({
  channelId: Schema.String,
  providerId: Schema.String,
  type: Schema.Literals(["messaging", "login", "miniApp", "blockchain"]),
  name: Schema.String,
  status: NullableString,
  botBasicId: NullableString,
  botUserId: NullableString,
  botDisplayName: NullableString,
  botPictureUrl: NullableString,
  addFriendUrl: NullableString,
  addFriendQrCodeUrl: NullableString,
  webhookUrl: NullableString,
  channelSecret: NullableString,
  channelAccessToken: NullableString,
  callbackUrl: NullableString,
  email: NullableString,
  iconUrl: NullableString,
  createdAt: NullableString,
});

const ConsoleLiffAppResponse = Schema.Struct({
  liffId: Schema.String,
  channelId: Schema.String,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: NullableString,
  permanentUrl: NullableString,
});

const decodeProviderResponse = Schema.decodeUnknownSync(ConsoleProviderResponse);
const decodeChannelResponse = Schema.decodeUnknownSync(ConsoleChannelResponse);
const decodeLiffAppResponse = Schema.decodeUnknownSync(ConsoleLiffAppResponse);

const validateResponse = <A>(
  resource: string,
  decode: (value: unknown) => A,
  value: unknown,
): A => {
  try {
    return decode(value);
  } catch {
    throw new TypeError(`Invalid LINE Developers Console ${resource} response`);
  }
};

/**
 * Builds a read-only {@link LineConsoleAdapter} over `fetch`.
 *
 * Use it from a context that can reach the console same-origin (a Manifest V3
 * extension with `host_permissions` for `developers.line.biz`, or a same-origin
 * proxy). Pass a custom `fetch` / `baseUrl` to adapt any environment.
 */
export const createLineConsoleAdapter = (
  options: LineConsoleAdapterOptions,
): LineConsoleAdapter => {
  const endpoints = options.endpoints;
  const doFetch = options.fetch ?? fetch.bind(globalThis);
  const mapProvider = options.mappers?.providers ?? ((raw: unknown) => raw);
  const mapChannel = options.mappers?.channel ?? ((raw: unknown) => raw);
  const mapLiff = options.mappers?.liffApp ?? ((raw: unknown) => raw);

  const request = async (url: string): Promise<unknown> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const response = await doFetch(url, { credentials: "include", headers });
    if (!response.ok) {
      throw new Error(`LINE Developers Console request failed: ${String(response.status)} ${url}`);
    }
    return response.json();
  };

  return {
    listProviders: async () =>
      readArrayResponse(await request(endpoints.providers), "provider").map((row) =>
        validateResponse("provider", decodeProviderResponse, mapProvider(row)),
      ),
    listChannels: async (providerId) =>
      readArrayResponse(await request(endpoints.channelsByProvider(providerId)), "channel").map(
        (row) => validateResponse("channel", decodeChannelResponse, mapChannel(row)),
      ),
    getChannel: async (channelId) =>
      validateResponse(
        "channel",
        decodeChannelResponse,
        mapChannel(await request(endpoints.channel(channelId))),
      ),
    listLiffApps: async (channelId) =>
      readArrayResponse(await request(endpoints.liffApps(channelId)), "LIFF app").map((row) =>
        validateResponse("LIFF app", decodeLiffAppResponse, mapLiff(row)),
      ),
  };
};

/** Convenience: build a {@link LineConsoleAdapter} from an in-memory dataset. */
export const createInMemoryConsoleAdapter = (dataset: {
  providers?: readonly ConsoleProviderView[];
  channels?: readonly ConsoleChannelView[];
  liffApps?: readonly ConsoleLiffAppView[];
}): LineConsoleAdapter => {
  const providers = dataset.providers ?? [];
  const channels = dataset.channels ?? [];
  const liffApps = dataset.liffApps ?? [];
  return {
    listProviders: async () => [...providers],
    listChannels: async (providerId) => channels.filter((c) => c.providerId === providerId),
    getChannel: async (channelId) => {
      const channel = channels.find((c) => c.channelId === channelId);
      if (channel === undefined) throw new Error(`Channel not found: ${channelId}`);
      return channel;
    },
    listLiffApps: async (channelId) => liffApps.filter((l) => l.channelId === channelId),
  };
};

/**
 * Adapts a {@link LineProviderManagementAdapter} (used by the headless management API)
 * into a {@link LineConsoleAdapter} (expected by `<line-developers-console>`).
 */
export const createLineConsoleAdapterFromProviderManagementAdapter = (
  adapter: LineProviderManagementAdapter,
): LineConsoleAdapter => {
  const mapProvider = (provider: ProviderView): ConsoleProviderView => ({
    providerId: provider.id,
    name: provider.name,
    createdAt: provider.createdAt.toISOString(),
  });

  const mapMessagingChannel = (channel: LineMessagingChannelView): ConsoleChannelView => ({
    channelId: channel.channelId,
    providerId: channel.providerId,
    type: "messaging",
    name: channel.name,
    status: channel.isActive ? "Active" : "Inactive",
    botBasicId: channel.botBasicId,
    botUserId: channel.botUserId,
    botDisplayName: channel.botDisplayName,
    botPictureUrl: channel.botPictureUrl,
    addFriendUrl: channel.addFriendUrl,
    addFriendQrCodeUrl: channel.addFriendQrCodeUrl,
    channelSecret: channel.channelSecret,
    channelAccessToken: channel.channelAccessToken,
    createdAt: channel.createdAt.toISOString(),
  });

  const mapLoginChannel = (channel: LineLoginChannelView): ConsoleChannelView => ({
    channelId: channel.channelId,
    providerId: channel.providerId,
    type: "login",
    name: channel.name,
    channelSecret: channel.channelSecret,
    createdAt: channel.createdAt.toISOString(),
  });

  const mapLiffApp = (app: LiffAppView): ConsoleLiffAppView => ({
    liffId: app.liffId,
    channelId: app.loginChannelId,
    view: app.view,
    additionalUrlParameters: app.additionalUrlParameters ?? "",
    description: app.description,
  });

  return {
    listProviders: async () => {
      const res = await adapter.listProviders();
      return pageData(res).map(mapProvider);
    },

    listChannels: async (providerId: string) => {
      const messagingRes = adapter.listMessagingChannels
        ? await adapter.listMessagingChannels({ providerId } as any)
        : [];
      const loginRes = adapter.listLoginChannels
        ? await adapter.listLoginChannels({ providerId } as any)
        : [];

      const messagingChannels = pageData(messagingRes).map(mapMessagingChannel);
      const loginChannels = pageData(loginRes).map(mapLoginChannel);

      const combined = [...messagingChannels, ...loginChannels];
      return combined.filter((c) => c.providerId === providerId);
    },

    getChannel: async (channelId: string) => {
      if (typeof adapter.getMessagingChannel === "function") {
        try {
          const c = await adapter.getMessagingChannel(channelId);
          if (c) return mapMessagingChannel(c);
        } catch {
          // ignore
        }
      }
      if (typeof adapter.getLoginChannel === "function") {
        try {
          const c = await adapter.getLoginChannel(channelId);
          if (c) return mapLoginChannel(c);
        } catch {
          // ignore
        }
      }

      const messagingRes = adapter.listMessagingChannels
        ? await adapter.listMessagingChannels()
        : [];
      const loginRes = adapter.listLoginChannels ? await adapter.listLoginChannels() : [];

      const messagingList = pageData(messagingRes);
      const loginList = pageData(loginRes);

      const foundMsg: any = messagingList.find(
        (c: any) => c.channelId === channelId || c.id === channelId,
      );
      if (foundMsg) return mapMessagingChannel(foundMsg);

      const foundLogin: any = loginList.find(
        (c: any) => c.channelId === channelId || c.id === channelId,
      );
      if (foundLogin) return mapLoginChannel(foundLogin);

      throw new Error(`Channel not found: ${channelId}`);
    },

    listLiffApps: async (channelId: string) => {
      const res = adapter.listLiffApps ? await adapter.listLiffApps({ channelId } as any) : [];
      const apps = pageData(res).map(mapLiffApp);
      return apps.filter((l) => l.channelId === channelId);
    },
  };
};
