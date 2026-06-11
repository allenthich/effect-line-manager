import { expect, expectTypeOf, test } from "vite-plus/test";
import * as rootApi from "../../src/index.ts";
import type {
  CreateLineAccountInput as RootCreateLineAccountInput,
  LineAccountManagementAdapter as RootLineAccountManagementAdapter,
  LineAccountView as RootLineAccountView,
  UpdateLineAccountInput as RootUpdateLineAccountInput,
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
  type CreateLineAccountInput as WebCreateLineAccountInput,
  type LineAccountManagementAdapter as WebLineAccountManagementAdapter,
  type LineAccountView as WebLineAccountView,
  type UpdateLineAccountInput as WebUpdateLineAccountInput,
} from "../../src/web/index.ts";

test("keeps the root package browser UI free", () => {
  expect(rootApi).not.toHaveProperty("LineAccountCard");
  expect(rootApi).not.toHaveProperty("LineAccountDialog");
  expect(rootApi).not.toHaveProperty("LineAccountForm");
  expect(rootApi).not.toHaveProperty("LineAccountList");
  expect(Object.keys(rootApi).some((key) => key.startsWith("defineLineAccount"))).toBe(false);
});

test("re-exports canonical management DTO and adapter types", () => {
  expectTypeOf<WebLineAccountView>().toEqualTypeOf<RootLineAccountView>();
  expectTypeOf<WebCreateLineAccountInput>().toEqualTypeOf<RootCreateLineAccountInput>();
  expectTypeOf<WebUpdateLineAccountInput>().toEqualTypeOf<RootUpdateLineAccountInput>();
  expectTypeOf<WebLineAccountManagementAdapter>().toEqualTypeOf<RootLineAccountManagementAdapter>();
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

  expect(defaultLineAccountManagementMessages.title).toBe("LINE accounts");
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
