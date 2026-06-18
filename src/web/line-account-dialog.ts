import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";

/** LitElement modal dialog component with backdrop, focus trapping, and animation. */
export class LineAccountDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
  };

  static styles = css`
    :host {
      color: var(--line-account-text-color, #1f2933);
      font-family: var(--line-account-font-family, system-ui, sans-serif);
    }

    dialog {
      width: min(42rem, calc(100% - 2rem));
      max-height: calc(100% - 2rem);
      padding: 0;
      overflow: auto;
      border: 1px solid var(--line-account-border-color, #d9e0e6);
      border-radius: var(--line-account-dialog-radius, 0.875rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      box-shadow: var(--line-account-dialog-shadow, 0 1.5rem 4rem rgb(0 0 0 / 24%));

      /* Animation */
      opacity: 0;
      transform: scale(0.96) translateY(8px);
      transition:
        opacity 0.2s ease-out,
        transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
        display 0.2s allow-discrete,
        overlay 0.2s allow-discrete;
    }

    dialog[open] {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    dialog::backdrop {
      background: var(--line-account-backdrop-color, rgb(15 23 42 / 40%));
      backdrop-filter: blur(6px);
      opacity: 0;
      transition:
        opacity 0.2s ease-out,
        display 0.2s allow-discrete,
        overlay 0.2s allow-discrete;
    }

    dialog[open]::backdrop {
      opacity: 1;
    }

    @starting-style {
      dialog[open] {
        opacity: 0;
        transform: scale(0.96) translateY(8px);
      }
      dialog[open]::backdrop {
        opacity: 0;
      }
    }

    h2 {
      margin: 0;
      padding: var(--line-account-space-5, 1.25rem);
      border-bottom: 1px solid var(--line-account-border-color, #d9e0e6);
      font-size: 1.25rem;
    }

    .content {
      padding: var(--line-account-space-5, 1.25rem);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--line-account-space-2, 0.5rem);
      padding: var(--line-account-space-4, 1rem) var(--line-account-space-5, 1.25rem);
      border-top: 1px solid var(--line-account-border-color, #d9e0e6);
      background: var(--line-account-dialog-footer-bg, #fafbfc);
    }
  `;

  declare open: boolean;
  declare heading: string;

  #restoreFocusTo: HTMLElement | undefined;

  constructor() {
    super();
    this.open = false;
    this.heading = "";
  }

  protected render() {
    return html`
      <dialog
        part="dialog"
        aria-labelledby="dialog-heading"
        tabindex="-1"
        @cancel=${this.#handleCancel}
        @click=${this.#handleBackdropClick}
      >
        <h2 id="dialog-heading">${this.heading}</h2>
        <div class="content"><slot></slot></div>
        <div class="actions" part="dialog-actions"><slot name="footer"></slot></div>
      </dialog>
    `;
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    if (!changedProperties.has("open")) return;

    const dialog = this.shadowRoot?.querySelector("dialog");
    if (dialog === null || dialog === undefined) return;

    if (this.open) {
      const activeElement = document.activeElement;
      this.#restoreFocusTo = activeElement instanceof HTMLElement ? activeElement : undefined;
      if (!dialog.open) dialog.showModal();
      void this.#focusFirstControl(dialog);
      return;
    }

    if (dialog.open) dialog.close();
    this.#restoreFocusTo?.focus();
    this.#restoreFocusTo = undefined;
  }

  async #focusFirstControl(dialog: HTMLDialogElement): Promise<void> {
    const selector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const assignedElements = [
      ...this.children,
      ...[...dialog.querySelectorAll("slot")].flatMap((slot) =>
        slot.assignedElements({ flatten: true }),
      ),
    ];

    for (const assigned of assignedElements) {
      if ("updateComplete" in assigned) {
        await (assigned as Element & { updateComplete: Promise<unknown> }).updateComplete;
      }
      if (!this.open || !dialog.open) return;

      if (assigned instanceof HTMLElement && assigned.matches(selector)) {
        assigned.focus();
        return;
      }

      const focusable =
        assigned.shadowRoot?.querySelector<HTMLElement>(selector) ??
        assigned.querySelector<HTMLElement>(selector);
      if (focusable !== null) {
        focusable.focus();
        return;
      }
    }

    if (this.open && dialog.open) dialog.focus();
  }

  #requestClose(): void {
    this.dispatchEvent(
      new CustomEvent("line-account-dialog-close-request", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleCancel = (event: Event): void => {
    event.preventDefault();
    this.#requestClose();
  };

  #handleBackdropClick = (event: MouseEvent): void => {
    if (event.target === event.currentTarget) this.#requestClose();
  };
}
