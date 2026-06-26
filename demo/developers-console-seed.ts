import {
  type ConsoleChannelView,
  type ConsoleLiffAppView,
  type ConsoleProviderView,
  createInMemoryConsoleAdapter,
  type LineConsoleAdapter,
} from "../src/web/developers-console/index.ts";

const providers: readonly ConsoleProviderView[] = [
  {
    providerId: "1234567890",
    name: "Beverage Manufacturer A",
    region: "jp",
    certified: false,
    createdAt: "2026-06-01",
  },
  {
    providerId: "9876543210",
    name: "Cony Tea",
    region: "jp",
    certified: false,
    createdAt: "2026-06-08",
  },
];

const channels: readonly ConsoleChannelView[] = [
  {
    providerId: "1234567890",
    channelId: "2001043291",
    type: "messaging",
    name: "Brown Coffee",
    status: "Active",
    botBasicId: "@brown-coffee",
    botUserId: "U1234567890abcdef",
    webhookUrl: "https://example.com/webhook",
    channelSecret: "secret-1234",
    channelAccessToken: "token-5678",
  },
  {
    providerId: "1234567890",
    channelId: "2001043310",
    type: "login",
    name: "Brown Coffee",
    status: "Published",
    channelSecret: "secret-9abc",
    callbackUrl: "https://example.com/callback",
  },
];

const liffApps: readonly ConsoleLiffAppView[] = [
  {
    channelId: "2001043310",
    liffId: "2001043310-AbCdEf12",
    view: { type: "tall", url: "https://example.com/liff" },
    description: "Loyalty card dashboard",
    permanentUrl: "https://liff.line.me/2001043310-AbCdEf12",
  },
];

/** Shared in-memory adapter for the developers-console demo pages. */
export const createDemoConsoleAdapter = (): LineConsoleAdapter =>
  createInMemoryConsoleAdapter({ providers, channels, liffApps });
