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
    return html`
      <section class="page" part="page">
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

        ${this.#renderCollection(messages)}
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

  #renderCollection(messages: LineAccountManagementMessages) {
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
        .accounts=${this.accounts}
        .messages=${messages}
        .disabledAccountIds=${this.pendingAccountIds}
        .accountErrors=${this.accountErrors}
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
