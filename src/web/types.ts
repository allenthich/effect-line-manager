import type { LineProviderManagementAdapter } from "../adapter/types.ts";
import type {
  ProviderView,
  CreateProviderInput,
  UpdateProviderInput,
  ProviderListPage,
} from "../provider/domain.ts";
import type {
  ChannelView,
  CreateChannelInput,
  UpdateChannelInput,
  ChannelListPage,
} from "../channel/domain.ts";
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
  ChannelView,
  LiffAppView,
  CreateProviderInput,
  UpdateProviderInput,
  CreateChannelInput,
  UpdateChannelInput,
  CreateLiffAppInput,
  UpdateLiffAppInput,
  ProviderListPage,
  ChannelListPage,
  LiffAppListPage,
};

/** Form operation mode: "create" for new entities or "edit" for existing ones. */
export type LineAccountFormMode = "create" | "edit";

/** Entity type identifier used to discriminate between provider, channel, and LIFF app throughout the UI. */
export type LineAccountFormType = "provider" | "channel" | "liff";

/** All LINE account CRUD operations tracked for error reporting. */
export type LineAccountOperation =
  | "listProviders"
  | "createProvider"
  | "updateProvider"
  | "deleteProvider"
  | "listChannels"
  | "getChannel"
  | "createChannel"
  | "updateChannel"
  | "deleteChannel"
  | "listLiffApps"
  | "getLiffApp"
  | "createLiffApp"
  | "updateLiffApp"
  | "deleteLiffApp"
  | "syncChannel";

/** Custom event detail payload for select/edit/delete requests emitted by card components. */
export interface LineAccountRequestDetail {
  readonly type: LineAccountFormType;
  readonly item: ProviderView | ChannelView | LiffAppView;
}

/** Custom event detail payload for form submission, discriminated by entity type. */
export type LineAccountFormSubmitDetail =
  | {
      readonly type: "provider";
      readonly mode: LineAccountFormMode;
      readonly input: CreateProviderInput | UpdateProviderInput;
    }
  | {
      readonly type: "channel";
      readonly mode: LineAccountFormMode;
      readonly input: CreateChannelInput | UpdateChannelInput;
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
