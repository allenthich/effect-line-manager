import { expect, test } from "vite-plus/test";
import * as rootApi from "../../src/index.ts";
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
} from "../../src/web/index.ts";

test("keeps the root package browser UI free", () => {
  expect(
    Object.keys(rootApi).some((key) => key.startsWith("LineAccount") && key !== "LineAccount"),
  ).toBe(false);
  expect(Object.keys(rootApi).some((key) => key.startsWith("defineLineAccount"))).toBe(false);
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
