/**
 * Web Components (Optional Reference UI)
 *
 * Lit-based custom elements that consume the `LineAccountManagementAdapter` interface.
 * These are framework-agnostic custom elements — use them in any HTML page, React, Vue, or Svelte app.
 *
 * **Headless by design:** The web components are a reference implementation, not the only way
 * to build a LINE account management UI. The real abstraction boundary is the
 * `LineAccountManagementAdapter` interface (defined in `src/account/domain.ts`). Consumers can:
 *
 * - Use these components directly with a custom adapter
 * - Build their own UI using only the adapter interface
 * - Use the Effect services (`LineAccountManagement`, `LineRepository`, etc.) directly
 *
 * The adapter pattern means user-scoping, auth, and business logic live in the consumer's
 * adapter implementation — not in the components themselves.
 */
export * from "./define.ts";
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
/** Re-export all type symbols from the web types module. */
export type * from "./types.ts";
