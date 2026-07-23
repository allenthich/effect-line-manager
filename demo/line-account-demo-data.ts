import { Schema } from "effect";
import { LineLoginChannelId } from "../src/shared/domain.ts";
import type {
  LiffAppView,
  LineLoginChannelView,
  LineMessagingChannelView,
  ProviderView,
} from "../src/web/index.ts";

/** Canonical sample account shared by the management and developers-console demos. */
export interface LineAccountDemoData {
  providers: ProviderView[];
  messagingChannels: LineMessagingChannelView[];
  loginChannels: LineLoginChannelView[];
  liffApps: LiffAppView[];
}

/** Creates fresh mutable demo data so each page session owns its edits. */
export const createLineAccountDemoData = (): LineAccountDemoData => {
  const createdAt = new Date("2026-06-01T00:00:00.000Z");
  const updatedAt = new Date("2026-06-10T00:00:00.000Z");
  const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("2001043310");

  return {
    providers: [
      {
        id: "demo-provider-1",
        name: "LINE Marketing",
        createdAt,
        updatedAt,
      },
    ],
    messagingChannels: [
      {
        id: "demo-channel-1",
        providerId: "demo-provider-1",
        channelType: "messaging",
        name: "Customer Support",
        botDisplayName: "LINE Support",
        channelId: "2001043291",
        botUserId: "U1234567890",
        botBasicId: "@line-support",
        botPictureUrl: null,
        addFriendUrl: null,
        addFriendQrCodeUrl: null,
        isActive: true,
        channelSecret: "channel-secret",
        channelAccessToken: "channel-token",
        createdAt,
        updatedAt,
      },
    ],
    loginChannels: [
      {
        id: "demo-channel-2",
        providerId: "demo-provider-1",
        channelType: "login",
        name: "Customer Auth Portal",
        channelId: "2001043310",
        channelSecret: "channel-secret",
        createdAt,
        updatedAt,
      },
    ],
    liffApps: [
      {
        id: "demo-liff-1",
        loginChannelId,
        liffId: "2001043291-AbCdEf12",
        view: {
          type: "tall",
          url: "https://example.com/liff",
        },
        additionalUrlParameters: "campaign=spring&source=poster",
        description: "Loyalty card dashboard for customers.",
        createdAt,
        updatedAt,
      },
    ],
  };
};
