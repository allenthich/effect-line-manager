import type {
  ConsoleChannelView,
  ConsoleLiffAppView,
  ConsoleProviderView,
  LineConsoleAdapter,
} from "../src/web/developers-console/index.ts";
import type {
  LiffAppView,
  LineAccountEntity,
  LineAccountFormSubmitDetail,
  LineLoginChannelView,
  LineMessagingChannelView,
  ProviderView,
  UpdateLiffAppInput,
  UpdateLineLoginChannelInput,
  UpdateLineMessagingChannelInput,
  UpdateProviderInput,
} from "../src/web/index.ts";
import { createLineAccountDemoData } from "./line-account-demo-data.ts";

export type DemoConsoleEditDetail =
  | { readonly kind: "provider"; readonly item: ConsoleProviderView }
  | { readonly kind: "channel"; readonly item: ConsoleChannelView }
  | { readonly kind: "liff"; readonly item: ConsoleLiffAppView };

export type DemoConsoleEditTarget =
  | { readonly type: "provider"; readonly item: ProviderView }
  | { readonly type: "messagingChannel"; readonly item: LineMessagingChannelView }
  | { readonly type: "loginChannel"; readonly item: LineLoginChannelView }
  | { readonly type: "liff"; readonly item: LiffAppView };

export interface DemoConsoleEditor {
  readonly adapter: LineConsoleAdapter;
  readonly providers: readonly ProviderView[];
  readonly loginChannels: readonly LineLoginChannelView[];
  readonly resolveEdit: (detail: DemoConsoleEditDetail) => DemoConsoleEditTarget;
  readonly update: (
    target: DemoConsoleEditTarget,
    detail: LineAccountFormSubmitDetail,
  ) => LineAccountEntity;
}

const toConsoleProvider = (provider: ProviderView): ConsoleProviderView => ({
  providerId: provider.id,
  name: provider.name,
  createdAt: provider.createdAt.toISOString(),
});

const toConsoleMessagingChannel = (channel: LineMessagingChannelView): ConsoleChannelView => ({
  providerId: channel.providerId,
  channelId: channel.channelId,
  type: "messaging",
  name: channel.name,
  status: channel.isActive ? "Active" : "Inactive",
  botDisplayName: channel.botDisplayName,
  botUserId: channel.botUserId,
  botBasicId: channel.botBasicId,
  botPictureUrl: channel.botPictureUrl,
  addFriendUrl: channel.addFriendUrl,
  addFriendQrCodeUrl: channel.addFriendQrCodeUrl,
  channelSecret: channel.channelSecret,
  channelAccessToken: channel.channelAccessToken,
  createdAt: channel.createdAt.toISOString(),
});

const toConsoleLoginChannel = (channel: LineLoginChannelView): ConsoleChannelView => ({
  providerId: channel.providerId,
  channelId: channel.channelId,
  type: "login",
  name: channel.name,
  status: "Published",
  channelSecret: channel.channelSecret,
  createdAt: channel.createdAt.toISOString(),
});

const toConsoleLiff = (liff: LiffAppView): ConsoleLiffAppView => ({
  channelId: liff.loginChannelId,
  liffId: liff.liffId,
  view: liff.view,
  additionalUrlParameters: liff.additionalUrlParameters,
  description: liff.description,
  permanentUrl: `https://liff.line.me/${liff.liffId}`,
});

const missingItem = (kind: string, id: string): never => {
  throw new Error(`Missing ${kind} demo item: ${id}`);
};

/** Creates a demo-only mutable controller around the public read-only console adapter. */
export const createDemoConsoleEditor = (): DemoConsoleEditor => {
  const data = createLineAccountDemoData();

  const channels = (): readonly ConsoleChannelView[] => [
    ...data.messagingChannels.map(toConsoleMessagingChannel),
    ...data.loginChannels.map(toConsoleLoginChannel),
  ];

  const adapter: LineConsoleAdapter = {
    listProviders: async () => data.providers.map(toConsoleProvider),
    listChannels: async (providerId) =>
      channels().filter((channel) => channel.providerId === providerId),
    getChannel: async (channelId) =>
      channels().find((channel) => channel.channelId === channelId) ??
      missingItem("channel", channelId),
    listLiffApps: async (channelId) =>
      data.liffApps.filter((liff) => liff.loginChannelId === channelId).map(toConsoleLiff),
  };

  const resolveEdit = (detail: DemoConsoleEditDetail): DemoConsoleEditTarget => {
    if (detail.kind === "provider") {
      const item = data.providers.find(({ id }) => id === detail.item.providerId);
      return { type: "provider", item: item ?? missingItem("provider", detail.item.providerId) };
    }
    if (detail.kind === "liff") {
      const item = data.liffApps.find(({ liffId }) => liffId === detail.item.liffId);
      return { type: "liff", item: item ?? missingItem("LIFF", detail.item.liffId) };
    }
    if (detail.item.type === "messaging") {
      const item = data.messagingChannels.find(
        ({ channelId }) => channelId === detail.item.channelId,
      );
      return {
        type: "messagingChannel",
        item: item ?? missingItem("messaging channel", detail.item.channelId),
      };
    }
    if (detail.item.type === "login") {
      const item = data.loginChannels.find(({ channelId }) => channelId === detail.item.channelId);
      return {
        type: "loginChannel",
        item: item ?? missingItem("login channel", detail.item.channelId),
      };
    }
    return missingItem("editable channel", detail.item.channelId);
  };

  const update = (
    target: DemoConsoleEditTarget,
    detail: LineAccountFormSubmitDetail,
  ): LineAccountEntity => {
    if (detail.mode !== "edit" || detail.type !== target.type) {
      throw new Error("The submitted editor does not match the selected demo item.");
    }

    const updatedAt = new Date();
    switch (detail.type) {
      case "provider": {
        if (target.type !== "provider") throw new Error("Expected a provider edit target.");
        const input = detail.input as UpdateProviderInput;
        const updated = { ...target.item, ...input, updatedAt };
        data.providers = data.providers.map((item) =>
          item.id === target.item.id ? updated : item,
        );
        return updated;
      }
      case "messagingChannel": {
        if (target.type !== "messagingChannel") {
          throw new Error("Expected a messaging channel edit target.");
        }
        const input = detail.input as UpdateLineMessagingChannelInput;
        const updated = { ...target.item, ...input, updatedAt };
        data.messagingChannels = data.messagingChannels.map((item) =>
          item.id === target.item.id ? updated : item,
        );
        return updated;
      }
      case "loginChannel": {
        if (target.type !== "loginChannel") {
          throw new Error("Expected a login channel edit target.");
        }
        const input = detail.input as UpdateLineLoginChannelInput;
        const updated = { ...target.item, ...input, updatedAt };
        data.loginChannels = data.loginChannels.map((item) =>
          item.id === target.item.id ? updated : item,
        );
        return updated;
      }
      case "liff": {
        if (target.type !== "liff") throw new Error("Expected a LIFF edit target.");
        const input = detail.input as UpdateLiffAppInput;
        const updated = {
          ...target.item,
          ...input,
          view: input.view ?? target.item.view,
          updatedAt,
        };
        data.liffApps = data.liffApps.map((item) => (item.id === target.item.id ? updated : item));
        return updated;
      }
    }
  };

  return {
    adapter,
    get providers() {
      return data.providers;
    },
    get loginChannels() {
      return data.loginChannels;
    },
    resolveEdit,
    update,
  };
};

/** Shared in-memory adapter for developers-console demo pages that do not edit. */
export const createDemoConsoleAdapter = (): LineConsoleAdapter => createDemoConsoleEditor().adapter;
