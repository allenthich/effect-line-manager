import { LitElement, css, html, nothing } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type { LineAccountRequestDetail, LineAccountView } from "./types.ts";

const requestEvent = (
  name: string,
  account: LineAccountView,
): CustomEvent<LineAccountRequestDetail> =>
  new CustomEvent(name, {
    bubbles: true,
    composed: true,
    detail: { account },
  });

export class LineAccountCard extends LitElement {
  static properties = {
    account: { attribute: false },
    messages: { attribute: false },
    disabled: { type: Boolean, reflect: true },
    error: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      color: var(--line-account-text-color, #1f2933);
      font-family: var(--line-account-font-family, system-ui, sans-serif);
    }

    article {
      display: grid;
      gap: var(--line-account-space-4, 1rem);
      height: 100%;
      padding: var(--line-account-space-5, 1.25rem);
      border: 1px solid var(--line-account-border-color, #d9e0e6);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-surface-background, #fff);
      box-shadow: var(--line-account-shadow, 0 1px 3px rgb(0 0 0 / 8%));
      box-sizing: border-box;
      transition:
        transform 0.2s ease-in-out,
        box-shadow 0.2s ease-in-out,
        border-color 0.2s ease-in-out;
    }

    article:hover {
      transform: translateY(-2px);
      box-shadow: var(--line-account-shadow-hover, 0 12px 24px rgb(29 53 38 / 10%));
      border-color: var(--line-account-primary-color, #06c755);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .identity {
      display: flex;
      align-items: center;
      gap: var(--line-account-space-3, 0.75rem);
    }

    img,
    .initial {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      object-fit: cover;
      flex: 0 0 auto;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .initial {
      display: grid;
      place-items: center;
      background: var(--line-account-muted-background, #eef2f5);
      color: var(--line-account-muted-color, #52606d);
      font-weight: 700;
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      font-size: 1rem;
    }

    .metadata {
      display: flex;
      flex-direction: column;
      gap: var(--line-account-space-2, 0.5rem);
      color: var(--line-account-muted-color, #52606d);
      font-size: 0.875rem;
    }

    .status-container {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-weight: 600;
    }

    .status-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      display: inline-block;
    }

    .status-dot.active {
      background-color: var(--line-account-primary-color, #06c755);
      box-shadow: 0 0 0 2px rgb(6 199 85 / 20%);
    }

    .status-dot.inactive {
      background-color: var(--line-account-muted-color, #8a9ba8);
    }

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

    .badges {
      display: flex;
      flex-direction: column;
      gap: var(--line-account-space-2, 0.5rem);
      align-items: flex-start;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1;
    }

    .badge.configured {
      background-color: var(--line-account-badge-configured-bg, #e6fdf0);
      color: var(--line-account-badge-configured-color, #047a36);
      border: 1px solid var(--line-account-badge-configured-border, #a3f0c2);
    }

    .badge.unconfigured {
      background-color: var(--line-account-badge-unconfigured-bg, #f1f3f5);
      color: var(--line-account-badge-unconfigured-color, #52606d);
      border: 1px solid var(--line-account-badge-unconfigured-border, #d9e0e6);
    }

    .badge-icon {
      width: 0.875rem;
      height: 0.875rem;
      flex-shrink: 0;
    }

    .actions {
      display: flex;
      gap: var(--line-account-space-2, 0.5rem);
      margin-top: auto;
      border-top: 1px solid var(--line-account-border-color, #e4e7eb);
      padding-top: var(--line-account-space-4, 1rem);
    }

    button.action-btn {
      flex: 1;
      min-height: 2.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: var(--line-account-text-color, #1f2933);
      cursor: pointer;
      font: inherit;
      font-weight: 600;
      transition: all 0.15s ease-in-out;
    }

    button.action-btn:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 2px;
    }

    button.action-btn:hover:not(:disabled) {
      background: var(--line-account-muted-background, #f8f9fa);
      border-color: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-text-color, #047a36);
    }

    button.action-btn:active:not(:disabled) {
      transform: scale(0.97);
    }

    button.action-btn.danger {
      border-color: var(--line-account-border-color, #c7d0d9);
      color: var(--line-account-text-color, #1f2933);
    }

    button.action-btn.danger:hover:not(:disabled) {
      background: var(--line-account-danger-background, #fff0f0);
      border-color: var(--line-account-danger-color, #c62828);
      color: var(--line-account-danger-color, #c62828);
    }

    button.action-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .error {
      margin: 0;
      padding: var(--line-account-space-3, 0.75rem);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-danger-background, #fff0f0);
      color: var(--line-account-danger-color, #a61b1b);
    }
  `;

  declare account: LineAccountView | undefined;
  declare messages: LineAccountManagementMessages;
  declare disabled: boolean;
  declare error: string | undefined;

  constructor() {
    super();
    this.account = undefined;
    this.messages = defaultLineAccountManagementMessages;
    this.disabled = false;
    this.error = undefined;
  }

  protected render() {
    const account = this.account;
    if (account === undefined) return nothing;

    const displayName = account.displayName?.trim() || account.name;
    const initial = displayName.trim().charAt(0).toUpperCase();

    return html`
      <article part="card">
        <div class="card-header">
          <div class="identity">
            ${account.pictureUrl
              ? html`<img
                  src=${account.pictureUrl}
                  alt=${this.messages.profileImageAlt(displayName)}
                />`
              : html`<span class="initial" aria-hidden="true">${initial}</span>`}
            <div>
              <h3>${displayName}</h3>
              ${account.basicId ? html`<p>${account.basicId}</p>` : nothing}
            </div>
          </div>
          <button
            class="switch ${account.isActive ? "checked" : ""}"
            part="status-button"
            role="switch"
            aria-checked=${account.isActive ? "true" : "false"}
            aria-label=${account.isActive
              ? this.messages.deactivateAccount
              : this.messages.activateAccount}
            ?disabled=${this.disabled}
            @click=${this.#requestToggle}
          >
            <span class="switch-thumb"></span>
          </button>
        </div>
        <div class="metadata">
          <span>${this.messages.channelIdLabel}: ${account.channelId}</span>
          <div class="status-container">
            <span class="status-dot ${account.isActive ? "active" : "inactive"}"></span>
            <span
              >${account.isActive ? this.messages.activeStatus : this.messages.inactiveStatus}</span
            >
          </div>
        </div>
        <div class="badges">
          <span class="badge ${account.loginChannelId ? "configured" : "unconfigured"}">
            ${account.loginChannelId
              ? html`
                  <svg
                    class="badge-icon"
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
                  ${this.messages.loginConfigured}
                `
              : html`
                  <svg
                    class="badge-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  ${this.messages.loginNotConfigured}
                `}
          </span>
          <span class="badge ${account.liffId ? "configured" : "unconfigured"}">
            ${account.liffId
              ? html`
                  <svg
                    class="badge-icon"
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
                  ${this.messages.liffConfigured}
                `
              : html`
                  <svg
                    class="badge-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  ${this.messages.liffNotConfigured}
                `}
          </span>
        </div>
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
        <div class="actions">
          <button
            class="action-btn"
            part="edit-button"
            type="button"
            ?disabled=${this.disabled}
            @click=${this.#requestEdit}
          >
            ${this.messages.editAccount}
          </button>
          <button
            class="action-btn danger"
            part="delete-button"
            type="button"
            ?disabled=${this.disabled}
            @click=${this.#requestDelete}
          >
            ${this.messages.deleteAccount}
          </button>
        </div>
      </article>
    `;
  }

  #requestEdit = (): void => {
    if (this.account !== undefined)
      this.dispatchEvent(requestEvent("line-account-edit-request", this.account));
  };

  #requestToggle = (): void => {
    if (this.account !== undefined)
      this.dispatchEvent(requestEvent("line-account-toggle-request", this.account));
  };

  #requestDelete = (): void => {
    if (this.account !== undefined)
      this.dispatchEvent(requestEvent("line-account-delete-request", this.account));
  };
}
