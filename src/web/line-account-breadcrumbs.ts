import { LitElement, css, html } from "lit";
import type { ProviderView, ChannelView } from "./types.ts";

export class LineAccountBreadcrumbs extends LitElement {
  static properties = {
    providers: { attribute: false },
    channels: { attribute: false },
    selectedProviderId: { type: String },
    selectedChannelId: { type: String },
  };

  static styles = css`
    :host {
      display: block;
    }

    .breadcrumbs {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      color: var(--line-account-muted-color, #64748b);
      font-weight: 550;
      flex-wrap: wrap;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .breadcrumb-link {
      cursor: pointer;
      color: var(--line-account-muted-color, #64748b);
      transition: color 0.15s ease-in-out;
      text-decoration: none;
      border-radius: 0.25rem;
      padding: 0.125rem 0.25rem;
    }

    .breadcrumb-link:hover {
      color: var(--line-account-primary-color, #10b981);
      background-color: var(--line-account-muted-background, #eef2f5);
    }

    .breadcrumb-current {
      color: var(--line-account-text-color, #0f172a);
      font-weight: 600;
      padding: 0.125rem 0.25rem;
    }

    .breadcrumb-separator {
      color: var(--line-account-border-color, #cbd5e1);
      user-select: none;
    }
  `;

  declare providers: readonly ProviderView[];
  declare channels: readonly ChannelView[];
  declare selectedProviderId: string;
  declare selectedChannelId: string;

  constructor() {
    super();
    this.providers = [];
    this.channels = [];
    this.selectedProviderId = "";
    this.selectedChannelId = "";
  }

  #emitResetToProviders(): void {
    this.dispatchEvent(
      new CustomEvent("reset-to-providers", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  #emitSelectProvider(providerId: string): void {
    this.dispatchEvent(
      new CustomEvent("select-provider", {
        bubbles: true,
        composed: true,
        detail: { providerId },
      }),
    );
  }

  #handleProviderKeydown = (e: KeyboardEvent, providerId: string): void => {
    if (e.key === "Enter") {
      this.#emitSelectProvider(providerId);
    }
  };

  protected render() {
    const activeProvider = this.providers.find((p) => p.id === this.selectedProviderId);
    const activeChannel = this.channels.find((c) => c.id === this.selectedChannelId);

    let providerName = activeProvider?.name;
    if (!providerName && activeChannel) {
      const p = this.providers.find((prov) => prov.id === activeChannel.providerId);
      providerName = p?.name;
    }

    return html`
      <nav class="breadcrumbs" aria-label="Breadcrumb" part="breadcrumbs">
        <span class="breadcrumb-item">
          <span
            class="breadcrumb-link ${!this.selectedProviderId ? "breadcrumb-current" : ""}"
            role="button"
            tabindex="0"
            @click=${() => this.#emitResetToProviders()}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter") this.#emitResetToProviders();
            }}
          >
            LINE Accounts
          </span>
        </span>

        ${this.selectedProviderId || activeChannel
          ? html`
              <span class="breadcrumb-item">
                <span class="breadcrumb-separator">/</span>
                <span
                  class="breadcrumb-link ${!this.selectedChannelId ? "breadcrumb-current" : ""}"
                  role="button"
                  tabindex="0"
                  @click=${() =>
                    this.#emitSelectProvider(this.selectedProviderId || activeChannel!.providerId)}
                  @keydown=${(e: KeyboardEvent) =>
                    this.#handleProviderKeydown(
                      e,
                      this.selectedProviderId || activeChannel!.providerId,
                    )}
                >
                  ${providerName || "Provider"}
                </span>
              </span>
            `
          : ""}
        ${this.selectedChannelId && activeChannel
          ? html`
              <span class="breadcrumb-item">
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-current"> ${activeChannel.name} </span>
              </span>
            `
          : ""}
      </nav>
    `;
  }
}
