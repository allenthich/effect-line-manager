import { expect, test } from "vite-plus/test";
import * as rootApi from "../../src/index.ts";
import {
  LiffAppView as RootLiffAppView,
  LineLoginChannels,
  LineMessagingChannels,
  ProviderView as RootProviderView,
} from "../../src/index.ts";
import type { LineProviderManagementAdapter as RootLineProviderManagementAdapter } from "../../src/index.ts";
import {
  LineAccountBreadcrumbs,
  LineAccountCard,
  LineAccountDetailPanel,
  LineAccountDialog,
  LineAccountForm,
  LineAccountList,
  LineAccountManagement,
  LineAccountToolbar,
  defaultLineAccountManagementMessages,
  defineLineAccountBreadcrumbs,
  defineLineAccountCard,
  defineLineAccountDetailPanel,
  defineLineAccountDialog,
  defineLineAccountForm,
  defineLineAccountList,
  defineLineAccountManagement,
  defineLineAccountToolbar,
  type LiffAppView as WebLiffAppView,
  type LineProviderManagementAdapter as WebLineProviderManagementAdapter,
  type ProviderView as WebProviderView,
} from "../../src/web/index.ts";

test("keeps web components out of the root package export", () => {
  expect(rootApi).not.toHaveProperty("LineAccountCard");
  expect(rootApi).not.toHaveProperty("LineAccountDialog");
  expect(rootApi).not.toHaveProperty("LineAccountForm");
  expect(rootApi).not.toHaveProperty("LineAccountDetailPanel");
  expect(rootApi).not.toHaveProperty("LineAccountList");
  expect(rootApi).not.toHaveProperty("LineAccountToolbar");
  expect(rootApi).not.toHaveProperty("LineAccountBreadcrumbs");
  expect(rootApi).not.toHaveProperty("LineAccountManagement");
  expect(rootApi).not.toHaveProperty("defineLineAccountCard");
  expect(rootApi).not.toHaveProperty("defineLineAccountDialog");
  expect(rootApi).not.toHaveProperty("defineLineAccountForm");
  expect(rootApi).not.toHaveProperty("defineLineAccountDetailPanel");
  expect(rootApi).not.toHaveProperty("defineLineAccountList");
  expect(rootApi).not.toHaveProperty("defineLineAccountToolbar");
  expect(rootApi).not.toHaveProperty("defineLineAccountBreadcrumbs");
  expect(rootApi).not.toHaveProperty("defineLineAccountManagement");
  expect(rootApi).not.toHaveProperty("defaultLineAccountManagementMessages");
});

test("exports the web components from the dedicated web package", () => {
  expect([
    LineAccountCard,
    LineAccountDialog,
    LineAccountForm,
    LineAccountDetailPanel,
    LineAccountList,
    LineAccountToolbar,
    LineAccountBreadcrumbs,
    LineAccountManagement,
    defineLineAccountCard,
    defineLineAccountDialog,
    defineLineAccountForm,
    defineLineAccountDetailPanel,
    defineLineAccountList,
    defineLineAccountToolbar,
    defineLineAccountBreadcrumbs,
    defineLineAccountManagement,
    defaultLineAccountManagementMessages,
  ]).not.toContain(undefined);
});

test("shares view and adapter contracts with the root API", () => {
  const adapter: RootLineProviderManagementAdapter =
    null as never as WebLineProviderManagementAdapter;
  const providerView: RootProviderView = null as never as WebProviderView;
  const liffAppView: RootLiffAppView = null as never as WebLiffAppView;

  expect(adapter).toBeNull();
  expect(providerView).toBeNull();
  expect(liffAppView).toBeNull();
  expect(LineMessagingChannels.Repository).toBeDefined();
  expect(LineLoginChannels.Repository).toBeDefined();
});
