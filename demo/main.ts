import { Schema } from "effect";
import { createInMemoryLineAccountAdapter } from "./in-memory-line-account-adapter.ts";
import {
  defineLineAccountManagementElements,
  type LineAccountManagement,
  type ProviderView,
  type LineMessagingChannelView,
  type LineLoginChannelView,
  type LiffAppView,
} from "../src/web/index.ts";
import { LineLoginChannelId } from "../src/shared/domain.ts";

const createdAt = new Date("2026-06-01T00:00:00.000Z");
const updatedAt = new Date("2026-06-10T00:00:00.000Z");
const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("2001043310");

const seedProviders: ProviderView[] = [
  {
    id: "demo-provider-1",
    name: "LINE Marketing",
    createdAt,
    updatedAt,
  },
];

const seedMessagingChannels: LineMessagingChannelView[] = [
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
];

const seedLoginChannels: LineLoginChannelView[] = [
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
];

const seedLiffApps: LiffAppView[] = [
  {
    id: "demo-liff-1",
    loginChannelId,
    liffId: "2001043291-AbCdEf12",
    view: {
      type: "tall",
      url: "https://example.com/liff",
    },
    description: "Loyalty card dashboard for customers.",
    createdAt,
    updatedAt,
  },
];

defineLineAccountManagementElements();

const page = document.querySelector<LineAccountManagement>("#line-accounts");
const status = document.querySelector<HTMLElement>("#demo-status");

if (page === null) throw new Error("Missing line-account-management demo element");

page.adapter = createInMemoryLineAccountAdapter(
  seedProviders,
  seedMessagingChannels,
  seedLoginChannels,
  seedLiffApps,
);

const announce = (message: string): void => {
  if (status !== null) status.textContent = message;
};

const displayName = (item: any, type: string): string => {
  if (type === "provider" || type === "messagingChannel" || type === "loginChannel") {
    return item.name as string;
  }
  return item.liffId as string;
};

page.addEventListener("line-account-created", (event) => {
  const { item, type } = (event as CustomEvent<{ item: any; type: string }>).detail;
  announce(`Created ${type}: ${displayName(item, type)}.`);
});

page.addEventListener("line-account-updated", (event) => {
  const { item, type } = (event as CustomEvent<{ item: any; type: string }>).detail;
  announce(`Updated ${type}: ${displayName(item, type)}.`);
});

page.addEventListener("line-account-deleted", (event) => {
  const { id, type } = (event as CustomEvent<{ id: string; type: string }>).detail;
  announce(`Deleted ${type}: ${id}.`);
});

page.addEventListener("line-account-error", (event) => {
  const { operation } = (event as CustomEvent<{ operation: string }>).detail;
  announce(`The demo ${operation} operation failed.`);
});

// Theme toggle logic
const themeToggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
if (themeToggle) {
  const savedTheme = localStorage.getItem("theme");
  if (
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.body.classList.add("dark-mode");
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}
