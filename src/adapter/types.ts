import type {
  CreateProviderInput,
  UpdateProviderInput,
  ProviderListPage,
  ProviderView,
  ListProvidersQuery,
} from "../provider/domain.ts";
import type { CreateChannelInput, UpdateChannelInput, ListChannelsQuery } from "./compat.ts";
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
  ChannelView,
  ChannelListPage,
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
 * `createLoginChannel`, etc.) are the preferred surface going forward. The
 * generic `listChannels`/`getChannel`/etc. methods are retained as
 * compatibility shims that combine the two aggregates for UIs that present
 * a unified channel list.
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

  // Combined-channel compatibility shims (deprecated; use aggregate-specific methods).
  readonly listChannels: (query?: ListChannelsQuery) => Promise<ChannelListPage>;
  readonly getChannel: (id: string) => Promise<ChannelView>;
  readonly createChannel: (input: CreateChannelInput) => Promise<ChannelView>;
  readonly updateChannel: (id: string, input: UpdateChannelInput) => Promise<ChannelView>;
  readonly deleteChannel: (id: string) => Promise<void>;
  readonly syncChannel?: (id: string) => Promise<ChannelView>;

  readonly listLiffApps: (query?: ListLiffAppsQuery) => Promise<LiffAppListPage>;
  readonly getLiffApp: (id: string) => Promise<LiffAppView>;
  readonly createLiffApp: (input: CreateLiffAppInput) => Promise<LiffAppView>;
  readonly updateLiffApp: (id: string, input: UpdateLiffAppInput) => Promise<LiffAppView>;
  readonly deleteLiffApp: (id: string) => Promise<void>;
}
