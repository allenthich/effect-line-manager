import { LitElement, css, html } from "lit";

/** LitElement toolbar component with search and variant switcher (grid/split). */
export class LineAccountToolbar extends LitElement {
  static properties = {
    searchQuery: { state: true },
    variant: { type: String, reflect: true },
    currentTab: { type: String },
  };

  static styles = css`
    :host {
      display: block;
    }

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
  `;

  declare searchQuery: string;
  declare variant: string;
  declare currentTab: string;

  constructor() {
    super();
    this.searchQuery = "";
    this.variant = "grid";
    this.currentTab = "provider";
  }

  #emitSearchChange(value: string): void {
    this.dispatchEvent(
      new CustomEvent("search-change", {
        bubbles: true,
        composed: true,
        detail: { value },
      }),
    );
  }

  #emitVariantChange(variant: string): void {
    this.dispatchEvent(
      new CustomEvent("variant-change", {
        bubbles: true,
        composed: true,
        detail: { variant },
      }),
    );
  }

  #clearSearch = (): void => {
    this.#emitSearchChange("");
  };

  #setVariant = (variant: string): void => {
    this.#emitVariantChange(variant);
  };

  #onSearchInput = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchQuery = target.value;
      this.#emitSearchChange(target.value);
    }
  };

  protected render() {
    return html`
      <div class="toolbar" part="toolbar">
        <div class="search-wrapper">
          <svg
            class="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            class="search-input"
            type="text"
            placeholder="Search"
            .value=${this.searchQuery}
            @input=${this.#onSearchInput}
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
}
