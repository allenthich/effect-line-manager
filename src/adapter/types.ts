import type {
  CreateProviderInput,
  UpdateProviderInput,
  ProviderListPage,
  ProviderView,
} from "../provider/domain.ts";
import type {
  CreateChannelInput,
  UpdateChannelInput,
  ChannelListPage,
  ChannelView,
} from "../channel/domain.ts";
import type {
  CreateLiffAppInput,
  UpdateLiffAppInput,
  LiffAppListPage,
  LiffAppView,
} from "../liff/domain.ts";

/** Hierarchical management adapter — used by Web/UI components to talk to HTTP API clients or memory adapters. */
export interface LineProviderManagementAdapter {
  readonly listProviders: () => Promise<ProviderListPage>;
  readonly createProvider: (input: CreateProviderInput) => Promise<ProviderView>;
  readonly updateProvider: (id: string, input: UpdateProviderInput) => Promise<ProviderView>;
  readonly deleteProvider: (id: string) => Promise<void>;
  readonly listChannels: (providerId?: string) => Promise<ChannelListPage>;
  readonly getChannel: (id: string) => Promise<ChannelView>;
  readonly createChannel: (input: CreateChannelInput) => Promise<ChannelView>;
  readonly updateChannel: (id: string, input: UpdateChannelInput) => Promise<ChannelView>;
  readonly deleteChannel: (id: string) => Promise<void>;
  readonly listLiffApps: (channelId?: string) => Promise<LiffAppListPage>;
  readonly getLiffApp: (id: string) => Promise<LiffAppView>;
  readonly createLiffApp: (input: CreateLiffAppInput) => Promise<LiffAppView>;
  readonly updateLiffApp: (id: string, input: UpdateLiffAppInput) => Promise<LiffAppView>;
  readonly deleteLiffApp: (id: string) => Promise<void>;
  readonly syncChannel?: (id: string) => Promise<ChannelView>;
}
