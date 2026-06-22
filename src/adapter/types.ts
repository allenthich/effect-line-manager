import type {
  CreateProviderInput,
  UpdateProviderInput,
  ProviderListPage,
  ProviderView,
  ListProvidersQuery,
} from "../provider/domain.ts";
import type {
  CreateLineMessagingChannelInput,
  UpdateLineMessagingChannelInput,
  CreateLineLoginChannelInput,
  UpdateLineLoginChannelInput,
  ListLineMessagingChannelsQuery,
  ListLineLoginChannelsQuery,
  LineMessagingChannelView,
  LineLoginChannelView,
  LineMessagingChannelListPage,
  LineLoginChannelListPage,
} from "../channels/management-domain.ts";
import type {
  CreateLiffAppInput,
  UpdateLiffAppInput,
  LiffAppListPage,
  LiffAppView,
  ListLiffAppsQuery,
} from "../liff/domain.ts";

/**
 * Hierarchical management adapter — used by Web/UI components to talk to HTTP
 * API clients or memory adapters.
 *
 * Aggregate-specific channel operations (`listMessagingChannels`,
 * `createLoginChannel`, etc.) are the provided surface. There is no
 * combined "channel" facade; consumers that need both aggregates should
 * call the per-aggregate methods explicitly.
 */
export interface LineProviderManagementAdapter {
  readonly listProviders: (query?: ListProvidersQuery) => Promise<ProviderListPage>;
  readonly createProvider: (input: CreateProviderInput) => Promise<ProviderView>;
  readonly updateProvider: (id: string, input: UpdateProviderInput) => Promise<ProviderView>;
  readonly deleteProvider: (id: string) => Promise<void>;

  // Messaging channels (aggregate-specific surface).
  readonly listMessagingChannels: (
    query?: ListLineMessagingChannelsQuery,
  ) => Promise<LineMessagingChannelListPage>;
  readonly getMessagingChannel: (id: string) => Promise<LineMessagingChannelView>;
  readonly createMessagingChannel: (
    input: CreateLineMessagingChannelInput,
  ) => Promise<LineMessagingChannelView>;
  readonly updateMessagingChannel: (
    id: string,
    input: UpdateLineMessagingChannelInput,
  ) => Promise<LineMessagingChannelView>;
  readonly deleteMessagingChannel: (id: string) => Promise<void>;
  readonly syncMessagingChannel?: (id: string) => Promise<LineMessagingChannelView>;

  // Login channels (aggregate-specific surface).
  readonly listLoginChannels: (
    query?: ListLineLoginChannelsQuery,
  ) => Promise<LineLoginChannelListPage>;
  readonly getLoginChannel: (id: string) => Promise<LineLoginChannelView>;
  readonly createLoginChannel: (
    input: CreateLineLoginChannelInput,
  ) => Promise<LineLoginChannelView>;
  readonly updateLoginChannel: (
    id: string,
    input: UpdateLineLoginChannelInput,
  ) => Promise<LineLoginChannelView>;
  readonly deleteLoginChannel: (id: string) => Promise<void>;

  readonly listLiffApps: (query?: ListLiffAppsQuery) => Promise<LiffAppListPage>;
  readonly getLiffApp: (id: string) => Promise<LiffAppView>;
  readonly createLiffApp: (input: CreateLiffAppInput) => Promise<LiffAppView>;
  readonly updateLiffApp: (id: string, input: UpdateLiffAppInput) => Promise<LiffAppView>;
  readonly deleteLiffApp: (id: string) => Promise<void>;
}
