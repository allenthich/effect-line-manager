import { LitElement, css, html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type { LineAccountForm } from "./line-account-form.ts";
import type {
  CreateLineAccountInput,
  LineAccountErrorEventDetail,
  LineAccountFormSubmitDetail,
  LineAccountManagementAdapter,
  LineAccountOperation,
  LineAccountRequestDetail,
  LineAccountView,
  UpdateLineAccountInput,
} from "./types.ts";

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
    accounts: { state: true },
    loading: { state: true },
    loadError: { state: true },
    dialogKind: { state: true },
    selectedAccount: { state: true },
    mutationError: { state: true },
    notice: { state: true },
    accountErrors: { state: true },
    createPending: { state: true },
    editPending: { state: true },
    deletePending: { state: true },
    pendingAccountIds: { state: true },
    variant: { type: String, reflect: true },
    searchQuery: { state: true },
    selectedListAccountId: { state: true },
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

    .state h2,
    .state p,
    .error p {
      margin-bottom: var(--line-account-space-3, 0.75rem);
    }

    .dialog-copy {
      line-height: 1.6;
    }

    @media (max-width: 36rem) {
      .header {
        align-items: stretch;
        flex-direction: column;
      }
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
      background: linear-gradient(135deg, var(--line-account-primary-color, #06c755), #049f43);
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      box-shadow: 0 4px 10px rgb(6 199 85 / 25%);
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

    @container (max-width: 36rem) {
      .header {
        align-items: stretch;
        flex-direction: column;
      }
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

  declare adapter: LineAccountManagementAdapter | undefined;
  declare messages: Partial<LineAccountManagementMessages> | undefined;
  declare accounts: readonly LineAccountView[];
  declare loading: boolean;
  declare loadError: boolean;
  declare dialogKind: DialogKind;
  declare selectedAccount: LineAccountView | undefined;
  declare mutationError: string | undefined;
  declare notice: string | undefined;
  declare accountErrors: ReadonlyMap<string, string>;
  declare createPending: boolean;
  declare editPending: boolean;
  declare deletePending: boolean;
  declare pendingAccountIds: ReadonlySet<string>;
  declare variant: string;
  declare searchQuery: string;
  declare selectedListAccountId: string | undefined;

  #loadGeneration = 0;
  #lastAdapter: LineAccountManagementAdapter | undefined;
  #noticeTimeoutId: number | undefined;

  constructor() {
    super();
    this.adapter = undefined;
    this.messages = undefined;
    this.accounts = [];
    this.loading = false;
    this.loadError = false;
    this.dialogKind = undefined;
    this.selectedAccount = undefined;
    this.mutationError = undefined;
    this.notice = undefined;
    this.accountErrors = new Map();
    this.createPending = false;
    this.editPending = false;
    this.deletePending = false;
    this.pendingAccountIds = new Set();
    this.variant = "grid";
    this.searchQuery = "";
    this.selectedListAccountId = undefined;

    this.addEventListener("line-account-select-request", (event) => {
      const { account } = (event as CustomEvent<{ account: LineAccountView }>).detail;
      this.selectedListAccountId = account.id;
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
      this.accounts = [];
      return;
    }

    this.loading = true;
    try {
      const accounts = await adapter.list();
      if (generation !== this.#loadGeneration || this.adapter !== adapter) return;
      this.accounts = [...accounts];
      if (
        this.accounts.length > 0 &&
        !this.accounts.some((acc) => acc.id === this.selectedListAccountId)
      ) {
        this.selectedListAccountId = this.accounts[0].id;
      }
    } catch (error) {
      if (generation !== this.#loadGeneration || this.adapter !== adapter) return;
      this.accounts = [];
      this.loadError = true;
      this.#emitError("list", error);
    } finally {
      if (generation === this.#loadGeneration && this.adapter === adapter) this.loading = false;
    }
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("adapter") && this.adapter !== this.#lastAdapter) {
      this.#lastAdapter = this.adapter;
      void this.reload();
    }
  }

  protected render() {
    const messages = this.#resolvedMessages;

    const filtered = this.accounts.filter((account) => {
      const query = this.searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        account.name.toLowerCase().includes(query) ||
        (account.displayName && account.displayName.toLowerCase().includes(query)) ||
        account.channelId.includes(query) ||
        (account.basicId && account.basicId.toLowerCase().includes(query))
      );
    });

    let activeAccount = this.accounts.find((a) => a.id === this.selectedListAccountId);
    if (!activeAccount && filtered.length > 0) {
      activeAccount = filtered[0];
    }

    return html`
      <section class="page" part="page">
        ${this.variant !== "split"
          ? html`
              <header class="header" part="header">
                <div class="header-copy">
                  <h1 part="title">${messages.title}</h1>
                  <p class="description">${messages.description}</p>
                </div>
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
                  ${messages.addAccount}
                </button>
              </header>
              ${this.#renderToolbar()} ${this.#renderCollection(messages, filtered)}
            `
          : html`
              <header class="header" part="header" style="margin-bottom: 1rem;">
                <div class="header-copy">
                  <h1 part="title">${messages.title}</h1>
                  <p class="description">${messages.description}</p>
                </div>
              </header>
              ${this.#renderToolbar()} ${this.#renderSplitPane(messages, filtered, activeAccount)}
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
        : nothing}

      <line-account-dialog
        data-kind="create"
        .open=${this.dialogKind === "create"}
        .heading=${messages.createHeading}
        @line-account-dialog-close-request=${this.#closeDialog}
      >
        <line-account-form
          .mode=${"create"}
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
      </line-account-dialog>

      <line-account-dialog
        data-kind="edit"
        .open=${this.dialogKind === "edit"}
        .heading=${messages.editHeading}
        @line-account-dialog-close-request=${this.#closeDialog}
      >
        <line-account-form
          .mode=${"edit"}
          .account=${this.selectedAccount}
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
      </line-account-dialog>

      <line-account-dialog
        data-kind="delete"
        .open=${this.dialogKind === "delete"}
        .heading=${messages.deleteHeading}
        @line-account-dialog-close-request=${this.#closeDialog}
      >
        <p class="dialog-copy">
          ${this.selectedAccount === undefined
            ? ""
            : messages.deleteConfirmation(
                this.selectedAccount.displayName?.trim() || this.selectedAccount.name,
              )}
        </p>
        ${this.dialogKind === "delete" && this.mutationError
          ? html`<p class="error" role="alert">${this.mutationError}</p>`
          : nothing}
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
          @click=${this.#deleteSelectedAccount}
        >
          ${this.deletePending ? messages.deletingAccount : messages.confirmDelete}
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
            placeholder="Search accounts..."
            .value=${this.searchQuery}
            @input=${this.#handleSearchInput}
            aria-label="Search accounts"
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
            : nothing}
        </div>
        <div class="variant-switcher">
          <button
            class="variant-btn ${this.variant === "grid" ? "active" : ""}"
            type="button"
            @click=${() => this.#setVariant("grid")}
          >
            Grid
          </button>
          <button
            class="variant-btn ${this.variant === "list" ? "active" : ""}"
            type="button"
            @click=${() => this.#setVariant("list")}
          >
            Table
          </button>
          <button
            class="variant-btn ${this.variant === "split" ? "active" : ""}"
            type="button"
            @click=${() => this.#setVariant("split")}
          >
            Split Pane
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

  #clearSearch = (): void => {
    this.searchQuery = "";
  };

  #setVariant = (variant: string): void => {
    this.variant = variant;
  };

  #renderSplitPane(
    messages: LineAccountManagementMessages,
    filtered: readonly LineAccountView[],
    activeAccount: LineAccountView | undefined,
  ) {
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
            ${messages.addAccount}
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
                    .accounts=${filtered}
                    .messages=${messages}
                    .disabledAccountIds=${this.pendingAccountIds}
                    .accountErrors=${this.accountErrors}
                    .variant=${this.variant}
                    .selectedAccountId=${activeAccount?.id}
                    @line-account-edit-request=${this.#openEdit}
                    @line-account-toggle-request=${this.#toggleAccount}
                    @line-account-delete-request=${this.#openDelete}
                  ></line-account-list>
                `}
        </div>

        <div class="split-details">
          ${activeAccount
            ? this.#renderAccountDetails(messages, activeAccount)
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
                  <h3>No Account Selected</h3>
                  <p style="font-size: 0.875rem; max-width: 16rem; margin-top: 0.25rem;">
                    Select an account from the sidebar or add a new one to view details.
                  </p>
                </div>
              `}
        </div>
      </div>
    `;
  }

  #renderAccountDetails(messages: LineAccountManagementMessages, account: LineAccountView) {
    const displayName = account.displayName?.trim() || account.name;
    const initial = displayName.trim().charAt(0).toUpperCase();
    const isPending = this.pendingAccountIds.has(account.id);

    return html`
      <div class="details-header">
        <div class="details-identity">
          ${account.pictureUrl
            ? html`<img class="details-avatar" src=${account.pictureUrl} alt=${displayName} />`
            : html`<span class="details-initial">${initial}</span>`}
          <div class="details-title-group">
            <h2>${displayName}</h2>
            ${account.basicId
              ? html`<div class="details-basic-id">${account.basicId}</div>`
              : nothing}
          </div>
        </div>
        <button
          class="switch ${account.isActive ? "checked" : ""}"
          part="status-button"
          role="switch"
          aria-checked=${account.isActive ? "true" : "false"}
          aria-label=${account.isActive ? messages.deactivateAccount : messages.activateAccount}
          ?disabled=${isPending || this.adapter === undefined}
          @click=${() => this.#performToggle(account)}
        >
          <span class="switch-thumb"></span>
        </button>
      </div>

      <div class="details-grid">
        <div class="details-section">
          <div class="details-section-title">${messages.messagingApiGroup}</div>
          <div class="details-row">
            <span class="details-label">${messages.channelIdLabel}</span>
            <div class="details-value-wrapper">
              <span class="details-value">${account.channelId}</span>
              <button
                class="copy-btn"
                type="button"
                aria-label="Copy Channel ID"
                @click=${() => this.#copyText(account.channelId, "Channel ID copied")}
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
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="details-row">
            <span class="details-label">Channel Status</span>
            <div class="status-container" style="margin-top: 0.25rem;">
              <span class="status-dot ${account.isActive ? "active" : "inactive"}"></span>
              <span style="font-size: 0.875rem; font-weight: 600;"
                >${account.isActive ? messages.activeStatus : messages.inactiveStatus}</span
              >
            </div>
          </div>
        </div>

        <div class="details-section">
          <div class="details-section-title">${messages.lineLoginGroup}</div>
          ${account.loginChannelId
            ? html`
                <div class="details-row">
                  <span class="details-label">${messages.loginChannelIdLabel}</span>
                  <div class="details-value-wrapper">
                    <span class="details-value">${account.loginChannelId}</span>
                    <button
                      class="copy-btn"
                      type="button"
                      aria-label="Copy LINE Login Channel ID"
                      @click=${() =>
                        this.#copyText(
                          account.loginChannelId || "",
                          "LINE Login Channel ID copied",
                        )}
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
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="details-row">
                  <span class="details-label">Status</span>
                  <span
                    class="badge configured"
                    style="margin-top: 0.25rem; align-self: flex-start;"
                    >${messages.loginConfigured}</span
                  >
                </div>
              `
            : html`
                <div
                  style="color: var(--line-account-muted-color, #8a9ba8); font-size: 0.875rem; padding: 0.5rem 0;"
                >
                  Not Configured
                </div>
              `}
        </div>

        <div class="details-section" style="grid-column: span 1;">
          <div class="details-section-title">${messages.liffGroup}</div>
          ${account.liffId
            ? html`
                <div class="details-row">
                  <span class="details-label">${messages.liffIdLabel}</span>
                  <div class="details-value-wrapper">
                    <span class="details-value">${account.liffId}</span>
                    <button
                      class="copy-btn"
                      type="button"
                      aria-label="Copy LIFF ID"
                      @click=${() => this.#copyText(account.liffId || "", "LIFF ID copied")}
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
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="details-row">
                  <span class="details-label">Status</span>
                  <span
                    class="badge configured"
                    style="margin-top: 0.25rem; align-self: flex-start;"
                    >${messages.liffConfigured}</span
                  >
                </div>
              `
            : html`
                <div
                  style="color: var(--line-account-muted-color, #8a9ba8); font-size: 0.875rem; padding: 0.5rem 0;"
                >
                  Not Configured
                </div>
              `}
        </div>
      </div>

      <div class="details-actions">
        <button
          class="action-btn"
          type="button"
          ?disabled=${isPending}
          @click=${() => this.#triggerEdit(account)}
          style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
        >
          ${messages.editAccount}
        </button>
        <button
          class="danger"
          type="button"
          ?disabled=${isPending}
          @click=${() => this.#triggerDelete(account)}
          style="min-height: 2.5rem; font-weight: 600; padding: 0.5rem 1.25rem;"
        >
          ${messages.deleteAccount}
        </button>
      </div>
    `;
  }

  #copyText = (text: string, announcement: string): void => {
    void navigator.clipboard.writeText(text).then(() => {
      this.#showNotice(announcement);
    });
  };

  #triggerEdit = (account: LineAccountView): void => {
    this.selectedAccount = account;
    this.mutationError = undefined;
    this.dialogKind = "edit";
  };

  #triggerDelete = (account: LineAccountView): void => {
    this.selectedAccount = account;
    this.mutationError = undefined;
    this.dialogKind = "delete";
  };

  #renderCollection(messages: LineAccountManagementMessages, filtered: readonly LineAccountView[]) {
    if (this.adapter === undefined) {
      return html`
        <section class="state" role="alert" aria-labelledby="adapter-heading">
          <h2 id="adapter-heading">${messages.adapterMissingHeading}</h2>
          <p>${messages.adapterMissingDescription}</p>
        </section>
      `;
    }

    if (this.loading) {
      return html`
        <div class="spinner-container" role="status" aria-live="polite">
          <div class="spinner"></div>
          <p style="margin: 0; font-weight: 550; color: var(--line-account-muted-color, #52606d)">
            ${messages.loadingAccounts}
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
        .accounts=${filtered}
        .messages=${messages}
        .disabledAccountIds=${this.pendingAccountIds}
        .accountErrors=${this.accountErrors}
        .variant=${this.variant}
        @line-account-edit-request=${this.#openEdit}
        @line-account-toggle-request=${this.#toggleAccount}
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
    this.selectedAccount = undefined;
    this.mutationError = undefined;
    this.dialogKind = "create";
  };

  #retryLoad = (): void => {
    void this.reload();
  };

  #openEdit = (event: CustomEvent<LineAccountRequestDetail>): void => {
    this.selectedAccount = event.detail.account;
    this.mutationError = undefined;
    this.dialogKind = "edit";
  };

  #openDelete = (event: CustomEvent<LineAccountRequestDetail>): void => {
    this.selectedAccount = event.detail.account;
    this.mutationError = undefined;
    this.dialogKind = "delete";
  };

  #closeDialog = (): void => {
    if (this.createPending || this.editPending || this.deletePending) return;
    this.dialogKind = undefined;
    this.selectedAccount = undefined;
    this.mutationError = undefined;
  };

  #handleFormSubmit = (event: CustomEvent<LineAccountFormSubmitDetail>): void => {
    if (event.detail.mode === "create") void this.#createAccount(event.detail.input);
    else void this.#updateSelectedAccount(event.detail.input);
  };

  async #createAccount(input: CreateLineAccountInput): Promise<void> {
    const adapter = this.adapter;
    if (adapter === undefined || this.createPending) return;
    this.createPending = true;
    this.mutationError = undefined;
    try {
      const account = await adapter.create(input);
      this.dialogKind = undefined;
      this.#showNotice(this.#resolvedMessages.createSuccess);
      await this.reload();
      this.dispatchEvent(new CustomEvent("line-account-created", eventOptions({ account })));
    } catch (error) {
      this.mutationError = this.#resolvedMessages.createFailure;
      this.#emitError("create", error);
    } finally {
      this.createPending = false;
    }
  }

  async #updateSelectedAccount(input: UpdateLineAccountInput): Promise<void> {
    const adapter = this.adapter;
    const account = this.selectedAccount;
    if (adapter === undefined || account === undefined || this.editPending) return;
    if (Object.keys(input).length === 0) {
      this.#closeDialog();
      return;
    }

    this.editPending = true;
    this.mutationError = undefined;
    try {
      const updated = await adapter.update(account.id, input);
      this.dialogKind = undefined;
      this.selectedAccount = undefined;
      this.#showNotice(this.#resolvedMessages.updateSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent("line-account-updated", eventOptions({ account: updated })),
      );
    } catch (error) {
      this.mutationError = this.#resolvedMessages.updateFailure;
      this.#emitError("update", error);
    } finally {
      this.editPending = false;
    }
  }

  #toggleAccount = (event: CustomEvent<LineAccountRequestDetail>): void => {
    void this.#performToggle(event.detail.account);
  };

  async #performToggle(account: LineAccountView): Promise<void> {
    const adapter = this.adapter;
    if (adapter === undefined || this.pendingAccountIds.has(account.id)) return;
    this.pendingAccountIds = new Set([...this.pendingAccountIds, account.id]);
    const accountErrors = new Map(this.accountErrors);
    accountErrors.delete(account.id);
    this.accountErrors = accountErrors;
    try {
      const updated = await adapter.update(account.id, { isActive: !account.isActive });
      this.#showNotice(this.#resolvedMessages.updateSuccess);
      await this.reload();
      this.dispatchEvent(
        new CustomEvent("line-account-updated", eventOptions({ account: updated })),
      );
    } catch (error) {
      this.accountErrors = new Map(this.accountErrors).set(
        account.id,
        this.#resolvedMessages.toggleFailure,
      );
      this.#emitError("toggle", error);
    } finally {
      const pending = new Set(this.pendingAccountIds);
      pending.delete(account.id);
      this.pendingAccountIds = pending;
    }
  }

  #deleteSelectedAccount = (): void => {
    void this.#performDelete();
  };

  async #performDelete(): Promise<void> {
    const adapter = this.adapter;
    const account = this.selectedAccount;
    if (adapter === undefined || account === undefined || this.deletePending) return;
    this.deletePending = true;
    this.mutationError = undefined;
    try {
      await adapter.delete(account.id);
      this.dialogKind = undefined;
      this.selectedAccount = undefined;
      this.#showNotice(this.#resolvedMessages.deleteSuccess);
      await this.reload();
      this.dispatchEvent(new CustomEvent("line-account-deleted", eventOptions({ id: account.id })));
    } catch (error) {
      this.mutationError = this.#resolvedMessages.deleteFailure;
      this.#emitError("delete", error);
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
