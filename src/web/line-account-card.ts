import { LitElement, css, html } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type {
  ProviderView,
  LineMessagingChannelView,
  LineLoginChannelView,
  LiffAppView,
  LineAccountEntity,
  LineAccountFormType,
} from "./types.ts";

/** LitElement card component displaying a provider, channel, or LIFF app summary with action buttons. */
export class LineAccountCard extends LitElement {
  static properties = {
    type: { type: String, reflect: true },
    item: { attribute: false },
    messages: { attribute: false },
    disabled: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    variant: { type: String, reflect: true },
    error: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      color: var(--line-account-text-color, #0f172a);
      font-family: var(--line-account-font-family, Inter, system-ui, sans-serif);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 12rem;
      padding: var(--line-account-space-4, 1.25rem);
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: var(--line-account-radius, 1.25rem);
      background: var(--line-account-surface-background, #ffffff);
      box-shadow: var(--line-account-shadow, 0 4px 6px -1px rgb(0 0 0 / 0.05));
      box-sizing: border-box;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .card:hover:not(.disabled) {
      border-color: var(--line-account-primary-color, #10b981);
      box-shadow: var(--line-account-shadow-hover, 0 20px 25px -5px rgb(0 0 0 / 0.1));
      transform: translateY(-2px);
    }

    .card.selectable {
      cursor: pointer;
    }

    .card.selected {
      border-color: var(--line-account-primary-color, #10b981);
      background-color: var(--line-account-selected-bg, #ecfdf5);
    }

    .card.disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .header {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      margin-bottom: var(--line-account-space-4, 1rem);
    }

    .avatar {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
      border: 1.5px solid #fff;
    }

    .avatar-placeholder {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      color: #ffffff;
      font-size: 1.25rem;
      font-weight: 700;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }

    .avatar-provider {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .avatar-channel-messaging {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }

    .avatar-channel-login {
      background: linear-gradient(135deg, #8b5cf6, #5b21b6);
    }

    .avatar-liff {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .identity {
      flex-grow: 1;
      min-width: 0;
    }

    .name {
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.25;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .subtitle {
      font-size: 0.8125rem;
      color: var(--line-account-muted-color, #64748b);
      margin-top: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: var(--line-account-space-4, 1rem);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.1875rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-type {
      background-color: var(--line-account-badge-unconfigured-bg, #f1f5f9);
      color: var(--line-account-badge-unconfigured-color, #475569);
      border: 1.5px solid var(--line-account-badge-unconfigured-border, #e2e8f0);
    }

    .badge-status {
      background-color: var(--line-account-badge-configured-bg, #ecfdf5);
      color: var(--line-account-badge-configured-color, #047a36);
      border: 1.5px solid var(--line-account-badge-configured-border, #a3f0c2);
    }

    .badge-status-inactive {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1.5px solid #fca5a5;
    }

    .description {
      font-size: 0.8125rem;
      color: var(--line-account-muted-color, #64748b);
      line-height: 1.4;
      margin-bottom: var(--line-account-space-4, 1rem);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .details {
      margin-bottom: auto;
      font-size: 0.8125rem;
      display: grid;
      gap: 0.375rem;
    }

    .details-row {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .details-label {
      color: var(--line-account-muted-color, #64748b);
    }

    .details-value {
      font-weight: 500;
      font-family: monospace;
      max-width: 12rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--line-account-border-color, #cbd5e1);
    }

    .card.variant-split .actions {
      display: none;
    }

    button {
      min-height: 2rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.15s ease-in-out;
    }

    button:hover:not(:disabled) {
      background-color: var(--line-account-muted-background, #f1f5f9);
      border-color: var(--line-account-muted-color, #64748b);
    }

    button:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 2px;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .danger-action:hover:not(:disabled) {
      background-color: #fef2f2;
      color: #991b1b;
      border-color: #fca5a5;
    }

    .status-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      margin-left: 0.25rem;
    }

    .switch {
      position: relative;
      width: 2.25rem;
      height: 1.25rem;
      padding: 0;
      border-radius: 999px;
      background-color: #e2e8f0;
      cursor: pointer;
      min-height: auto;
      border: 1.5px solid transparent;
      transition: background-color 0.2s;
    }

    .switch.checked {
      background-color: var(--line-account-primary-color, #10b981);
    }

    .switch-thumb {
      position: absolute;
      top: 1px;
      left: 1px;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s;
    }

    .switch.checked .switch-thumb {
      transform: translateX(1rem);
    }

    .error-alert {
      margin-top: 0.5rem;
      padding: 0.5rem;
      border-radius: 0.5rem;
      background-color: #fef2f2;
      color: #991b1b;
      font-size: 0.75rem;
      border: 1px solid #fca5a5;
    }
  `;

  declare type: LineAccountFormType;
  declare item: LineAccountEntity | undefined;
  declare messages: LineAccountManagementMessages;
  declare disabled: boolean;
  declare selected: boolean;
  declare variant: "grid" | "split";
  declare error: string | undefined;

  constructor() {
    super();
    this.type = "provider";
    this.item = undefined;
    this.messages = defaultLineAccountManagementMessages;
    this.disabled = false;
    this.selected = false;
    this.variant = "grid";
    this.error = undefined;
  }

  #emitRequest(name: string): void {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail: { type: this.type, item: this.item },
      }),
    );
  }

  /**
   * Cards are selectable when:
   * - in split variant (drill-down UI), OR
   * - the entry is a provider, OR
   * - the entry is a login channel (login channels can parent LIFF apps,
   *   messaging channels cannot).
   */
  get #isSelectable(): boolean {
    return this.variant === "split" || this.type === "provider" || this.type === "loginChannel";
  }

  #handleCardClick = (): void => {
    if (this.#isSelectable) {
      this.#emitRequest("line-account-select-request");
    }
  };

  #handleEdit = (event: Event): void => {
    event.stopPropagation();
    this.#emitRequest("line-account-edit-request");
  };

  #handleDelete = (event: Event): void => {
    event.stopPropagation();
    this.#emitRequest("line-account-delete-request");
  };

  #handleToggle = (event: Event): void => {
    event.stopPropagation();
    if (this.disabled || this.type !== "messagingChannel") return;
    this.dispatchEvent(
      new CustomEvent("line-account-toggle-request", {
        bubbles: true,
        composed: true,
        detail: { type: this.type, item: this.item },
      }),
    );
  };

  #handleSync = (event: Event): void => {
    event.stopPropagation();
    if (this.disabled || this.type !== "messagingChannel") return;
    this.dispatchEvent(
      new CustomEvent("line-account-sync-request", {
        bubbles: true,
        composed: true,
        detail: { item: this.item },
      }),
    );
  };

  render() {
    if (this.item === undefined) return html``;

    const selectable = this.#isSelectable;
    const selectClass = selectable ? "selectable" : "";
    const selectedClass = this.selected ? "selected" : "";
    const disabledClass = this.disabled ? "disabled" : "";

    return html`
      <article
        class="card ${selectClass} ${selectedClass} ${disabledClass}"
        part="card"
        role=${selectable ? "button" : "article"}
        tabindex=${selectable ? "0" : "-1"}
        aria-pressed=${selectable ? (this.selected ? "true" : "false") : undefined}
        @click=${this.#handleCardClick}
        @keydown=${this.#handleKeydown}
      >
        ${this.type === "provider"
          ? this.#renderProviderCard(this.item as ProviderView)
          : this.type === "messagingChannel"
            ? this.#renderMessagingChannelCard(this.item as LineMessagingChannelView)
            : this.type === "loginChannel"
              ? this.#renderLoginChannelCard(this.item as LineLoginChannelView)
              : this.#renderLiffCard(this.item as LiffAppView)}
        ${this.error ? html`<div class="error-alert" role="alert">${this.error}</div>` : ""}
      </article>
    `;
  }

  #renderProviderCard(provider: ProviderView) {
    const initial = provider.name.trim().slice(0, 1).toUpperCase();
    return html`
      <div class="header">
        <div class="avatar-placeholder avatar-provider" aria-hidden="true">${initial}</div>
        <div class="identity">
          <h3 class="name" part="name">${provider.name}</h3>
          <p class="subtitle">Provider ID: ${provider.id}</p>
        </div>
      </div>
      <div class="badges">
        <span class="badge badge-type">LINE Provider</span>
      </div>
      ${this.#renderCardActions()}
    `;
  }

  #renderMessagingChannelCard(channel: LineMessagingChannelView) {
    const initial = channel.name.trim().slice(0, 1).toUpperCase();
    const showStatusToggle = !this.disabled && this.variant !== "split";

    let avatarHtml;
    if (channel.botPictureUrl) {
      avatarHtml = html`<img
        class="avatar"
        src=${channel.botPictureUrl}
        alt=${channel.name}
        part="avatar"
      />`;
    } else {
      avatarHtml = html`<div class="avatar-placeholder avatar-channel-messaging" aria-hidden="true">
        ${initial}
      </div>`;
    }

    return html`
      <div class="header">
        ${avatarHtml}
        <div class="identity">
          <h3 class="name" part="name">${channel.name}</h3>
          <p class="subtitle">Channel ID: ${channel.channelId}</p>
        </div>
        ${showStatusToggle
          ? html`
              <div class="status-toggle">
                <button
                  class="switch ${channel.isActive ? "checked" : ""}"
                  role="switch"
                  part="status-button"
                  aria-checked=${channel.isActive ? "true" : "false"}
                  aria-label=${channel.isActive ? "Deactivate Channel" : "Activate Channel"}
                  ?disabled=${this.disabled}
                  @click=${this.#handleToggle}
                >
                  <span class="switch-thumb"></span>
                </button>
              </div>
            `
          : ""}
      </div>
      <div class="badges">
        <span class="badge badge-type">Messaging API</span>
        <span class="badge ${channel.isActive ? "badge-status" : "badge-status-inactive"}"
          >${channel.isActive ? this.messages.activeStatus : this.messages.inactiveStatus}</span
        >
      </div>
      <div class="details">
        <div class="details-row">
          <span class="details-label">Record ID:</span>
          <span class="details-value">${channel.id}</span>
        </div>
        ${channel.botDisplayName
          ? html`<div class="details-row">
              <span class="details-label">Bot Display Name:</span>
              <span class="details-value">${channel.botDisplayName}</span>
            </div>`
          : ""}
      </div>
      ${this.#renderCardActions(true)}
    `;
  }

  #renderLoginChannelCard(channel: LineLoginChannelView) {
    const initial = channel.name.trim().slice(0, 1).toUpperCase();
    return html`
      <div class="header">
        <div class="avatar-placeholder avatar-channel-login" aria-hidden="true">${initial}</div>
        <div class="identity">
          <h3 class="name" part="name">${channel.name}</h3>
          <p class="subtitle">Channel ID: ${channel.channelId}</p>
        </div>
      </div>
      <div class="badges">
        <span class="badge badge-type">LINE Login</span>
      </div>
      <div class="details">
        <div class="details-row">
          <span class="details-label">Record ID:</span>
          <span class="details-value">${channel.id}</span>
        </div>
      </div>
      ${this.#renderCardActions()}
    `;
  }

  #renderLiffCard(liff: LiffAppView) {
    return html`
      <div class="header">
        <div class="avatar-placeholder avatar-liff" aria-hidden="true">L</div>
        <div class="identity">
          <h3 class="name" part="name">${liff.liffId}</h3>
          <p class="subtitle">LIFF App ID: ${liff.id}</p>
        </div>
      </div>
      <div class="badges">
        <span class="badge badge-type">LIFF App</span>
        <span class="badge badge-status">${liff.view.type.toUpperCase()}</span>
      </div>
      ${liff.description ? html`<p class="description">${liff.description}</p>` : ""}
      <div class="details">
        <div class="details-row">
          <span class="details-label">URL:</span>
          <span class="details-value" title=${liff.view.url}>${liff.view.url}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Login Channel Record ID:</span>
          <span class="details-value">${liff.loginChannelId}</span>
        </div>
      </div>
      ${this.#renderCardActions()}
    `;
  }

  #renderCardActions(showSync = false) {
    return html`
      <div class="actions" part="actions">
        ${showSync
          ? html`<button
              type="button"
              part="sync-button"
              ?disabled=${this.disabled}
              @click=${this.#handleSync}
            >
              Sync
            </button>`
          : ""}
        <button
          type="button"
          part="edit-button"
          ?disabled=${this.disabled}
          @click=${this.#handleEdit}
        >
          Edit
        </button>
        <button
          class="danger-action"
          type="button"
          part="delete-button"
          ?disabled=${this.disabled}
          @click=${this.#handleDelete}
        >
          Delete
        </button>
      </div>
    `;
  }

  #handleKeydown = (event: KeyboardEvent): void => {
    if (!this.#isSelectable || this.disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.#emitRequest("line-account-select-request");
    }
  };
}
