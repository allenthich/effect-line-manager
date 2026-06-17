import { LineAccountBreadcrumbs } from "./line-account-breadcrumbs.ts";
import { LineAccountCard } from "./line-account-card.ts";
import { LineAccountDetailPanel } from "./line-account-detail-panel.ts";
import { LineAccountDialog } from "./line-account-dialog.ts";
import { LineAccountForm } from "./line-account-form.ts";
import { LineAccountList } from "./line-account-list.ts";
import { LineAccountManagement } from "./line-account-management.ts";
import { LineAccountToolbar } from "./line-account-toolbar.ts";

const defineElement = (name: string, constructor: CustomElementConstructor): void => {
  if (customElements.get(name) === undefined) {
    customElements.define(name, constructor);
  }
};

export const defineLineAccountDialog = (): void => {
  defineElement("line-account-dialog", LineAccountDialog);
};

export const defineLineAccountCard = (): void => {
  defineElement("line-account-card", LineAccountCard);
};

export const defineLineAccountList = (): void => {
  defineLineAccountCard();
  defineElement("line-account-list", LineAccountList);
};

export const defineLineAccountForm = (): void => {
  defineElement("line-account-form", LineAccountForm);
};

export const defineLineAccountToolbar = (): void => {
  defineElement("line-account-toolbar", LineAccountToolbar);
};

export const defineLineAccountBreadcrumbs = (): void => {
  defineElement("line-account-breadcrumbs", LineAccountBreadcrumbs);
};

export const defineLineAccountDetailPanel = (): void => {
  defineElement("line-account-detail-panel", LineAccountDetailPanel);
};

export const defineLineAccountManagement = (): void => {
  defineLineAccountList();
  defineLineAccountForm();
  defineLineAccountDialog();
  defineLineAccountToolbar();
  defineLineAccountBreadcrumbs();
  defineLineAccountDetailPanel();
  defineElement("line-account-management", LineAccountManagement);
};

export const defineLineAccountManagementElements = (): void => {
  defineLineAccountManagement();
};
