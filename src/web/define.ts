import { LineAccountCard } from "./line-account-card.ts";
import { LineAccountDialog } from "./line-account-dialog.ts";
import { LineAccountForm } from "./line-account-form.ts";
import { LineAccountList } from "./line-account-list.ts";
import { LineAccountManagement } from "./line-account-management.ts";

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

export const defineLineAccountManagement = (): void => {
  defineLineAccountList();
  defineLineAccountForm();
  defineLineAccountDialog();
  defineElement("line-account-management", LineAccountManagement);
};

export const defineLineAccountManagementElements = (): void => {
  defineLineAccountManagement();
};
