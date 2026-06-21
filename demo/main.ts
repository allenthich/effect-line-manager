import { Schema } from "effect";
import { createInMemoryLineAccountAdapter } from "./in-memory-line-account-adapter.ts";
import {
  defineLineAccountManagementElements,
  type LineAccountManagement,
  type ProviderView,
  type ChannelView,
  type LiffAppView,
} from "../src/web/index.ts";
import { LineLoginChannelId } from "../src/channel/domain.ts";

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

const seedChannels: ChannelView[] = [
  {
    id: "demo-channel-1",
    providerId: "demo-provider-1",
    channelType: "messaging",
    name: "Customer Support",
    displayName: "LINE Support",
    channelId: "2001043291",
    botUserId: "U1234567890",
    basicId: "@line-support",
    pictureUrl: null,
    isActive: true,
    channelSecret: "channel-secret",
    channelAccessToken: "channel-token",
    createdAt,
    updatedAt,
  },
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

page.adapter = createInMemoryLineAccountAdapter(seedProviders, seedChannels, seedLiffApps);

const announce = (message: string): void => {
  if (status !== null) status.textContent = message;
};

page.addEventListener("line-account-created", (event) => {
  const { item, type } = (event as CustomEvent<{ item: any; type: string }>).detail;
  const name = type === "provider" || type === "channel" ? item.name : item.liffId;
  announce(`Created ${type}: ${name}.`);
});

page.addEventListener("line-account-updated", (event) => {
  const { item, type } = (event as CustomEvent<{ item: any; type: string }>).detail;
  const name = type === "provider" || type === "channel" ? item.name : item.liffId;
  announce(`Updated ${type}: ${name}.`);
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
