import { LitElement, css, html } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type { LineAccountEntity, LineAccountFormType } from "./types.ts";
import "./line-account-card.ts";

/** LitElement list component rendering a grid or list of line-account-card elements. */
export class LineAccountList extends LitElement {
  static properties = {
    type: { type: String, reflect: true },
    items: { attribute: false },
    messages: { attribute: false },
    disabled: { type: Boolean, reflect: true },
    disabledItemIds: { attribute: false },
    itemErrors: { attribute: false },
    variant: { type: String, reflect: true },
    selectedItemId: { type: String, reflect: true },
  };

  static styles = css`
    :host {
      display: block;
      font-family: var(--line-account-font-family, system-ui, sans-serif);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
      gap: var(--line-account-space-5, 1.5rem);
      padding: 0.25rem;
    }

    :host([variant="list"]) .grid,
    :host([variant="split"]) .grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--line-account-space-6, 3.5rem 2rem);
      border: 2px dashed var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 1rem);
      background: var(--line-account-surface-background, #fff);
      text-align: center;
    }

    .empty-illustration {
      width: 4.5rem;
      height: 4.5rem;
      color: var(--line-account-muted-color, #8a9ba8);
      margin-bottom: 1.25rem;
      opacity: 0.8;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--line-account-text-color, #1f2933);
    }

    p {
      max-width: 24rem;
      margin-top: 0.5rem;
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--line-account-muted-color, #52606d);
    }
  `;

  declare type: LineAccountFormType;
  declare items: readonly LineAccountEntity[];
  declare messages: LineAccountManagementMessages;
  declare disabled: boolean;
  declare disabledItemIds: ReadonlySet<string>;
  declare itemErrors: ReadonlyMap<string, string>;
  declare variant: string;
  declare selectedItemId: string | undefined;

  constructor() {
    super();
    this.type = "provider";
    this.items = [];
    this.messages = defaultLineAccountManagementMessages;
    this.disabled = false;
    this.disabledItemIds = new Set();
    this.itemErrors = new Map();
    this.variant = "grid";
    this.selectedItemId = undefined;
  }

  protected render() {
    if (this.items.length === 0) {
      let emptyMsg = this.messages.emptyProviders;
      if (this.type === "messagingChannel") {
        emptyMsg = this.messages.emptyMessagingChannels;
      } else if (this.type === "loginChannel") {
        emptyMsg = this.messages.emptyLoginChannels;
      } else if (this.type === "liff") {
        emptyMsg = this.messages.emptyLiffApps;
      }

      return html`
        <section class="empty" part="list" aria-labelledby="empty-heading">
          <svg
            class="empty-illustration"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <h2 id="empty-heading">${emptyMsg}</h2>
        </section>
      `;
    }

    return html`
      <div class="grid" part="list">
        ${this.items.map(
          (item) => html`
            <line-account-card
              .type=${this.type}
              .item=${item}
              .messages=${this.messages}
              .disabled=${this.disabled || this.disabledItemIds.has(item.id)}
              .error=${this.itemErrors.get(item.id)}
              .variant=${this.variant}
              ?selected=${item.id === this.selectedItemId}
            ></line-account-card>
          `,
        )}
      </div>
    `;
  }
}
