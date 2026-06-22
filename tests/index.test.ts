import { expect, test } from "vite-plus/test";
import {
  LiffAppView,
  LineApiAuthenticationError,
  LineApiRateLimitError,
  LineApiResponseError,
  LineApiTimeoutError,
  LineClientRegistry,
  LineLiffApps,
  LineLoginApiAuthenticationError,
  LineLoginApiRateLimitError,
  LineLoginApiResponseError,
  LineLoginApiTimeoutError,
  LineLoginChannels,
  LineMessages,
  LineMessagingChannels,
  LineProviders,
  LineSignatureError,
  LineTextMessage,
  ProviderView,
  makeLineApiClient,
  makeLineLiffClient,
  makeLineLoginClient,
  verifyLineSignature,
  verifyLineSignatureString,
} from "../src/index.ts";
import * as RootModule from "../src/index.ts";

test("exports the stable LINE manager API", () => {
  expect([
    LineProviders,
    LineMessagingChannels,
    LineLoginChannels,
    LineLiffApps,
    LineClientRegistry,
    LineMessages,
    LineTextMessage,
    makeLineApiClient,
    verifyLineSignature,
    verifyLineSignatureString,
    makeLineLoginClient,
    makeLineLiffClient,
    LineApiAuthenticationError,
    LineApiRateLimitError,
    LineApiResponseError,
    LineApiTimeoutError,
    LineSignatureError,
    LineLoginApiAuthenticationError,
    LineLoginApiRateLimitError,
    LineLoginApiResponseError,
    LineLoginApiTimeoutError,
    ProviderView,
    LiffAppView,
  ]).not.toContain(undefined);
});

test("root exports do not leak the deleted generic LineChannelManagement surface", () => {
  // The generic `LineChannelManagement` service has been split into
  // `LineMessagingChannelManagement` + `LineLoginChannelManagement`. The
  // generic constructor types and helpers must not appear in the root.
  const leakedSymbols = [
    "LineChannelManagement",
    "LineChannelManagementService",
    "makeLineChannelManagement",
  ].filter((name) => name in RootModule);

  expect(leakedSymbols).toEqual([]);
});

test("root exports the aggregate-specific channel management services", () => {
  expect("LineMessagingChannelManagement" in RootModule).toBe(true);
  expect("LineLoginChannelManagement" in RootModule).toBe(true);
});

test("root exports the aggregate-specific management-layer DTOs and views", () => {
  expect("CreateLineMessagingChannelInput" in RootModule).toBe(true);
  expect("UpdateLineMessagingChannelInput" in RootModule).toBe(true);
  expect("CreateLineLoginChannelInput" in RootModule).toBe(true);
  expect("UpdateLineLoginChannelInput" in RootModule).toBe(true);
  expect("ListLineMessagingChannelsQuery" in RootModule).toBe(true);
  expect("ListLineLoginChannelsQuery" in RootModule).toBe(true);
  expect("LineMessagingChannelView" in RootModule).toBe(true);
  expect("LineLoginChannelView" in RootModule).toBe(true);
  expect("LineMessagingChannelListPage" in RootModule).toBe(true);
  expect("LineLoginChannelListPage" in RootModule).toBe(true);
});

test("root exports persistence boundary and brands for headless consumers", () => {
  expect("LineChannelId" in RootModule).toBe(true);
  expect("LineChannel" in RootModule).toBe(true);
  expect("CreateMessagingChannelInput" in RootModule).toBe(true);
  expect("UpdateMessagingChannelInput" in RootModule).toBe(true);
  expect("CreateLoginChannelInput" in RootModule).toBe(true);
  expect("UpdateLoginChannelInput" in RootModule).toBe(true);
  expect("ChannelNotFoundError" in RootModule).toBe(true);
  expect("ChannelDuplicateError" in RootModule).toBe(true);
});

test("root exports the two domain channel repositories (replaces the generic LineChannelRepository)", () => {
  expect("LineMessagingChannelRepository" in RootModule).toBe(true);
  expect("LineLoginChannelRepository" in RootModule).toBe(true);
  expect("LineMessagingChannels" in RootModule).toBe(true);
  expect("LineLoginChannels" in RootModule).toBe(true);
});

test("root does not leak the deleted generic LineChannelRepository", () => {
  expect("LineChannelRepository" in RootModule).toBe(false);
  expect("LineChannelRepositoryService" in RootModule).toBe(false);
  expect("CreateChannelRecordInput" in RootModule).toBe(false);
  expect("UpdateChannelRecordInput" in RootModule).toBe(false);
});

test("domain-specific channel IDs are exported from root", () => {
  expect("LineMessagingChannelId" in RootModule).toBe(true);
  expect("LineLoginChannelId" in RootModule).toBe(true);
  expect("LineBotUserId" in RootModule).toBe(true);
});

test("domain-specific channel error types are exported from root", () => {
  expect("MessagingChannelNotFoundError" in RootModule).toBe(true);
  expect("LoginChannelNotFoundError" in RootModule).toBe(true);
});
