import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type { LineAccountForm } from "./line-account-form.ts";
import type {
  ProviderView,
  ChannelView,
  LiffAppView,
  LineAccountFormType,
  LineAccountFormSubmitDetail,
  LineProviderManagementAdapter,
  LineAccountOperation,
  LineAccountErrorEventDetail,
  LineAccountRequestDetail,
} from "./types.ts";
import "./line-account-dialog.ts";
import "./line-account-form.ts";
import "./line-account-list.ts";

type DialogKind = "create" | "edit" | "delete" | undefined;

const eventOptions = <T>(detail: T): CustomEventInit<T> => ({
  bubbles: true,
  composed: true,
  detail,
});

export class LineAccountManagement extends LitElement {
  static properties = {
    adapter: { attribute: false },
    messages: { attribute: false },
    currentTab: { state: true }, // "provider" | "channel" | "liff"
    providers: { state: true },
    channels: { state: true },
    liffApps: { state: true },
    loading: { state: true },
    loadError: { state: true },
    dialogKind: { state: true },
    selectedItem: { state: true },
    mutationError: { state: true },
    notice: { state: true },
    itemErrors: { state: true },
    createPending: { state: true },
    editPending: { state: true },
    deletePending: { state: true },
    pendingItemIds: { state: true },
    variant: { type: String, reflect: true },
    searchQuery: { state: true },
    selectedItemId: { state: true },
    selectedProviderId: { state: true }, // Filter channels by provider
    selectedChannelId: { state: true }, // Filter LIFF apps by login channel
  };

