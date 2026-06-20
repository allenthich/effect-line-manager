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

test("root exports do not leak generic internal channel symbols", () => {
  const leakedSymbols = [
    "LineChannelRepository",
    "LineChannelId",
    "InternalLineChannelStore",
    "LineChannelManagement",
    "ChannelNotFoundError",
    "ChannelDuplicateError",
  ].filter((name) => name in RootModule);

  expect(leakedSymbols).toEqual([]);
});

test("root exports do not leak generic channel domain module", () => {
  const leaked = [
    "LineChannel",
    "CreateChannelInput",
    "UpdateChannelInput",
    "ChannelView",
    "ChannelListPage",
    "toChannelView",
    "CreateChannelRecordInput",
    "UpdateChannelRecordInput",
  ].filter((name) => name in RootModule);

  expect(leaked).toEqual([]);
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
