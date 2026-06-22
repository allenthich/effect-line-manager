import type { LineProviderManagementAdapter } from "../adapter/types.ts";
import type {
  ProviderView,
  CreateProviderInput,
  UpdateProviderInput,
  ProviderListPage,
} from "../provider/domain.ts";
import type {
  LineMessagingChannelView,
  LineLoginChannelView,
  CreateLineMessagingChannelInput,
  UpdateLineMessagingChannelInput,
  CreateLineLoginChannelInput,
  UpdateLineLoginChannelInput,
  LineMessagingChannelListPage,
  LineLoginChannelListPage,
} from "../channels/management-domain.ts";
import type {
  LiffAppView,
  CreateLiffAppInput,
  UpdateLiffAppInput,
  LiffAppListPage,
} from "../liff/domain.ts";

/** Re-export commonly used domain types for web component consumers. */
export type {
  LineProviderManagementAdapter,
  ProviderView,
  LiffAppView,
  LineMessagingChannelView,
  LineLoginChannelView,
  CreateProviderInput,
  UpdateProviderInput,
  CreateLineMessagingChannelInput,
  UpdateLineMessagingChannelInput,
  CreateLineLoginChannelInput,
  UpdateLineLoginChannelInput,
  CreateLiffAppInput,
  UpdateLiffAppInput,
  ProviderListPage,
  LineMessagingChannelListPage,
  LineLoginChannelListPage,
  LiffAppListPage,
};

/** Form operation mode: "create" for new entities or "edit" for existing ones. */
export type LineAccountFormMode = "create" | "edit";

/**
 * Entity type identifier used to discriminate between provider, messaging
 * channel, login channel, and LIFF app throughout the UI.
 */
export type LineAccountFormType = "provider" | "messagingChannel" | "loginChannel" | "liff";

/**
 * Local union of channel views used when a single leaf component must accept
 * either kind (e.g. breadcrumbs resolving a parent by id). Internal to the
 * `web` subpath — Slice 7 excludes this from `web/index.ts`'s public
 * re-export so consumers use the per-aggregate view types directly.
 */
export type ChannelView = LineMessagingChannelView | LineLoginChannelView;

/**
 * Union of all entity item shapes that the orchestrator and leaf components
 * pass around as the currently-selected item.
 */
export type LineAccountEntity =
  | ProviderView
  | LineMessagingChannelView
  | LineLoginChannelView
  | LiffAppView;

/**
 * All LINE account CRUD operations tracked for error reporting. The operation
 * is a public observable contract emitted via `line-account-error` events.
 */
export type LineAccountOperation =
  // Providers
  | "listProviders"
  | "createProvider"
  | "updateProvider"
  | "deleteProvider"
  // Messaging channels
  | "listMessagingChannels"
  | "getMessagingChannel"
  | "createMessagingChannel"
  | "updateMessagingChannel"
  | "deleteMessagingChannel"
  | "syncMessagingChannel"
  // Login channels
  | "listLoginChannels"
  | "getLoginChannel"
  | "createLoginChannel"
  | "updateLoginChannel"
  | "deleteLoginChannel"
  // LIFF apps
  | "listLiffApps"
  | "getLiffApp"
  | "createLiffApp"
  | "updateLiffApp"
  | "deleteLiffApp";

/** Custom event detail payload for select/edit/delete requests emitted by card components. */
export interface LineAccountRequestDetail {
  readonly type: LineAccountFormType;
  readonly item: LineAccountEntity;
}

/** Custom event detail payload for form submission, discriminated by entity type. */
export type LineAccountFormSubmitDetail =
  | {
      readonly type: "provider";
      readonly mode: LineAccountFormMode;
      readonly input: CreateProviderInput | UpdateProviderInput;
    }
  | {
      readonly type: "messagingChannel";
      readonly mode: LineAccountFormMode;
      readonly input: CreateLineMessagingChannelInput | UpdateLineMessagingChannelInput;
    }
  | {
      readonly type: "loginChannel";
      readonly mode: LineAccountFormMode;
      readonly input: CreateLineLoginChannelInput | UpdateLineLoginChannelInput;
    }
  | {
      readonly type: "liff";
      readonly mode: LineAccountFormMode;
      readonly input: CreateLiffAppInput | UpdateLiffAppInput;
    };

/** Custom event detail payload for error events with the operation name and error value. */
export interface LineAccountErrorEventDetail {
  readonly operation: LineAccountOperation;
  readonly error: unknown;
}
