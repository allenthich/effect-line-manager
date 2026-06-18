import { LineAccountBreadcrumbs } from "./line-account-breadcrumbs.ts";
import { LineAccountCard } from "./line-account-card.ts";
import { LineAccountDetailPanel } from "./line-account-detail-panel.ts";
import { LineAccountDialog } from "./line-account-dialog.ts";
import { LineAccountForm } from "./line-account-form.ts";
import { LineAccountHierarchy } from "./line-account-hierarchy.ts";
import { LineAccountList } from "./line-account-list.ts";
import { LineAccountManagement } from "./line-account-management.ts";
import { LineAccountToolbar } from "./line-account-toolbar.ts";

const defineElement = (name: string, constructor: CustomElementConstructor): void => {
  if (customElements.get(name) === undefined) {
    customElements.define(name, constructor);
  }
};

/** Registers the &lt;line-account-dialog&gt; custom element. */
export const defineLineAccountDialog = (): void => {
  defineElement("line-account-dialog", LineAccountDialog);
};

/** Registers the &lt;line-account-card&gt; custom element. */
export const defineLineAccountCard = (): void => {
  defineElement("line-account-card", LineAccountCard);
};

/** Registers the &lt;line-account-list&gt; custom element (also registers &lt;line-account-card&gt; as a dependency). */
export const defineLineAccountList = (): void => {
  defineLineAccountCard();
  defineElement("line-account-list", LineAccountList);
};

/** Registers the &lt;line-account-form&gt; custom element. */
export const defineLineAccountForm = (): void => {
  defineElement("line-account-form", LineAccountForm);
};

/** Registers the &lt;line-account-toolbar&gt; custom element. */
export const defineLineAccountToolbar = (): void => {
  defineElement("line-account-toolbar", LineAccountToolbar);
};

/** Registers the &lt;line-account-breadcrumbs&gt; custom element. */
export const defineLineAccountBreadcrumbs = (): void => {
  defineElement("line-account-breadcrumbs", LineAccountBreadcrumbs);
};

/** Registers the &lt;line-account-detail-panel&gt; custom element. */
export const defineLineAccountDetailPanel = (): void => {
  defineElement("line-account-detail-panel", LineAccountDetailPanel);
};

/** Registers the &lt;line-account-hierarchy&gt; custom element. */
export const defineLineAccountHierarchy = (): void => {
  defineElement("line-account-hierarchy", LineAccountHierarchy);
};

/** Registers the &lt;line-account-management&gt; custom element and all its child dependencies. */
export const defineLineAccountManagement = (): void => {
  defineLineAccountList();
  defineLineAccountForm();
  defineLineAccountDialog();
  defineLineAccountToolbar();
  defineLineAccountBreadcrumbs();
  defineLineAccountDetailPanel();
  defineLineAccountHierarchy();
  defineElement("line-account-management", LineAccountManagement);
};

/** Convenience alias for defineLineAccountManagement. */
export const defineLineAccountManagementElements = (): void => {
  defineLineAccountManagement();
};
