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

    .metadata,
    .badges {
      display: grid;
      gap: var(--line-account-space-2, 0.5rem);
      color: var(--line-account-muted-color, #52606d);
      font-size: 0.875rem;
    }

    .badges {
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--line-account-space-2, 0.5rem);
      margin-top: auto;
    }

    button {
      min-height: 2.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      cursor: pointer;
      font: inherit;
    }

    button:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 2px;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .status {
      border-color: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-text-color, #047a36);
    }

    .danger {
      border-color: var(--line-account-danger-color, #c62828);
      color: var(--line-account-danger-color, #c62828);
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
        <div class="metadata">
          <span>${this.messages.channelIdLabel}: ${account.channelId}</span>
          <span
            >${account.isActive ? this.messages.activeStatus : this.messages.inactiveStatus}</span
          >
        </div>
        <div class="badges">
          <span
            >${account.loginChannelId
              ? this.messages.loginConfigured
              : this.messages.loginNotConfigured}</span
          >
          <span
            >${account.liffId
              ? this.messages.liffConfigured
              : this.messages.liffNotConfigured}</span
          >
        </div>
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
        <div class="actions">
          <button
            class="status"
            part="status-button"
            type="button"
            ?disabled=${this.disabled}
            @click=${this.#requestToggle}
          >
            ${account.isActive ? this.messages.deactivateAccount : this.messages.activateAccount}
          </button>
          <button
            part="edit-button"
            type="button"
            ?disabled=${this.disabled}
            @click=${this.#requestEdit}
          >
            ${this.messages.editAccount}
          </button>
          <button
            class="danger"
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
