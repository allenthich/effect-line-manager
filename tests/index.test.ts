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

test("root exports do not leak generic channel management internals not required by consumers", () => {
  // These symbols are intentionally private. Consumers implement LineChannelRepository
  // (the persistence boundary) and consume LineChannelManagement (the service via LineApiLayer);
  // those plus their input/error types are tested separately as exported.
  const leakedSymbols = ["LineChannelManagementService", "makeLineChannelManagement"].filter(
    (name) => name in RootModule,
  );

  expect(leakedSymbols).toEqual([]);
});

test("root exports do not leak generic channel domain module not required by consumers", () => {
  // Management-service API shapes (public ChannelView, CreateChannelInput, etc.)
  // are kept private; consumers go through LineChannelManagement / the HTTP API.
  const leaked = [
    "CreateChannelInput",
    "UpdateChannelInput",
    "ChannelView",
    "ChannelListPage",
    "toChannelView",
    "toChannelListPage",
  ].filter((name) => name in RootModule);

  expect(leaked).toEqual([]);
});

test("root exports persistence boundary and channel management symbols for headless consumers", () => {
  expect("LineChannelRepository" in RootModule).toBe(true);
  expect("LineChannelManagement" in RootModule).toBe(true);
  expect("LineChannelId" in RootModule).toBe(true);
  expect("LineChannel" in RootModule).toBe(true);
  expect("CreateChannelRecordInput" in RootModule).toBe(true);
  expect("UpdateChannelRecordInput" in RootModule).toBe(true);
  expect("ChannelNotFoundError" in RootModule).toBe(true);
  expect("ChannelDuplicateError" in RootModule).toBe(true);
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
