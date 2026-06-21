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
import "./line-account-toolbar.ts";
import "./line-account-breadcrumbs.ts";
import "./line-account-detail-panel.ts";
import "./line-account-hierarchy.ts";

type DialogKind = "create" | "edit" | "delete" | undefined;

const eventOptions = <T>(detail: T): CustomEventInit<T> => ({
  bubbles: true,
  composed: true,
  detail,
});

const adapterEntityId = (
  item: ProviderView | ChannelView | LiffAppView,
  type: LineAccountFormType,
): string => {
  if (type === "channel") return (item as ChannelView).channelId;
  if (type === "liff") return (item as LiffAppView).liffId;
  return (item as ProviderView).id;
};

/** LitElement top-level management component that orchestrates provider, channel, and LIFF app CRUD operations via an adapter. */
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
    selectedProviderId: { type: String, attribute: "selected-provider-id" }, // Filter channels by provider
    selectedChannelId: { type: String, attribute: "selected-channel-id" }, // Filter LIFF apps by login channel
    selectedLiffId: { type: String, attribute: "selected-liff-id" },
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
  declare selectedLiffId: string | undefined;

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
    this.selectedLiffId = undefined;

    this.addEventListener("line-account-select-request", (event) => {
      const { type, item } = (event as CustomEvent<LineAccountRequestDetail>).detail;
      this.selectedItemId = item.id;

      if (type === "provider") {
        this.selectedProviderId = item.id;
        if (this.variant !== "split") {
          this.currentTab = "channel";
          this.selectedItemId = undefined;
        }
      } else if (type === "channel") {
        const c = item as ChannelView;
        this.selectedProviderId = c.providerId;
        this.selectedChannelId = c.channelId;
        if (this.variant !== "split" && c.channelType === "login") {
          this.currentTab = "liff";
          this.selectedItemId = undefined;
        }
      } else if (type === "liff") {
        const l = item as LiffAppView;
        this.selectedLiffId = l.id;
        this.selectedChannelId = l.loginChannelId;
        const parentChannel = this.channels.find((c) => c.channelId === l.loginChannelId);
        if (parentChannel) {
          this.selectedProviderId = parentChannel.providerId;
        }
      }
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

  willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("selectedItemId")) {
      if (this.selectedItemId) {
        const id = this.selectedItemId;
        const liff = this.liffApps.find((l) => l.id === id);
        if (liff) {
          this.selectedLiffId = liff.id;
          this.selectedChannelId = liff.loginChannelId;
          const channel = this.channels.find((c) => c.channelId === liff.loginChannelId);
          if (channel) {
            this.selectedProviderId = channel.providerId;
          }
        } else {
          const channel = this.channels.find((c) => c.id === id);
          if (channel) {
            this.selectedChannelId = channel.channelId;
            this.selectedProviderId = channel.providerId;
            this.selectedLiffId = undefined;
          } else {
            const provider = this.providers.find((p) => p.id === id);
            if (provider) {
              this.selectedProviderId = provider.id;
              this.selectedChannelId = "";
              this.selectedLiffId = undefined;
            }
          }
        }
      } else {
        this.selectedLiffId = undefined;
      }
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

    let activeItem = this.providers.find((p) => p.id === this.selectedItemId) as
      | ProviderView
      | ChannelView
      | LiffAppView
      | undefined;
    if (!activeItem) {
      activeItem = this.channels.find((c) => c.id === this.selectedItemId);
    }
    if (!activeItem) {
      activeItem = this.liffApps.find((l) => l.id === this.selectedItemId);
    }

    if (!activeItem) {
      const filtered = this.#resolvedItems();
      if (filtered.length > 0) {
        activeItem = filtered[0];
      }
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

        ${this.loading
          ? html`
              <div class="spinner-container" role="status" aria-live="polite">
                <div class="spinner"></div>
                <p
                  style="margin: 0; font-weight: 550; color: var(--line-account-muted-color, #52606d)"
                >
                  Loading content...
                </p>
              </div>
            `
          : this.loadError
            ? html`
                <section class="error" role="alert">
                  <p>${messages.loadFailure}</p>
                  <button part="retry-button" type="button" @click=${this.#retryLoad}>
                    ${messages.retry}
                  </button>
                </section>
              `
            : html`
                <line-account-toolbar
                  .searchQuery=${this.searchQuery}
                  .variant=${this.variant}
                  .currentTab=${this.currentTab}
                  .providers=${this.providers}
                  .channels=${this.channels}
                  .selectedProviderId=${this.selectedProviderId}
                  .selectedChannelId=${this.selectedChannelId}
                  @search-change=${this.#onToolbarSearch}
                  @variant-change=${this.#onToolbarVariant}
                  @provider-filter-change=${this.#onToolbarProviderFilter}
                  @channel-filter-change=${this.#onToolbarChannelFilter}
                ></line-account-toolbar>

                ${this.variant !== "split"
                  ? html`
                      <line-account-hierarchy
                        .providers=${this.providers}
                        .channels=${this.channels}
                        .liffApps=${this.liffApps}
                        .messages=${messages}
                        .pendingItemIds=${this.pendingItemIds}
                        .itemErrors=${this.itemErrors}
                        .selectedItemId=${this.selectedItemId}
                        .selectedProviderId=${this.selectedProviderId}
                        .selectedChannelId=${this.selectedChannelId}
                        .selectedLiffId=${this.selectedLiffId}
                        .variant=${this.variant}
                        .searchQuery=${this.searchQuery}
                        @hierarchy-select=${this.#onHierarchySelect}
                        @hierarchy-edit=${this.#onHierarchyEdit}
                        @hierarchy-delete=${this.#onHierarchyDelete}
                        @hierarchy-toggle=${this.#onHierarchyToggle}
                        @hierarchy-sync=${this.#onHierarchySync}
                        @hierarchy-add-provider=${this.#openCreate}
                        @hierarchy-add-channel=${this.#onHierarchyAddChannel}
                        @hierarchy-add-liff=${this.#onHierarchyAddLiff}
                      ></line-account-hierarchy>
                    `
                  : this.#renderSplitPane(messages, activeItem)}
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
          .selectedProviderId=${this.selectedProviderId}
          .selectedChannelId=${this.selectedChannelId}
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
          .selectedProviderId=${this.selectedProviderId}
          .selectedChannelId=${this.selectedChannelId}
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

  #onToolbarSearch = (event: CustomEvent<{ value: string }>): void => {
    this.searchQuery = event.detail.value;
  };

  #onToolbarVariant = (event: CustomEvent<{ variant: string }>): void => {
    this.variant = event.detail.variant;
  };

  #onToolbarProviderFilter = (event: CustomEvent<{ value: string }>): void => {
    this.selectedProviderId = event.detail.value;
    this.selectedItemId = undefined;
  };

  #onToolbarChannelFilter = (event: CustomEvent<{ value: string }>): void => {
    this.selectedChannelId = event.detail.value;
    this.selectedItemId = undefined;
  };

  #drillDownToChannel = (channel: ChannelView): void => {
    this.selectedProviderId = channel.providerId;
    this.selectedChannelId = channel.channelId;
    this.selectedItemId = channel.id;
    this.currentTab = "channel";
  };

  #drillDownToLiff = (liff: LiffAppView): void => {
    this.selectedChannelId = liff.loginChannelId;
    const parentChannel = this.channels.find((c) => c.channelId === liff.loginChannelId);
    if (parentChannel) {
      this.selectedProviderId = parentChannel.providerId;
    }
    this.selectedItemId = liff.id;
    this.currentTab = "liff";
  };

  #openCreateChannelForProvider = (providerId: string): void => {
    this.selectedProviderId = providerId;
    this.currentTab = "channel";
    this.#openCreate();
  };

  #openCreateLiffForChannel = (channelId: string): void => {
    this.selectedChannelId = channelId;
    const parentChannel = this.channels.find((c) => c.channelId === channelId);
    if (parentChannel) {
      this.selectedProviderId = parentChannel.providerId;
    }
    this.currentTab = "liff";
    this.#openCreate();
  };

  #renderSplitPane(
    messages: LineAccountManagementMessages,
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

          <line-account-hierarchy
            .providers=${this.providers}
            .channels=${this.channels}
            .liffApps=${this.liffApps}
            .messages=${messages}
            .pendingItemIds=${this.pendingItemIds}
            .itemErrors=${this.itemErrors}
            .selectedItemId=${this.selectedItemId}
            .selectedProviderId=${this.selectedProviderId}
            .selectedChannelId=${this.selectedChannelId}
            .selectedLiffId=${this.selectedLiffId}
            .variant=${this.variant}
            .searchQuery=${this.searchQuery}
            @hierarchy-select=${this.#onHierarchySelect}
            @hierarchy-edit=${this.#onHierarchyEdit}
            @hierarchy-delete=${this.#onHierarchyDelete}
            @hierarchy-toggle=${this.#onHierarchyToggle}
            @hierarchy-sync=${this.#onHierarchySync}
            @hierarchy-add-provider=${this.#openCreate}
            @hierarchy-add-channel=${this.#onHierarchyAddChannel}
            @hierarchy-add-liff=${this.#onHierarchyAddLiff}
          ></line-account-hierarchy>
        </div>

        <line-account-detail-panel
          .item=${activeItem}
          .currentTab=${this.currentTab}
          .providers=${this.providers}
          .channels=${this.channels}
          .liffApps=${this.liffApps}
          .pendingItemIds=${this.pendingItemIds}
          .messages=${messages}
          .readonly=${false}
          @detail-edit=${this.#onDetailEdit}
          @detail-delete=${this.#onDetailDelete}
          @detail-toggle=${this.#onDetailToggle}
          @detail-sync=${this.#onDetailSync}
          @detail-drill-channel=${this.#onDetailDrillChannel}
          @detail-drill-liff=${this.#onDetailDrillLiff}
          @detail-create-channel=${this.#onDetailCreateChannel}
          @detail-create-liff=${this.#onDetailCreateLiff}
        ></line-account-detail-panel>
      </div>
    `;
  }

  #onDetailEdit = (
    event: CustomEvent<{ item: ProviderView | ChannelView | LiffAppView }>,
  ): void => {
    this.selectedItem = event.detail.item;
    this.mutationError = undefined;
    this.dialogKind = "edit";
  };

  #onDetailDelete = (
    event: CustomEvent<{ item: ProviderView | ChannelView | LiffAppView }>,
  ): void => {
    this.selectedItem = event.detail.item;
    this.mutationError = undefined;
    this.dialogKind = "delete";
  };

  #onDetailToggle = (event: CustomEvent<{ item: ChannelView }>): void => {
    void this.#performToggle(event.detail.item);
  };

  #onDetailSync = (event: CustomEvent<{ item: ChannelView }>): void => {
    void this.#performSync(event.detail.item);
  };

  #onDetailDrillChannel = (event: CustomEvent<{ channel: ChannelView }>): void => {
    this.#drillDownToChannel(event.detail.channel);
  };

  #onDetailDrillLiff = (event: CustomEvent<{ liff: LiffAppView }>): void => {
    this.#drillDownToLiff(event.detail.liff);
  };

  #onDetailCreateChannel = (event: CustomEvent<{ providerId: string }>): void => {
    this.#openCreateChannelForProvider(event.detail.providerId);
  };

  #onDetailCreateLiff = (event: CustomEvent<{ channelId: string }>): void => {
    this.#openCreateLiffForChannel(event.detail.channelId);
  };

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
      const id =
        this.selectedItem !== undefined ? adapterEntityId(this.selectedItem, detail.type) : "";
      void this.#updateItem(detail.type, id, detail.input);
    }
  };

  async #createItem(type: LineAccountFormType, input: any): Promise<void> {
    const adapter = this.adapter;
    if (adapter === undefined || this.createPending) return;
    this.createPending = true;
    this.mutationError = undefined;
    try {
      let created: ProviderView | ChannelView | LiffAppView;
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
      let updated: ProviderView | ChannelView | LiffAppView;
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

  async #performSync(channel: ChannelView): Promise<void> {
    const adapter = this.adapter;
    if (!adapter || channel.channelType !== "messaging" || !adapter.syncChannel) return;

    this.pendingItemIds = new Set(this.pendingItemIds).add(channel.id);
    const itemErrors = new Map(this.itemErrors);
    itemErrors.delete(channel.id);
    this.itemErrors = itemErrors;

    try {
      const updated = await adapter.syncChannel(channel.channelId);
      this.#showNotice(this.#resolvedMessages.updateSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent("line-account-updated", eventOptions({ item: updated, type: "channel" })),
      );
    } catch (error) {
      this.itemErrors = new Map(this.itemErrors).set(
        channel.id,
        this.#resolvedMessages.updateFailure,
      );
      this.#emitError("syncChannel", error);
    } finally {
      const pending = new Set(this.pendingItemIds);
      pending.delete(channel.id);
      this.pendingItemIds = pending;
    }
  }

  async #performToggle(channel: ChannelView): Promise<void> {
    const adapter = this.adapter;
    if (adapter === undefined || this.pendingItemIds.has(channel.id)) return;
    this.pendingItemIds = new Set([...this.pendingItemIds, channel.id]);
    const itemErrors = new Map(this.itemErrors);
    itemErrors.delete(channel.id);
    this.itemErrors = itemErrors;
    try {
      const isActive = channel.channelType === "messaging" ? channel.isActive : false;
      const updated = await adapter.updateChannel(channel.channelId, { isActive: !isActive });
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
        await adapter.deleteChannel((item as ChannelView).channelId);
      } else {
        await adapter.deleteLiffApp((item as LiffAppView).liffId);
      }

      this.dialogKind = undefined;
      this.selectedItem = undefined;
      this.#showNotice(this.#resolvedMessages.deleteSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent(
          "line-account-deleted",
          eventOptions({ id: adapterEntityId(item, type), type }),
        ),
      );
    } catch (error) {
      this.mutationError = this.#resolvedMessages.deleteFailure;
      this.#emitError("deleteProvider", error);
    } finally {
      this.deletePending = false;
    }
  }

  #onHierarchySelect = (event: CustomEvent<{ item: any; type: LineAccountFormType }>): void => {
    const { item, type } = event.detail;
    if (item === null || item === undefined) {
      this.selectedItemId = undefined;
      if (type === "provider") {
        const oldProviderId = this.selectedProviderId;
        this.selectedProviderId = "";
        const channel = this.channels.find((c) => c.channelId === this.selectedChannelId);
        if (channel && channel.providerId === oldProviderId) {
          this.selectedChannelId = "";
          this.selectedLiffId = undefined;
        }
      } else if (type === "channel") {
        const oldChannelId = this.selectedChannelId;
        this.selectedChannelId = "";
        if (this.selectedLiffId) {
          const liff = this.liffApps.find((l) => l.id === this.selectedLiffId);
          if (liff && liff.loginChannelId === oldChannelId) {
            this.selectedLiffId = undefined;
          }
        }
      } else if (type === "liff") {
        this.selectedLiffId = undefined;
      }
      return;
    }
    this.selectedItemId = item.id;
    this.currentTab = type;

    if (type === "provider") {
      this.selectedProviderId = item.id;
    } else if (type === "channel") {
      const c = item as ChannelView;
      this.selectedProviderId = c.providerId;
      this.selectedChannelId = c.channelId;
    } else if (type === "liff") {
      const l = item as LiffAppView;
      this.selectedLiffId = l.id;
      this.selectedChannelId = l.loginChannelId;
      const parentChannel = this.channels.find((c) => c.channelId === l.loginChannelId);
      if (parentChannel) {
        this.selectedProviderId = parentChannel.providerId;
      }
    }
  };

  #onHierarchyEdit = (event: CustomEvent<{ item: any }>): void => {
    this.selectedItem = event.detail.item;
    this.currentTab = this.#typeOfItem(this.selectedItem!);
    this.mutationError = undefined;
    this.dialogKind = "edit";
  };

  #onHierarchyDelete = (event: CustomEvent<{ item: any }>): void => {
    this.selectedItem = event.detail.item;
    this.currentTab = this.#typeOfItem(this.selectedItem!);
    this.mutationError = undefined;
    this.dialogKind = "delete";
  };

  #onHierarchyToggle = (event: CustomEvent<{ item: ChannelView }>): void => {
    void this.#performToggle(event.detail.item);
  };

  #onHierarchySync = (event: CustomEvent<{ item: ChannelView }>): void => {
    void this.#performSync(event.detail.item);
  };

  #onHierarchyAddChannel = (event: CustomEvent<{ providerId: string }>): void => {
    this.selectedProviderId = event.detail.providerId;
    this.currentTab = "channel";
    this.#openCreate();
  };

  #onHierarchyAddLiff = (event: CustomEvent<{ channelId: string }>): void => {
    this.selectedChannelId = event.detail.channelId;
    const parentChannel = this.channels.find((c) => c.channelId === event.detail.channelId);
    if (parentChannel) {
      this.selectedProviderId = parentChannel.providerId;
    }
    this.currentTab = "liff";
    this.#openCreate();
  };

  #typeOfItem(item: any): LineAccountFormType {
    if ("channelType" in item) return "channel";
    if ("liffId" in item) return "liff";
    return "provider";
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