  static styles = css`
    :host {
      display: block;
      color: var(--line-account-text-color, #1f2933);
      font-family: var(--line-account-font-family, system-ui, sans-serif);
    }

    .page {
      width: min(100%, var(--line-account-content-width, 72rem));
      margin-inline: auto;
      padding: var(--line-account-page-padding, 1.5rem);
      background: var(--line-account-page-background, #f7f9fa);
      box-sizing: border-box;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--line-account-space-4, 1rem);
      margin-bottom: var(--line-account-space-5, 1.25rem);
    }

    .header-copy {
      min-width: 0;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      font-size: clamp(1.5rem, 4vw, 2rem);
      line-height: 1.2;
    }

    .description {
      margin-top: var(--line-account-space-2, 0.5rem);
      color: var(--line-account-muted-color, #52606d);
    }

    button {
      min-height: 2.75rem;
      padding: 0.625rem 1rem;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
      transition: all 0.15s ease-in-out;
    }

    button:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 2px;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .primary {
      border-color: var(--line-account-primary-color, #06c755);
      background: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-contrast, #fff);
    }

    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .add-btn:hover:not(:disabled) {
      background-color: var(--line-account-primary-hover, #05b04b);
      border-color: var(--line-account-primary-hover, #05b04b);
    }

    .add-btn:active:not(:disabled) {
      transform: scale(0.97);
    }

    .add-icon {
      width: 1.125rem;
      height: 1.125rem;
      flex-shrink: 0;
    }

    .danger {
      border-color: var(--line-account-danger-color, #c62828);
      background: var(--line-account-danger-color, #c62828);
      color: #fff;
    }

    .danger:hover:not(:disabled) {
      background-color: var(--line-account-danger-hover, #b02020);
      border-color: var(--line-account-danger-hover, #b02020);
    }

    .state,
    .error {
      margin-bottom: var(--line-account-space-4, 1rem);
      padding: var(--line-account-space-4, 1rem);
      border: 1px solid var(--line-account-border-color, #d9e0e6);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-surface-background, #fff);
    }

    .error {
      border-color: var(--line-account-danger-color, #c62828);
      background: var(--line-account-danger-background, #fff0f0);
      color: var(--line-account-danger-color, #a61b1b);
    }

    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--line-account-space-6, 3rem);
      gap: 1rem;
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-surface-background, #fff);
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--line-account-muted-background, #eef2f5);
      border-top-color: var(--line-account-primary-color, #06c755);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      pointer-events: none;
      display: grid;
      gap: 0.5rem;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem 0.75rem 0.75rem;
      border: 1px solid var(--line-account-primary-color, #06c755);
      border-radius: 0.5rem;
      background: var(--line-account-surface-background, #fff);
      color: var(--line-account-text-color, #1f2933);
      box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.1),
        0 8px 10px -6px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 24rem;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(1rem) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .toast-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: var(--line-account-primary-color, #06c755);
      flex-shrink: 0;
    }

    .toast-message {
      font-size: 0.875rem;
      font-weight: 550;
      margin: 0;
      flex-grow: 1;
    }

    .toast-close {
      background: none;
      border: none;
      min-height: auto;
      padding: 0.25rem;
      color: var(--line-account-muted-color, #52606d);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      margin-left: 0.5rem;
      transition:
        background-color 0.15s,
        color 0.15s;
    }

    .toast-close:hover {
      color: var(--line-account-text-color, #1f2933);
      background-color: var(--line-account-muted-background, #eef2f5);
    }

    .toast-close svg {
      width: 1rem;
      height: 1rem;
    }

    .dialog-copy {
      line-height: 1.6;
    }

    /* Tabs Bar styling */
    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      border-bottom: 2px solid var(--line-account-border-color, #e4e7eb);
      padding-bottom: 0.375rem;
    }

    .tab-btn {
      min-height: auto;
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--line-account-muted-color, #52606d);
      font-weight: 600;
      cursor: pointer;
      border-radius: 0.375rem;
      transition: all 0.15s ease-in-out;
    }

    .tab-btn:hover {
      color: var(--line-account-text-color, #1f2933);
      background: var(--line-account-muted-background, #eef2f5);
    }

    .tab-btn.active {
      color: var(--line-account-primary-color, #06c755);
      background: var(--line-account-selected-bg, #e6fdf0);
    }

    /* Toolbar and controls */
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: var(--line-account-space-5, 1.5rem);
      padding: 0.75rem 1rem;
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-surface-background, #fff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 14rem;
    }

    .search-input {
      width: 100%;
      height: 2.5rem;
      padding: 0.5rem 1rem 0.5rem 2.25rem;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-button-radius, 0.5rem);
      font: inherit;
      font-size: 0.9rem;
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      box-sizing: border-box;
      transition: all 0.15s ease-in-out;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--line-account-primary-color, #06c755);
      box-shadow: 0 0 0 3px var(--line-account-focus-color, rgb(6 199 85 / 15%));
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1rem;
      height: 1rem;
      color: var(--line-account-muted-color, #8a9ba8);
      pointer-events: none;
    }

    .clear-search-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      min-height: auto;
      padding: 0.25rem;
      color: var(--line-account-muted-color, #8a9ba8);
      cursor: pointer;
    }

    .clear-search-btn:hover {
      color: var(--line-account-text-color, #1f2933);
    }

    /* Filters Select styling */
    .filter-wrapper select {
      height: 2.5rem;
      padding: 0 1.5rem 0 0.75rem;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      font: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s;
    }

    .filter-wrapper select:focus {
      border-color: var(--line-account-primary-color, #06c755);
    }

    .variant-switcher {
      display: inline-flex;
      background: var(--line-account-muted-background, #eef2f5);
      padding: 0.25rem;
      border-radius: var(--line-account-button-radius, 0.5rem);
      gap: 0.125rem;
    }

    .variant-btn {
      min-height: auto;
      padding: 0.375rem 0.75rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--line-account-muted-color, #52606d);
      background: transparent;
      box-shadow: none;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }

    .variant-btn:hover {
      color: var(--line-account-text-color, #1f2933);
      background: rgba(255, 255, 255, 0.4);
    }

    .variant-btn.active {
      color: var(--line-account-text-color, #1f2933);
      background: var(--line-account-surface-background, #fff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Split Pane Layout styles */
    .split-container {
      display: grid;
      grid-template-columns: 20rem 1fr;
      gap: 1.5rem;
      min-height: 28rem;
    }

    .split-sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-right: 1px solid var(--line-account-border-color, #e4e7eb);
      padding-right: 1.5rem;
    }

    .split-details {
      background: var(--line-account-surface-background, #fff);
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 1rem);
      padding: 1.5rem;
      box-shadow: var(--line-account-shadow, 0 1px 3px rgba(0, 0, 0, 0.05));
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      min-height: 28rem;
    }

    .details-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      border-bottom: 1px solid var(--line-account-border-color, #e4e7eb);
      padding-bottom: 1.25rem;
    }

    .details-identity {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .details-avatar {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }

    .details-initial {
      display: grid;
      place-items: center;
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }

    .details-initial-provider {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .details-initial-channel-messaging {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }

    .details-initial-channel-login {
      background: linear-gradient(135deg, #8b5cf6, #5b21b6);
    }

    .details-initial-liff {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .details-title-group h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    .details-basic-id {
      color: var(--line-account-muted-color, #52606d);
      font-size: 0.9rem;
      margin-top: 0.125rem;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 1.25rem;
    }

    .details-section {
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 0.75rem);
      padding: 1rem;
      background: var(--line-account-fieldset-bg, #fafbfc);
    }

    .details-section-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--line-account-primary-text-color, #057b38);
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .details-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
    }

    .details-row:last-child {
      margin-bottom: 0;
    }

    .details-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--line-account-muted-color, #52606d);
    }

    .details-value-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .details-value {
      font-size: 0.875rem;
      font-family: monospace;
      background: var(--line-account-muted-background, #eef2f5);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      word-break: break-all;
      flex: 1;
    }

    .copy-btn {
      background: none;
      border: none;
      min-height: auto;
      padding: 0.25rem;
      color: var(--line-account-muted-color, #8a9ba8);
      cursor: pointer;
      border-radius: 0.25rem;
      transition: all 0.15s;
    }

    .copy-btn:hover {
      color: var(--line-account-primary-color, #06c755);
      background-color: var(--line-account-muted-background, #eef2f5);
    }

    .copy-btn svg {
      width: 1rem;
      height: 1rem;
    }

    .details-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--line-account-muted-color, #52606d);
      flex: 1;
      padding: 3rem;
    }

    .details-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: auto;
      border-top: 1px solid var(--line-account-border-color, #e4e7eb);
      padding-top: 1.25rem;
    }

    /* Switch used in split-pane details header */
    .switch {
      position: relative;
      width: 2.75rem;
      height: 1.5rem;
      padding: 0;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: 999px;
      background-color: var(--line-account-switch-off-bg, #e4e7eb);
      cursor: pointer;
      min-height: auto;
      transition:
        background-color 0.2s,
        border-color 0.2s;
      flex-shrink: 0;
    }

    .switch:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 2px;
    }

    .switch.checked {
      background-color: var(--line-account-primary-color, #06c755);
      border-color: var(--line-account-primary-color, #06c755);
    }

    .switch-thumb {
      position: absolute;
      top: 1px;
      left: 1px;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .switch.checked .switch-thumb {
      transform: translateX(1.25rem);
    }

    .switch:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (max-width: 36rem) {
      .header {
        align-items: stretch;
        flex-direction: column;
      }
    }

    @media (max-width: 56rem) {
      .split-container {
        grid-template-columns: 1fr;
      }
      .split-sidebar {
        border-right: none;
        padding-right: 0;
      }
    }
  `;

