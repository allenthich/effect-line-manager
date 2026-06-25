/**
 * Data model for the LINE Developers Console wrapper web components.
 *
 * These view types mirror the hierarchy exposed by the LINE Developers
 * Console (https://developers.line.biz/console/): providers → channels →
 * LIFF apps. They are intentionally plain (transport-shaped) so a cookie /
 * proxy adapter can populate them without an Effect schema round-trip.
 *
 * The wrapper is read-only: it surfaces console data at a glance. Mutating
 * operations stay in the real console (reached via deep-links from the UI).
 */

/** Discriminator for the kind of channel shown on the console. */
export type ConsoleChannelType = "messaging" | "login" | "miniApp" | "blockchain";

/** View of a provider row (top level of the console hierarchy). */
export interface ConsoleProviderView {
  readonly providerId: string;
  readonly name: string;
  readonly region?: string | null;
  readonly certified?: boolean | null;
  readonly createdAt?: string | null;
}

/** View of a channel row, discriminated by `type`. */
export interface ConsoleChannelView {
  readonly channelId: string;
  readonly providerId: string;
  readonly type: ConsoleChannelType;
  readonly name: string;
  /** Free-form status label ("Active", "Published", "Developing", …). */
  readonly status?: string | null;

  // Messaging API
  readonly botBasicId?: string | null;
  readonly botUserId?: string | null;
  readonly webhookUrl?: string | null;
  readonly channelSecret?: string | null;
  readonly channelAccessToken?: string | null;

  // LINE Login
  readonly callbackUrl?: string | null;

  // Common
  readonly email?: string | null;
  readonly iconUrl?: string | null;
  readonly createdAt?: string | null;
}

/** LIFF app size, matching the LIFF platform contract. */
export type ConsoleLiffViewType = "compact" | "tall" | "full";

/** View of a LIFF application nested under a LINE Login channel. */
export interface ConsoleLiffAppView {
  readonly liffId: string;
  readonly channelId: string;
  readonly view: { readonly type: ConsoleLiffViewType; readonly url: string };
  readonly description?: string | null;
  readonly permanentUrl?: string | null;
}

/**
 * Read-only console data adapter used by the web components.
 *
 * Implementations call the LINE Developers Console's internal REST API (or a
 * same-origin proxy that forwards the developer's session cookie). All methods
 * are async so the same interface backs both network and mock adapters.
 */
export interface LineConsoleAdapter {
  readonly listProviders: () => Promise<readonly ConsoleProviderView[]>;
  readonly listChannels: (providerId: string) => Promise<readonly ConsoleChannelView[]>;
  readonly getChannel: (channelId: string) => Promise<ConsoleChannelView>;
  readonly listLiffApps: (channelId: string) => Promise<readonly ConsoleLiffAppView[]>;
}

/** Hook for mapping a raw console response into view objects. */
export interface ConsoleResponseMappers {
  readonly providers?: (raw: unknown) => ConsoleProviderView;
  readonly channel?: (raw: unknown) => ConsoleChannelView;
  readonly liffApp?: (raw: unknown) => ConsoleLiffAppView;
}

/** Error emitted by the component when an adapter call fails. */
export interface LineDevelopersConsoleErrorDetail {
  readonly operation: "listProviders" | "listChannels" | "getChannel" | "listLiffApps";
  readonly providerId?: string;
  readonly channelId?: string;
  readonly error: unknown;
}
