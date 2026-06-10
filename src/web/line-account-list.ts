import { LitElement, css, html } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type { LineAccountView } from "./types.ts";
import "./line-account-card.ts";

export class LineAccountList extends LitElement {
  static properties = {
    accounts: { attribute: false },
    messages: { attribute: false },
    disabled: { type: Boolean, reflect: true },
    disabledAccountIds: { attribute: false },
    accountErrors: { attribute: false },
  };

  static styles = css`
    :host {
      display: block;
      font-family: var(--line-account-font-family, system-ui, sans-serif);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
      gap: var(--line-account-space-4, 1rem);
    }

    .empty {
      padding: var(--line-account-space-6, 1.5rem);
      border: 1px dashed var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-surface-background, #fff);
      text-align: center;
    }

    h2,
    p {
      margin: 0;
    }

    p {
      margin-top: var(--line-account-space-2, 0.5rem);
      color: var(--line-account-muted-color, #52606d);
    }
  `;

  declare accounts: readonly LineAccountView[];
  declare messages: LineAccountManagementMessages;
  declare disabled: boolean;
  declare disabledAccountIds: ReadonlySet<string>;
  declare accountErrors: ReadonlyMap<string, string>;

  constructor() {
    super();
    this.accounts = [];
    this.messages = defaultLineAccountManagementMessages;
    this.disabled = false;
    this.disabledAccountIds = new Set();
    this.accountErrors = new Map();
  }

  protected render() {
    if (this.accounts.length === 0) {
      return html`
        <section class="empty" part="list" aria-labelledby="empty-heading">
          <h2 id="empty-heading">${this.messages.emptyHeading}</h2>
          <p>${this.messages.emptyDescription}</p>
        </section>
      `;
    }

    return html`
      <div class="grid" part="list">
        ${this.accounts.map(
          (account) => html`
            <line-account-card
              .account=${account}
              .messages=${this.messages}
              .disabled=${this.disabled || this.disabledAccountIds.has(account.id)}
              .error=${this.accountErrors.get(account.id)}
            ></line-account-card>
          `,
        )}
      </div>
    `;
  }
}
