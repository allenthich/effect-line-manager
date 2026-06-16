import { expect, expectTypeOf, test } from "vite-plus/test";
import * as rootApi from "../../src/index.ts";
import type {
  LineProviderManagementAdapter as RootLineProviderManagementAdapter,
  ProviderView as RootProviderView,
  ChannelView as RootChannelView,
  LiffAppView as RootLiffAppView,
} from "../../src/index.ts";
import {
  LineAccountCard,
  LineAccountDialog,
  LineAccountForm,
  LineAccountList,
  LineAccountManagement,
  defaultLineAccountManagementMessages,
  defineLineAccountCard,
  defineLineAccountDialog,
  defineLineAccountForm,
  defineLineAccountList,
  defineLineAccountManagement,
  defineLineAccountManagementElements,
  type LineProviderManagementAdapter as WebLineProviderManagementAdapter,
  type ProviderView as WebProviderView,
  type ChannelView as WebChannelView,
  type LiffAppView as WebLiffAppView,
} from "../../src/web/index.ts";

test("keeps the root package browser UI free", () => {
  expect(rootApi).not.toHaveProperty("LineAccountCard");
  expect(rootApi).not.toHaveProperty("LineAccountDialog");
  expect(rootApi).not.toHaveProperty("LineAccountForm");
  expect(rootApi).not.toHaveProperty("LineAccountList");
  expect(Object.keys(rootApi).some((key) => key.startsWith("defineLineAccount"))).toBe(false);
});

test("re-exports canonical management DTO and adapter types", () => {
  expectTypeOf<WebProviderView>().toEqualTypeOf<RootProviderView>();
  expectTypeOf<WebChannelView>().toEqualTypeOf<RootChannelView>();
  expectTypeOf<WebLiffAppView>().toEqualTypeOf<RootLiffAppView>();
  expectTypeOf<WebLineProviderManagementAdapter>().toEqualTypeOf<RootLineProviderManagementAdapter>();
});

test("exports the complete web component API without registering elements", () => {
  expect([
    LineAccountManagement,
    LineAccountList,
    LineAccountCard,
    LineAccountForm,
    LineAccountDialog,
    defineLineAccountManagementElements,
    defineLineAccountManagement,
    defineLineAccountList,
    defineLineAccountCard,
    defineLineAccountForm,
    defineLineAccountDialog,
  ]).not.toContain(undefined);

  expect(defaultLineAccountManagementMessages.title).toBe("LINE Configuration");
  expect(defaultLineAccountManagementMessages.createFailure).toBeTruthy();
  expect(customElements.get("line-account-management")).toBeUndefined();
  expect(customElements.get("line-account-list")).toBeUndefined();
  expect(customElements.get("line-account-card")).toBeUndefined();
  expect(customElements.get("line-account-form")).toBeUndefined();
  expect(customElements.get("line-account-dialog")).toBeUndefined();
});

test("registers aggregate and individual elements idempotently", () => {
  defineLineAccountManagementElements();
  defineLineAccountManagementElements();
  defineLineAccountManagement();
  defineLineAccountList();
  defineLineAccountCard();
  defineLineAccountForm();
  defineLineAccountDialog();

  expect(customElements.get("line-account-management")).toBe(LineAccountManagement);
  expect(customElements.get("line-account-list")).toBe(LineAccountList);
  expect(customElements.get("line-account-card")).toBe(LineAccountCard);
  expect(customElements.get("line-account-form")).toBe(LineAccountForm);
  expect(customElements.get("line-account-dialog")).toBe(LineAccountDialog);
});