  declare adapter: LineProviderManagementAdapter | undefined;
  declare messages: Partial<LineAccountManagementMessages> | undefined;
  declare currentTab: LineAccountFormType;
  declare providers: readonly ProviderView[];
  declare channels: readonly ChannelView[];
  declare liffApps: readonly LiffAppView[];
  declare loading: boolean;
  declare loadError: boolean;
  declare dialogKind: DialogKind;
  declare selectedItem: ProviderView | ChannelView | LiffAppView | undefined;
  declare mutationError: string | undefined;
  declare notice: string | undefined;
  declare itemErrors: ReadonlyMap<string, string>;
  declare createPending: boolean;
  declare editPending: boolean;
  declare deletePending: boolean;
  declare pendingItemIds: ReadonlySet<string>;
  declare variant: string;
  declare searchQuery: string;
  declare selectedItemId: string | undefined;
  declare selectedProviderId: string;
  declare selectedChannelId: string;

  #loadGeneration = 0;
  #lastAdapter: LineProviderManagementAdapter | undefined;
  #noticeTimeoutId: number | undefined;

  constructor() {
    super();
    this.adapter = undefined;
    this.messages = undefined;
    this.currentTab = "provider";
    this.providers = [];
    this.channels = [];
    this.liffApps = [];
    this.loading = false;
    this.loadError = false;
    this.dialogKind = undefined;
    this.selectedItem = undefined;
    this.mutationError = undefined;
    this.notice = undefined;
    this.itemErrors = new Map();
    this.createPending = false;
    this.editPending = false;
    this.deletePending = false;
    this.pendingItemIds = new Set();
    this.variant = "grid";
    this.searchQuery = "";
    this.selectedItemId = undefined;
    this.selectedProviderId = "";
    this.selectedChannelId = "";

    this.addEventListener("line-account-select-request", (event) => {
      const { item } = (event as CustomEvent<LineAccountRequestDetail>).detail;
      this.selectedItemId = item.id;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#lastAdapter = this.adapter;
    void this.reload();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.#noticeTimeoutId !== undefined) {
      window.clearTimeout(this.#noticeTimeoutId);
    }
  }

  async reload(): Promise<void> {
    const adapter = this.adapter;
    const generation = ++this.#loadGeneration;
    this.loadError = false;

    if (adapter === undefined) {
      this.loading = false;
      this.providers = [];
      this.channels = [];
      this.liffApps = [];
      return;
    }

    this.loading = true;
    try {
      const [providersPage, channelsPage, liffAppsPage] = await Promise.all([
        adapter.listProviders(),
        adapter.listChannels(),
        adapter.listLiffApps(),
      ]);

      if (generation !== this.#loadGeneration || this.adapter !== adapter) return;
      this.providers = [...providersPage.data];
      this.channels = [...channelsPage.data];
      this.liffApps = [...liffAppsPage.data];

      const currentItems = this.#currentItems();
      if (
        currentItems.length > 0 &&
        !currentItems.some((item) => item.id === this.selectedItemId)
      ) {
        this.selectedItemId = currentItems[0].id;
      }
    } catch (error) {
      if (generation !== this.#loadGeneration || this.adapter !== adapter) return;
      this.providers = [];
      this.channels = [];
      this.liffApps = [];
      this.loadError = true;
      this.#emitError("listProviders", error);
    } finally {
      if (generation === this.#loadGeneration && this.adapter === adapter) this.loading = false;
    }
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("adapter") && this.adapter !== this.#lastAdapter) {
      this.#lastAdapter = this.adapter as any;
      void this.reload();
    }
  }

  #resolvedItems(): readonly (ProviderView | ChannelView | LiffAppView)[] {
    const query = this.searchQuery.toLowerCase().trim();
    let items = this.#currentItems();

    if (this.currentTab === "channel" && this.selectedProviderId) {
      items = items.filter((c) => (c as ChannelView).providerId === this.selectedProviderId);
    } else if (this.currentTab === "liff" && this.selectedChannelId) {
      items = items.filter((l) => (l as LiffAppView).loginChannelId === this.selectedChannelId);
    }

    if (query) {
      items = items.filter((item) => {
        if (this.currentTab === "provider") {
          return (
            (item as ProviderView).name.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query)
          );
        } else if (this.currentTab === "channel") {
          const c = item as ChannelView;
          return (
            c.name.toLowerCase().includes(query) ||
            c.channelId.toLowerCase().includes(query) ||
            (c.channelType === "messaging" &&
              c.displayName !== null &&
              c.displayName.toLowerCase().includes(query))
          );
        } else {
          const l = item as LiffAppView;
          return (
            l.liffId.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query) ||
            (l.description && l.description.toLowerCase().includes(query))
          );
        }
      });
    }

    return items;
  }

  #currentItems(): readonly (ProviderView | ChannelView | LiffAppView)[] {
    if (this.currentTab === "provider") return this.providers;
    if (this.currentTab === "channel") return this.channels;
    return this.liffApps;
  }

