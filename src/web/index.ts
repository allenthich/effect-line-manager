/**
 * Web Components (Optional Reference UI)
 *
 * Lit-based custom elements that consume the `LineProviderManagementAdapter`
 * interface. These are framework-agnostic custom elements and can be used in
 * any HTML page, React, Vue, or Svelte app.
 *
 * Headless by design: the web components are a reference implementation, not
 * the primary API boundary. Consumers can:
 *
 * - Use these components directly with a custom adapter.
 * - Build their own UI using only the `LineProviderManagementAdapter`.
 * - Use the domain-specific Effect services directly.
 *
 * Public type surface is the named export list below — the internal
 * `ChannelView` alias from `./types.ts` is deliberately NOT re-exported.
 * Consumers should use `LineMessagingChannelView` or `LineLoginChannelView`
 * directly so that the per-aggregate shape dependency is explicit.
 */
export * from "./define.ts";
export * from "./developers-console/index.ts";
export * from "./line-account-breadcrumbs.ts";
export * from "./line-account-card.ts";
export * from "./line-account-detail-panel.ts";
export * from "./line-account-dialog.ts";
export * from "./line-account-form.ts";
export * from "./line-account-hierarchy.ts";
export * from "./line-account-list.ts";
export * from "./line-account-management.ts";
export * from "./line-account-toolbar.ts";
export * from "./messages.ts";
export type {
  LineProviderManagementAdapter,
  ProviderView,
  LiffAppView,
  LineMessagingChannelView,
  LineLoginChannelView,
  CreateProviderInput,
  UpdateProviderInput,
  CreateLineMessagingChannelInput,
  UpdateLineMessagingChannelInput,
  CreateLineLoginChannelInput,
  UpdateLineLoginChannelInput,
  CreateLiffAppInput,
  UpdateLiffAppInput,
  ProviderListPage,
  LineMessagingChannelListPage,
  LineLoginChannelListPage,
  LiffAppListPage,
  LineAccountFormMode,
  LineAccountFormType,
  LineAccountEntity,
  LineAccountOperation,
  LineAccountRequestDetail,
  LineAccountFormSubmitDetail,
  LineAccountErrorEventDetail,
} from "./types.ts";
