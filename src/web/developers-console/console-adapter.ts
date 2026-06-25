import type {
  ConsoleChannelView,
  ConsoleLiffAppView,
  ConsoleProviderView,
  LineConsoleAdapter,
  ConsoleResponseMappers,
} from "./types.ts";

/**
 * Default endpoints for the LINE Developers Console internal REST API.
 *
 * These paths are undocumented and modelled from the console's documented
 * structure; override them via {@link LineConsoleAdapterOptions.endpoints} to
 * match a captured session, or point {@link LineConsoleAdapterOptions.baseUrl}
 * at a same-origin backend proxy.
 */
export interface ConsoleEndpoints {
  readonly providers: string;
  readonly channelsByProvider: (providerId: string) => string;
  readonly channel: (channelId: string) => string;
  readonly liffApps: (channelId: string) => string;
}

const defaultBase = "https://developers.line.biz";

const defaultEndpoints = (base: string): ConsoleEndpoints => ({
  providers: `${base}/api/console/providers`,
  channelsByProvider: (providerId) =>
    `${base}/api/console/providers/${encodeURIComponent(providerId)}/channels`,
  channel: (channelId) => `${base}/api/console/channels/${encodeURIComponent(channelId)}`,
  liffApps: (channelId) =>
    `${base}/api/console/channels/${encodeURIComponent(channelId)}/liff-apps`,
});

/** Options for {@link createLineConsoleAdapter}. */
export interface LineConsoleAdapterOptions {
  /**
   * Base URL for console requests. Defaults to the real developers console.
   * Set this to a proxy origin to work around same-origin cookie / CORS.
   */
  readonly baseUrl?: string;
  /**
   * Value of the `Cookie` header to send. In a browser extension with host
   * permissions, omit this and rely on credentials being attached
   * automatically; for a backend proxy you may set it explicitly.
   */
  readonly cookie?: string;
  /** Custom fetch implementation (e.g. a proxy-aware or extension fetch). */
  readonly fetch?: typeof fetch;
  /** Endpoint overrides; a base URL is applied for you. */
  readonly endpoints?: Partial<ConsoleEndpoints>;
  /** Map raw console responses into view objects. Defaults pass through. */
  readonly mappers?: ConsoleResponseMappers;
}

const asArray = (value: unknown): readonly unknown[] => {
  if (Array.isArray(value)) return value;
  if (
    value !== null &&
    typeof value === "object" &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: unknown[] }).data;
  }
  return [];
};

/**
 * Builds a read-only {@link LineConsoleAdapter} over `fetch`.
 *
 * Use it from a context that can reach the console same-origin (a Manifest V3
 * extension with `host_permissions` for `developers.line.biz`, or a same-origin
 * proxy). Pass a custom `fetch` / `baseUrl` to adapt any environment.
 */
export const createLineConsoleAdapter = (
  options: LineConsoleAdapterOptions = {},
): LineConsoleAdapter => {
  const baseUrl = options.baseUrl ?? defaultBase;
  const baseEndpoints = defaultEndpoints(baseUrl);
  const endpoints: ConsoleEndpoints = {
    providers: options.endpoints?.providers ?? baseEndpoints.providers,
    channelsByProvider: options.endpoints?.channelsByProvider ?? baseEndpoints.channelsByProvider,
    channel: options.endpoints?.channel ?? baseEndpoints.channel,
    liffApps: options.endpoints?.liffApps ?? baseEndpoints.liffApps,
  };
  const doFetch = options.fetch ?? fetch.bind(globalThis);
  const cookie = options.cookie;
  const mapProvider: (raw: unknown) => ConsoleProviderView =
    options.mappers?.providers ?? ((raw) => raw as ConsoleProviderView);
  const mapChannel: (raw: unknown) => ConsoleChannelView =
    options.mappers?.channel ?? ((raw) => raw as ConsoleChannelView);
  const mapLiff: (raw: unknown) => ConsoleLiffAppView =
    options.mappers?.liffApp ?? ((raw) => raw as ConsoleLiffAppView);

  const request = async <T>(url: string): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cookie !== undefined && cookie.length > 0) headers.Cookie = cookie;
    const response = await doFetch(url, { credentials: "include", headers });
    if (!response.ok) {
      throw new Error(`LINE Developers Console request failed: ${String(response.status)} ${url}`);
    }
    return (await response.json()) as T;
  };

  return {
    listProviders: async () =>
      asArray(await request<unknown>(endpoints.providers)).map((row) => mapProvider(row)),
    listChannels: async (providerId) =>
      asArray(await request<unknown>(endpoints.channelsByProvider(providerId))).map((row) =>
        mapChannel(row),
      ),
    getChannel: async (channelId) =>
      mapChannel(await request<unknown>(endpoints.channel(channelId))),
    listLiffApps: async (channelId) =>
      asArray(await request<unknown>(endpoints.liffApps(channelId))).map((row) => mapLiff(row)),
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