  protected render() {
    const messages = this.#resolvedMessages;
    const filtered = this.#resolvedItems();

    let activeItem = filtered.find((item) => item.id === this.selectedItemId);
    if (!activeItem && filtered.length > 0) {
      activeItem = filtered[0];
    }

    let addBtnLabel = messages.addProvider;
    if (this.currentTab === "channel") addBtnLabel = messages.addChannel;
    else if (this.currentTab === "liff") addBtnLabel = messages.addLiffApp;

    return html`
      <section class="page" part="page">
        <header class="header" part="header">
          <div class="header-copy">
            <h1 part="title">${messages.title}</h1>
            <p class="description">${messages.description}</p>
          </div>
          ${this.variant !== "split"
            ? html`
                <button
                  class="primary add-btn"
                  part="add-button"
                  type="button"
                  ?disabled=${this.adapter === undefined}
                  @click=${this.#openCreate}
                >
                  <svg
                    class="add-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  ${addBtnLabel}
                </button>
              `
            : ""}
        </header>

        <!-- Tabs Navigation -->
        <div class="tabs-bar" role="tablist">
          <button
            class="tab-btn ${this.currentTab === "provider" ? "active" : ""}"
            role="tab"
            aria-selected=${this.currentTab === "provider" ? "true" : "false"}
            @click=${() => this.#setTab("provider")}
          >
            ${messages.providersTab}
          </button>
          <button
            class="tab-btn ${this.currentTab === "channel" ? "active" : ""}"
            role="tab"
            aria-selected=${this.currentTab === "channel" ? "true" : "false"}
            @click=${() => this.#setTab("channel")}
          >
            ${messages.channelsTab}
          </button>
          <button
            class="tab-btn ${this.currentTab === "liff" ? "active" : ""}"
            role="tab"
            aria-selected=${this.currentTab === "liff" ? "true" : "false"}
            @click=${() => this.#setTab("liff")}
          >
            ${messages.liffAppsTab}
          </button>
        </div>

        ${this.variant !== "split"
          ? html` ${this.#renderToolbar()} ${this.#renderCollection(messages, filtered)} `
          : html`
              ${this.#renderToolbar()} ${this.#renderSplitPane(messages, filtered, activeItem)}
            `}
      </section>

      ${this.notice
        ? html`
            <div class="toast-container" part="toast-container">
              <div class="toast" role="status" aria-live="polite" part="toast">
                <svg
                  class="toast-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <p class="toast-message">${this.notice}</p>
                <button
                  class="toast-close"
                  type="button"
                  aria-label="Dismiss notification"
                  @click=${this.#dismissNotice}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          `
        : ""}
      ${this.#renderDialogs(messages)}
    `;
  }

  #renderDialogs(messages: LineAccountManagementMessages) {
    let headingCreate = messages.createProviderHeading;
    let headingEdit = messages.editProviderHeading;
    let headingDelete = messages.deleteProviderHeading;

    if (this.currentTab === "channel") {
      headingCreate = messages.createChannelHeading;
      headingEdit = messages.editChannelHeading;
      headingDelete = messages.deleteChannelHeading;
    } else if (this.currentTab === "liff") {
      headingCreate = messages.createLiffAppHeading;
      headingEdit = messages.editLiffAppHeading;
      headingDelete = messages.deleteLiffAppHeading;
    }

    const deleteConfirmMsg = this.selectedItem
      ? this.currentTab === "provider"
        ? messages.deleteConfirmation("Provider", (this.selectedItem as ProviderView).name)
        : this.currentTab === "channel"
          ? messages.deleteConfirmation("Channel", (this.selectedItem as ChannelView).name)
          : messages.deleteConfirmation(
              "LIFF Application",
              (this.selectedItem as LiffAppView).liffId,
            )
      : "";

    return html`
      <line-account-dialog
        data-kind="create"
        .open=${this.dialogKind === "create"}
        .heading=${headingCreate}
        @line-account-dialog-close-request=${this.#closeDialog}
      >
        <line-account-form
          .type=${this.currentTab}
          .mode=${"create"}
          .providers=${this.providers}
          .channels=${this.channels}
          .messages=${messages}
          .submitting=${this.createPending}
          .error=${this.dialogKind === "create" ? this.mutationError : undefined}
          @line-account-form-submit=${this.#handleFormSubmit}
        ></line-account-form>
        <button
          slot="footer"
          type="button"
          ?disabled=${this.createPending}
          @click=${this.#closeDialog}
        >
          ${messages.cancel}
        </button>
        <button
          class="primary"
          part="submit-button"
          slot="footer"
          type="button"
          ?disabled=${this.createPending}
          @click=${() => this.#submitDialogForm("create")}
        >
          ${this.createPending ? messages.loading : "Create"}
        </button>
      </line-account-dialog>

      <line-account-dialog
        data-kind="edit"
        .open=${this.dialogKind === "edit"}
        .heading=${headingEdit}
        @line-account-dialog-close-request=${this.#closeDialog}
      >
        <line-account-form
          .type=${this.currentTab}
          .mode=${"edit"}
          .item=${this.selectedItem}
          .providers=${this.providers}
          .channels=${this.channels}
          .messages=${messages}
          .submitting=${this.editPending}
          .error=${this.dialogKind === "edit" ? this.mutationError : undefined}
          @line-account-form-submit=${this.#handleFormSubmit}
        ></line-account-form>
        <button
          slot="footer"
          type="button"
          ?disabled=${this.editPending}
          @click=${this.#closeDialog}
        >
          ${messages.cancel}
        </button>
        <button
          class="primary"
          part="submit-button"
          slot="footer"
          type="button"
          ?disabled=${this.editPending}
          @click=${() => this.#submitDialogForm("edit")}
        >
          ${this.editPending ? messages.loading : messages.saveChanges}
        </button>
      </line-account-dialog>

      <line-account-dialog
        data-kind="delete"
        .open=${this.dialogKind === "delete"}
        .heading=${headingDelete}
        @line-account-dialog-close-request=${this.#closeDialog}
      >
        <p class="dialog-copy">${deleteConfirmMsg}</p>
        ${this.dialogKind === "delete" && this.mutationError
          ? html`<p class="error" role="alert">${this.mutationError}</p>`
          : ""}
        <button
          slot="footer"
          type="button"
          ?disabled=${this.deletePending}
          @click=${this.#closeDialog}
        >
          ${messages.cancel}
        </button>
        <button
          class="danger"
          part="confirm-delete-button"
          slot="footer"
          type="button"
          ?disabled=${this.deletePending}
          @click=${this.#deleteSelectedItem}
        >
          ${this.deletePending ? messages.loading : messages.confirmDelete}
        </button>
      </line-account-dialog>
    `;
  }

  #renderToolbar() {
    return html`
      <div class="toolbar">
        <div class="search-wrapper">
          <svg
            class="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            class="search-input"
            type="text"
            placeholder="Search..."
            .value=${this.searchQuery}
            @input=${this.#handleSearchInput}
            aria-label="Search"
          />
          ${this.searchQuery
            ? html`
                <button
                  class="clear-search-btn"
                  type="button"
                  @click=${this.#clearSearch}
                  aria-label="Clear search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="width: 0.875rem; height: 0.875rem;"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              `
            : ""}
        </div>

        <!-- Dynamic Dropdown Filters -->
        ${this.currentTab === "channel"
          ? html`
              <div class="filter-wrapper">
                <select
                  .value=${this.selectedProviderId}
                  @change=${this.#handleProviderFilterChange}
                  aria-label="Filter by Provider"
                >
                  <option value="">All Providers</option>
                  ${this.providers.map(
                    (p) =>
                      html`<option value=${p.id} ?selected=${p.id === this.selectedProviderId}>
                        ${p.name}
                      </option>`,
                  )}
                </select>
              </div>
            `
          : this.currentTab === "liff"
            ? html`
                <div class="filter-wrapper">
                  <select
                    .value=${this.selectedChannelId}
                    @change=${this.#handleChannelFilterChange}
                    aria-label="Filter by Channel"
                  >
                    <option value="">All Channels</option>
                    ${this.channels
                      .filter((c) => c.channelType === "login")
                      .map(
                        (c) =>
                          html`<option value=${c.id} ?selected=${c.id === this.selectedChannelId}>
                            ${c.name}
                          </option>`,
                      )}
                  </select>
                </div>
              `
            : ""}

        <div class="variant-switcher">
          <button
            class="variant-btn ${this.variant === "grid" ? "active" : ""}"
            type="button"
            title="Grid view"
            @click=${() => this.#setVariant("grid")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="width:0.9rem;height:0.9rem;flex-shrink:0"
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Grid
          </button>
          <button
            class="variant-btn ${this.variant === "list" ? "active" : ""}"
            type="button"
            title="Table view"
            @click=${() => this.#setVariant("list")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="width:0.9rem;height:0.9rem;flex-shrink:0"
            >
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            List
          </button>
          <button
            class="variant-btn ${this.variant === "split" ? "active" : ""}"
            type="button"
            title="Split pane view"
            @click=${() => this.#setVariant("split")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="width:0.9rem;height:0.9rem;flex-shrink:0"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            Split
          </button>
        </div>
      </div>
    `;
  }

  #handleSearchInput = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchQuery = target.value;
    }
  };

  #handleProviderFilterChange = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.selectedProviderId = target.value;
    }
  };

  #handleChannelFilterChange = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.selectedChannelId = target.value;
    }
  };

  #clearSearch = (): void => {
    this.searchQuery = "";
  };

  #setVariant = (variant: string): void => {
    this.variant = variant;
  };

  #setTab = (tab: LineAccountFormType): void => {
    this.currentTab = tab;
    this.selectedItemId = undefined;
    this.searchQuery = "";
  };

  #renderSplitPane(
    messages: LineAccountManagementMessages,
    filtered: readonly (ProviderView | ChannelView | LiffAppView)[],
    activeItem: ProviderView | ChannelView | LiffAppView | undefined,
  ) {
    let addBtnLabel = messages.addProvider;
    if (this.currentTab === "channel") addBtnLabel = messages.addChannel;
    else if (this.currentTab === "liff") addBtnLabel = messages.addLiffApp;

    return html`
      <div class="split-container">
        <div class="split-sidebar">
          <button
            class="primary add-btn"
            style="width: 100%; justify-content: center; min-height: 2.5rem"
            part="add-button"
            type="button"
            ?disabled=${this.adapter === undefined}
            @click=${this.#openCreate}
          >
            <svg
              class="add-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            ${addBtnLabel}
          </button>

          ${this.loading
            ? html`
                <div class="spinner-container" style="border: none; padding: 2rem;">
                  <div class="spinner" style="width: 1.5rem; height: 1.5rem;"></div>
                </div>
              `
            : this.loadError
              ? html`
                  <div style="text-align: center; padding: 1rem;">
                    <p
                      style="color: var(--line-account-danger-color, #c62828); font-size: 0.875rem;"
                    >
                      ${messages.loadFailure}
                    </p>
                    <button
                      part="retry-button"
                      type="button"
                      @click=${this.#retryLoad}
                      style="margin-top: 0.5rem; min-height: auto; padding: 0.25rem 0.75rem;"
                    >
                      ${messages.retry}
                    </button>
                  </div>
                `
              : html`
                  <line-account-list
                    .type=${this.currentTab}
                    .items=${filtered}
                    .messages=${messages}
                    .disabledItemIds=${this.pendingItemIds}
                    .itemErrors=${this.itemErrors}
                    .variant=${this.variant}
                    .selectedItemId=${activeItem?.id}
                    @line-account-edit-request=${this.#openEdit}
                    @line-account-toggle-request=${this.#toggleItem}
                    @line-account-delete-request=${this.#openDelete}
                  ></line-account-list>
                `}
        </div>

        <div class="split-details">
          ${activeItem
            ? this.#renderItemDetails(messages, activeItem)
            : html`
                <div class="details-empty-state">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="width: 3rem; height: 3rem; margin-bottom: 1rem; color: var(--line-account-muted-color, #8a9ba8)"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <h3>No Selection</h3>
                  <p style="font-size: 0.875rem; max-width: 16rem; margin-top: 0.25rem;">
                    Select an item from the sidebar or add a new one to view details.
                  </p>
                </div>
              `}
        </div>
      </div>
    `;
  }

  #renderItemDetails(
    messages: LineAccountManagementMessages,
    item: ProviderView | ChannelView | LiffAppView,
  ) {
    const isPending = this.pendingItemIds.has(item.id);

    if (this.currentTab === "provider") {
      const provider = item as ProviderView;
      const initial = provider.name.trim().charAt(0).toUpperCase();

      return html`
        <div class="details-header">
          <div class="details-identity">
            <span class="details-initial details-initial-provider">${initial}</span>
            <div class="details-title-group">
              <h2>${provider.name}</h2>
              <div class="details-basic-id">Provider ID: ${provider.id}</div>
            </div>
          </div>
        </div>

        <div class="details-grid">
          <div class="details-section">
            <div class="details-section-title">Timeline</div>
            <div class="details-row">
              <span class="details-label">Created At</span>
              <span class="details-value">${provider.createdAt.toLocaleString()}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Updated At</span>
              <span class="details-value">${provider.updatedAt.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="details-actions">
          <button
            class="action-btn"
            type="button"
            ?disabled=${isPending}
            @click=${() => this.#triggerEdit(provider)}
            style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
          >
            Edit
          </button>
          <button
            class="danger"
            type="button"
            ?disabled=${isPending}
            @click=${() => this.#triggerDelete(provider)}
            style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
          >
            Delete
          </button>
        </div>
      `;
    }

    if (this.currentTab === "channel") {
      const channel = item as ChannelView;
      const isMessaging = channel.channelType === "messaging";
      const messagingChannel = channel.channelType === "messaging" ? channel : undefined;
      const initial = channel.name.trim().charAt(0).toUpperCase();

      return html`
        <div class="details-header">
          <div class="details-identity">
            ${isMessaging && channel.pictureUrl
              ? html`<img class="details-avatar" src=${channel.pictureUrl} alt=${channel.name} />`
              : html`<span
                  class="details-initial ${isMessaging
                    ? "details-initial-channel-messaging"
                    : "details-initial-channel-login"}"
                  >${initial}</span
                >`}
            <div class="details-title-group">
              <h2>${channel.name}</h2>
              <div class="details-basic-id">Channel ID: ${channel.channelId}</div>
            </div>
          </div>
          ${isMessaging && this.adapter !== undefined
            ? html`
                <button
                  class="switch ${channel.isActive ? "checked" : ""}"
                  part="status-button"
                  role="switch"
                  aria-checked=${channel.isActive ? "true" : "false"}
                  aria-label=${channel.isActive ? "Deactivate Channel" : "Activate Channel"}
                  ?disabled=${isPending}
                  @click=${() => this.#performToggle(channel)}
                >
                  <span class="switch-thumb"></span>
                </button>
              `
            : ""}
        </div>

        <div class="details-grid">
          <div class="details-section">
            <div class="details-section-title">Channel Details</div>
            <div class="details-row">
              <span class="details-label">Type</span>
              <span class="details-value"
                >${channel.channelType === "messaging" ? "Messaging API" : "LINE Login"}</span
              >
            </div>
            <div class="details-row">
              <span class="details-label">Record ID</span>
              <span class="details-value">${channel.id}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Provider ID</span>
              <span class="details-value">${channel.providerId}</span>
            </div>
          </div>

          ${isMessaging
            ? html`
                <div class="details-section">
                  <div class="details-section-title">Messaging Info</div>
                  ${messagingChannel?.displayName
                    ? html`<div class="details-row">
                        <span class="details-label">Display Name</span>
                        <span class="details-value">${messagingChannel.displayName}</span>
                      </div>`
                    : ""}
                  ${messagingChannel?.botUserId
                    ? html`<div class="details-row">
                        <span class="details-label">Bot User ID</span>
                        <span class="details-value">${messagingChannel.botUserId}</span>
                      </div>`
                    : ""}
                </div>
              `
            : ""}
        </div>

        <div class="details-actions">
          ${isMessaging
            ? html`<button
                class="action-btn"
                type="button"
                ?disabled=${isPending}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.dispatchEvent(
                    new CustomEvent("line-account-sync-request", {
                      bubbles: true,
                      composed: true,
                      detail: { item: channel },
                    }),
                  );
                }}
                style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem; margin-right: auto;"
              >
                Sync
              </button>`
            : ""}
          <button
            class="action-btn"
            type="button"
            ?disabled=${isPending}
            @click=${() => this.#triggerEdit(channel)}
            style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
          >
            Edit
          </button>
          <button
            class="danger"
            type="button"
            ?disabled=${isPending}
            @click=${() => this.#triggerDelete(channel)}
            style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
          >
            Delete
          </button>
        </div>
      `;
    }

    // LIFF
    const liff = item as LiffAppView;
    return html`
      <div class="details-header">
        <div class="details-identity">
          <span class="details-initial details-initial-liff">L</span>
          <div class="details-title-group">
            <h2>LIFF: ${liff.liffId}</h2>
            <div class="details-basic-id">Login Channel Record ID: ${liff.loginChannelId}</div>
          </div>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-section">
          <div class="details-section-title">LIFF Settings</div>
          <div class="details-row">
            <span class="details-label">LIFF App ID</span>
            <span class="details-value">${liff.id}</span>
          </div>
          <div class="details-row">
            <span class="details-label">View Type</span>
            <span class="details-value">${liff.view.type.toUpperCase()}</span>
          </div>
          <div class="details-row">
            <span class="details-label">View URL</span>
            <span class="details-value">${liff.view.url}</span>
          </div>
        </div>

        ${liff.description
          ? html`
              <div class="details-section">
                <div class="details-section-title">Description</div>
                <div
                  style="font-size: 0.875rem; line-height: 1.5; color: var(--line-account-text-color, #1f2933)"
                >
                  ${liff.description}
                </div>
              </div>
            `
          : ""}
      </div>

      <div class="details-actions">
        <button
          class="action-btn"
          type="button"
          ?disabled=${isPending}
          @click=${() => this.#triggerEdit(liff)}
          style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
        >
          Edit
        </button>
        <button
          class="danger"
          type="button"
          ?disabled=${isPending}
          @click=${() => this.#triggerDelete(liff)}
          style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
        >
          Delete
        </button>
      </div>
    `;
  }

  #triggerEdit = (item: ProviderView | ChannelView | LiffAppView): void => {
    this.selectedItem = item;
    this.mutationError = undefined;
    this.dialogKind = "edit";
  };

  #triggerDelete = (item: ProviderView | ChannelView | LiffAppView): void => {
    this.selectedItem = item;
    this.mutationError = undefined;
    this.dialogKind = "delete";
  };

  #renderCollection(
    messages: LineAccountManagementMessages,
    filtered: readonly (ProviderView | ChannelView | LiffAppView)[],
  ) {
    if (this.adapter === undefined) {
      return html`
        <section class="state" role="alert" aria-labelledby="adapter-heading">
          <h2 id="adapter-heading">Adapter Missing</h2>
          <p>${messages.adapterMissingDescription}</p>
        </section>
      `;
    }

    if (this.loading) {
      return html`
        <div class="spinner-container" role="status" aria-live="polite">
          <div class="spinner"></div>
          <p style="margin: 0; font-weight: 550; color: var(--line-account-muted-color, #52606d)">
            Loading content...
          </p>
        </div>
      `;
    }

    if (this.loadError) {
      return html`
        <section class="error" role="alert">
          <p>${messages.loadFailure}</p>
          <button part="retry-button" type="button" @click=${this.#retryLoad}>
            ${messages.retry}
          </button>
        </section>
      `;
    }

    return html`
      <line-account-list
        .type=${this.currentTab}
        .items=${filtered}
        .messages=${messages}
        .disabledItemIds=${this.pendingItemIds}
        .itemErrors=${this.itemErrors}
        .variant=${this.variant}
        @line-account-edit-request=${this.#openEdit}
        @line-account-toggle-request=${this.#toggleItem}
        @line-account-delete-request=${this.#openDelete}
      ></line-account-list>
    `;
  }

  get #resolvedMessages(): LineAccountManagementMessages {
    return { ...defaultLineAccountManagementMessages, ...this.messages };
  }

  #showNotice(text: string): void {
    this.notice = text;
    if (this.#noticeTimeoutId !== undefined) {
      window.clearTimeout(this.#noticeTimeoutId);
    }
    this.#noticeTimeoutId = window.setTimeout(() => {
      this.notice = undefined;
      this.#noticeTimeoutId = undefined;
    }, 5000);
  }

  #dismissNotice = (): void => {
    if (this.#noticeTimeoutId !== undefined) {
      window.clearTimeout(this.#noticeTimeoutId);
      this.#noticeTimeoutId = undefined;
    }
    this.notice = undefined;
  };

  #openCreate = (): void => {
    if (this.adapter === undefined) return;
    this.shadowRoot
      ?.querySelector<LineAccountForm>('line-account-dialog[data-kind="create"] line-account-form')
      ?.reset();
    this.selectedItem = undefined;
    this.mutationError = undefined;
    this.dialogKind = "create";
  };

  #retryLoad = (): void => {
    void this.reload();
  };

  #openEdit = (event: CustomEvent<LineAccountRequestDetail>): void => {
    this.selectedItem = event.detail.item;
    this.mutationError = undefined;
    this.dialogKind = "edit";
  };

  #openDelete = (event: CustomEvent<LineAccountRequestDetail>): void => {
    this.selectedItem = event.detail.item;
    this.mutationError = undefined;
    this.dialogKind = "delete";
  };

  #closeDialog = (): void => {
    if (this.createPending || this.editPending || this.deletePending) return;
    this.dialogKind = undefined;
    this.selectedItem = undefined;
    this.mutationError = undefined;
  };

  #submitDialogForm(kind: "create" | "edit"): void {
    this.shadowRoot
      ?.querySelector<LineAccountForm>(`line-account-dialog[data-kind="${kind}"] line-account-form`)
      ?.submit();
  }

  #handleFormSubmit = (event: CustomEvent<LineAccountFormSubmitDetail>): void => {
    const detail = event.detail;
    if (detail.mode === "create") {
      void this.#createItem(detail.type, detail.input);
    } else {
      void this.#updateItem(detail.type, this.selectedItem!.id, detail.input);
    }
  };

  async #createItem(type: LineAccountFormType, input: any): Promise<void> {
    const adapter = this.adapter;
    if (adapter === undefined || this.createPending) return;
    this.createPending = true;
    this.mutationError = undefined;
    try {
      let created;
      if (type === "provider") {
        created = await adapter.createProvider(input);
      } else if (type === "channel") {
        created = await adapter.createChannel(input);
      } else {
        created = await adapter.createLiffApp(input);
      }

      this.dialogKind = undefined;
      this.#showNotice(this.#resolvedMessages.createSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent("line-account-created", eventOptions({ item: created, type })),
      );
    } catch (error) {
      this.mutationError = this.#resolvedMessages.createFailure;
      this.#emitError("createProvider", error); // Simple fallback operation name
    } finally {
      this.createPending = false;
    }
  }

  async #updateItem(type: LineAccountFormType, id: string, input: any): Promise<void> {
    const adapter = this.adapter;
    if (adapter === undefined || this.editPending) return;
    if (Object.keys(input).length === 0) {
      this.#closeDialog();
      return;
    }

    this.editPending = true;
    this.mutationError = undefined;
    try {
      let updated;
      if (type === "provider") {
        updated = await adapter.updateProvider(id, input);
      } else if (type === "channel") {
        updated = await adapter.updateChannel(id, input);
      } else {
        updated = await adapter.updateLiffApp(id, input);
      }

      this.dialogKind = undefined;
      this.selectedItem = undefined;
      this.#showNotice(this.#resolvedMessages.updateSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent("line-account-updated", eventOptions({ item: updated, type })),
      );
    } catch (error) {
      this.mutationError = this.#resolvedMessages.updateFailure;
      this.#emitError("updateProvider", error);
    } finally {
      this.editPending = false;
    }
  }

  #toggleItem = (event: CustomEvent<LineAccountRequestDetail>): void => {
    void this.#performToggle(event.detail.item as ChannelView);
  };

  async #performToggle(channel: ChannelView): Promise<void> {
    const adapter = this.adapter;
    if (adapter === undefined || this.pendingItemIds.has(channel.id)) return;
    this.pendingItemIds = new Set([...this.pendingItemIds, channel.id]);
    const itemErrors = new Map(this.itemErrors);
    itemErrors.delete(channel.id);
    this.itemErrors = itemErrors;
    try {
      const isActive = channel.channelType === "messaging" ? channel.isActive : false;
      const updated = await adapter.updateChannel(channel.id, { isActive: !isActive });
      this.#showNotice(this.#resolvedMessages.updateSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent("line-account-updated", eventOptions({ item: updated, type: "channel" })),
      );
    } catch (error) {
      this.itemErrors = new Map(this.itemErrors).set(channel.id, "Failed to toggle status");
      this.#emitError("updateChannel", error);
    } finally {
      const pending = new Set(this.pendingItemIds);
      pending.delete(channel.id);
      this.pendingItemIds = pending;
    }
  }

  #deleteSelectedItem = (): void => {
    void this.#performDelete();
  };

  async #performDelete(): Promise<void> {
    const adapter = this.adapter;
    const item = this.selectedItem;
    if (adapter === undefined || item === undefined || this.deletePending) return;
    this.deletePending = true;
    this.mutationError = undefined;
    const type = this.currentTab;
    try {
      if (type === "provider") {
        await adapter.deleteProvider(item.id);
      } else if (type === "channel") {
        await adapter.deleteChannel(item.id);
      } else {
        await adapter.deleteLiffApp(item.id);
      }

      this.dialogKind = undefined;
      this.selectedItem = undefined;
      this.#showNotice(this.#resolvedMessages.deleteSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent("line-account-deleted", eventOptions({ id: item.id, type })),
      );
    } catch (error) {
      this.mutationError = this.#resolvedMessages.deleteFailure;
      this.#emitError("deleteProvider", error);
    } finally {
      this.deletePending = false;
    }
  }

  #emitError(operation: LineAccountOperation, error: unknown): void {
    this.dispatchEvent(
      new CustomEvent<LineAccountErrorEventDetail>(
        "line-account-error",
        eventOptions({ operation, error }),
      ),
    );
  }
}
