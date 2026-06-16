import type {
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
} from "../account/domain.ts";

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

export type LineAccountFormMode = "create" | "edit";

export type LineAccountFormType = "provider" | "channel" | "liff";

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
  | "deleteLiffApp";

export interface LineAccountRequestDetail {
  readonly type: LineAccountFormType;
  readonly item: ProviderView | ChannelView | LiffAppView;
}

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

export interface LineAccountErrorEventDetail {
  readonly operation: LineAccountOperation;
  readonly error: unknown;
}
