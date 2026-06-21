import { LitElement, css, html } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type { ProviderView, ChannelView, LiffAppView } from "./types.ts";

/** LitElement detail panel component rendering full metadata for a selected provider, channel, or LIFF app. */
export class LineAccountDetailPanel extends LitElement {
  static properties = {
    item: { attribute: false },
    currentTab: { type: String },
    providers: { attribute: false },
    channels: { attribute: false },
    liffApps: { attribute: false },
    pendingItemIds: { attribute: false },
    messages: { attribute: false },
    readonly: { type: Boolean },
    inline: { type: Boolean, reflect: true },
    _visibleCredentials: { state: true },
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      background: var(--line-account-surface-background, #fff);
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 1rem);
      padding: 1.5rem;
      box-shadow: var(--line-account-shadow, 0 1px 3px rgba(0, 0, 0, 0.05));
      min-height: 28rem;
    }

    :host([inline]) {
      border: none;
      padding: 0;
      box-shadow: none;
      min-height: auto;
      background: transparent;
      gap: 1rem;
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
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }

    .details-initial-provider {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .details-initial-channel-messaging {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }

    .details-initial-channel-login {
      background: linear-gradient(135deg, #8b5cf6, #5b21b6);
    }

    .details-initial-liff {
      background: linear-gradient(135deg, #f59e0b, #d97706);
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
      margin-left: auto;
      flex-shrink: 0;
    }

    .copy-btn:hover {
      color: var(--line-account-primary-color, #06c755);
      background-color: var(--line-account-muted-background, #eef2f5);
    }

    .copy-btn svg {
      width: 1rem;
      height: 1rem;
    }

    .reveal-btn {
      background: none;
      border: none;
      min-height: auto;
      padding: 0.25rem 0.5rem;
      color: var(--line-account-primary-color, #06c755);
      cursor: pointer;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      transition: all 0.15s;
    }

    .reveal-btn:hover {
      background-color: var(--line-account-muted-background, #eef2f5);
    }

    .credential-obscured {
      font-size: 0.875rem;
      font-family: monospace;
      background: var(--line-account-muted-background, #eef2f5);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      letter-spacing: 0.15em;
      color: var(--line-account-muted-color, #8a9ba8);
      flex: 1;
    }

    .credential-value {
      font-size: 0.875rem;
      font-family: monospace;
      background: var(--line-account-muted-background, #eef2f5);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      word-break: break-all;
      flex: 1;
    }

    .details-table tbody tr:hover {
      background-color: var(--line-account-selected-bg, #ecfdf5);
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

    .danger {
      border-color: var(--line-account-danger-color, #c62828);
      background: var(--line-account-danger-color, #c62828);
      color: #fff;
    }

    .danger:hover:not(:disabled) {
      background-color: var(--line-account-danger-hover, #b02020);
      border-color: var(--line-account-danger-hover, #b02020);
    }

    .primary {
      border-color: var(--line-account-primary-color, #06c755);
      background: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-contrast, #fff);
    }

    .action-btn {
      min-height: 2.5rem;
      font-weight: 600;
      padding: 0.5rem 1.25rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.1875rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
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
  `;

  declare item: ProviderView | ChannelView | LiffAppView | undefined;
  declare currentTab: string;
  declare providers: readonly ProviderView[];
  declare channels: readonly ChannelView[];
  declare liffApps: readonly LiffAppView[];
  declare pendingItemIds: ReadonlySet<string>;
  declare messages: LineAccountManagementMessages;
  declare readonly: boolean;
  declare inline: boolean;
  declare _visibleCredentials: Set<string>;

  constructor() {
    super();
    this.item = undefined;
    this.currentTab = "provider";
    this.providers = [];
    this.channels = [];
    this.liffApps = [];
    this.pendingItemIds = new Set();
    this.messages = defaultLineAccountManagementMessages;
    this.readonly = false;
    this.inline = false;
    this._visibleCredentials = new Set();
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  #emitEdit = (e: Event, item: ProviderView | ChannelView | LiffAppView): void => {
    e.stopPropagation();
    this.#emit("detail-edit", { item });
  };

  #emitDelete = (e: Event, item: ProviderView | ChannelView | LiffAppView): void => {
    e.stopPropagation();
    this.#emit("detail-delete", { item });
  };

  #emitToggle = (channel: ChannelView): void => {
    this.#emit("detail-toggle", { item: channel });
  };

  #emitSync = (channel: ChannelView): void => {
    this.#emit("detail-sync", { item: channel });
  };

  #emitDrillChannel = (channel: ChannelView): void => {
    this.#emit("detail-drill-channel", { channel });
  };

  #emitDrillLiff = (liff: LiffAppView): void => {
    this.#emit("detail-drill-liff", { liff });
  };

  #emitCreateChannel = (providerId: string): void => {
    this.#emit("detail-create-channel", { providerId });
  };

  #emitCreateLiff = (channelId: string): void => {
    this.#emit("detail-create-liff", { channelId });
  };

  #copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  };

  #toggleCredential = (key: string): void => {
    const next = new Set(this._visibleCredentials);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this._visibleCredentials = next;
  };

  #renderCredentialField = (label: string, value: string | null, key: string) => {
    if (!value) {
      return html`<div class="details-row">
        <span class="details-label">${label}</span>
        <span class="credential-obscured" style="font-style: italic; letter-spacing: normal;"
          >(not set)</span
        >
      </div>`;
    }
    const visible = this._visibleCredentials.has(key);
    return html`<div class="details-row">
      <span class="details-label">${label}</span>
      <div class="details-value-wrapper">
        ${visible
          ? html`<span class="credential-value">${value}</span>`
          : html`<span class="credential-obscured">${"\u2022".repeat(12)}</span>`}
        <button class="reveal-btn" type="button" @click=${() => this.#toggleCredential(key)}>
          ${visible ? "Hide" : "Show"}
        </button>
        <button
          class="copy-btn"
          type="button"
          title="Copy to clipboard"
          @click=${() => this.#copyToClipboard(value)}
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
    </div>`;
  };

  protected render() {
    if (this.item === undefined) {
      return html`
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
          <h3>No Selection</h3>
          <p style="font-size: 0.875rem; max-width: 16rem; margin-top: 0.25rem;">
            Select an item from the sidebar or add a new one to view details.
          </p>
        </div>
      `;
    }

    if (this.currentTab === "provider") {
      return this.#renderProviderDetails(this.item as ProviderView);
    }
    if (this.currentTab === "channel") {
      return this.#renderChannelDetails(this.item as ChannelView);
    }
    return this.#renderLiffDetails(this.item as LiffAppView);
  }

  #renderProviderDetails(provider: ProviderView) {
    const initial = provider.name.trim().charAt(0).toUpperCase();
    const isPending = this.pendingItemIds.has(provider.id);

    return html`
      ${this.inline
        ? ""
        : html`<div class="details-header">
            <div class="details-identity">
              <span class="details-initial details-initial-provider">${initial}</span>
              <div class="details-title-group">
                <h2>${provider.name}</h2>
                <div class="details-basic-id">Provider ID: ${provider.id}</div>
              </div>
            </div>
          </div>`}

      <div class="details-grid">
        <div class="details-section">
          <div class="details-section-title">Timeline</div>
          <div class="details-row">
            <span class="details-label">Created At</span>
            <span class="details-value">${provider.createdAt.toLocaleString()}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Updated At</span>
            <span class="details-value">${provider.updatedAt.toLocaleString()}</span>
          </div>
        </div>

        <div class="details-section" style="grid-column: 1 / -1;">
          <div
            class="details-section-title"
            style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--line-account-border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem;"
          >
            <span>Channels</span>
            ${this.readonly
              ? ""
              : html`<button
                  class="primary"
                  type="button"
                  style="min-height: auto; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600;"
                  @click=${() => this.#emitCreateChannel(provider.id)}
                >
                  + Add Channel
                </button>`}
          </div>
          ${this.channels.filter((c) => c.providerId === provider.id).length === 0
            ? html`<p
                style="color: var(--line-account-muted-color); font-size: 0.85rem; padding: 0.5rem 0;"
              >
                No LINE Channels found under this provider.
              </p>`
            : html`
                <table
                  class="details-table"
                  style="width: 100%; border-collapse: collapse; margin-top: 0.25rem; font-size: 0.85rem;"
                >
                  <thead>
                    <tr
                      style="border-bottom: 1px solid var(--line-account-border-color); text-align: left; color: var(--line-account-muted-color);"
                    >
                      <th style="padding: 0.5rem 0.25rem; font-weight: 600;">Name</th>
                      <th style="padding: 0.5rem 0.25rem; font-weight: 600;">Type</th>
                      <th style="padding: 0.5rem 0.25rem; font-weight: 600;">Status</th>
                      ${this.readonly
                        ? ""
                        : html`<th
                            style="padding: 0.5rem 0.25rem; text-align: right; font-weight: 600;"
                          >
                            Actions
                          </th>`}
                    </tr>
                  </thead>
                  <tbody>
                    ${this.channels
                      .filter((c) => c.providerId === provider.id)
                      .map(
                        (c) => html`
                          <tr
                            style="border-bottom: 1px dashed var(--line-account-border-color); cursor: pointer;"
                            @click=${() => this.#emitDrillChannel(c)}
                          >
                            <td
                              style="padding: 0.5rem 0.25rem; font-weight: 600; color: var(--line-account-primary-color);"
                            >
                              ${c.name}
                            </td>
                            <td style="padding: 0.5rem 0.25rem;">
                              ${c.channelType === "messaging" ? "Messaging API" : "LINE Login"}
                            </td>
                            <td style="padding: 0.5rem 0.25rem;">
                              ${c.channelType === "messaging"
                                ? html`<span
                                    class="badge ${c.isActive
                                      ? "badge-status"
                                      : "badge-status-inactive"}"
                                    style="font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 9999px; font-weight: 600;"
                                  >
                                    ${c.isActive ? "Active" : "Inactive"}
                                  </span>`
                                : "-"}
                            </td>
                            ${this.readonly
                              ? ""
                              : html`<td
                                  style="padding: 0.5rem 0.25rem; text-align: right;"
                                  @click=${(e: Event) => e.stopPropagation()}
                                >
                                  <button
                                    style="min-height: auto; padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 600;"
                                    @click=${(e: Event) => this.#emitEdit(e, c)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    class="danger"
                                    style="min-height: auto; padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 600; margin-left: 0.25rem;"
                                    @click=${(e: Event) => this.#emitDelete(e, c)}
                                  >
                                    Delete
                                  </button>
                                </td>`}
                          </tr>
                        `,
                      )}
                  </tbody>
                </table>
              `}
        </div>
      </div>

      ${this.readonly
        ? ""
        : html`<div class="details-actions">
            <button
              class="action-btn"
              type="button"
              ?disabled=${isPending}
              @click=${(e: Event) => this.#emitEdit(e, provider)}
            >
              Edit
            </button>
            <button
              class="danger"
              type="button"
              ?disabled=${isPending}
              @click=${(e: Event) => this.#emitDelete(e, provider)}
            >
              Delete
            </button>
          </div>`}
    `;
  }

  #renderChannelDetails(channel: ChannelView) {
    const isMessaging = channel.channelType === "messaging";
    const isPending = this.pendingItemIds.has(channel.id);
    const initial = channel.name.trim().charAt(0).toUpperCase();

    return html`
      ${this.inline
        ? ""
        : html`<div class="details-header">
            <div class="details-identity">
              ${isMessaging && channel.pictureUrl
                ? html`<img class="details-avatar" src=${channel.pictureUrl} alt=${channel.name} />`
                : html`<span
                    class="details-initial ${isMessaging
                      ? "details-initial-channel-messaging"
                      : "details-initial-channel-login"}"
                    >${initial}</span
                  >`}
              <div class="details-title-group">
                <h2>${channel.name}</h2>
                <div class="details-basic-id">Channel ID: ${channel.channelId}</div>
              </div>
            </div>
            ${isMessaging
              ? html`
                  <button
                    class="switch ${channel.isActive ? "checked" : ""}"
                    part="status-button"
                    role="switch"
                    aria-checked=${channel.isActive ? "true" : "false"}
                    aria-label=${channel.isActive ? "Deactivate Channel" : "Activate Channel"}
                    ?disabled=${this.readonly || isPending}
                    @click=${() => this.#emitToggle(channel)}
                  >
                    <span class="switch-thumb"></span>
                  </button>
                `
              : ""}
          </div>`}

      <div class="details-grid">
        <div class="details-section">
          <div class="details-section-title">Channel Details</div>
          <div class="details-row">
            <span class="details-label">Channel ID</span>
            <div class="details-value-wrapper">
              <span class="details-value">${channel.channelId}</span>
              <button
                class="copy-btn"
                type="button"
                title="Copy to clipboard"
                @click=${() => this.#copyToClipboard(channel.channelId)}
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
          ${this.#renderCredentialField(
            this.messages.channelSecretLabel,
            channel.channelSecret,
            `secret-${channel.id}`,
          )}
          ${isMessaging
            ? this.#renderCredentialField(
                this.messages.channelAccessTokenLabel,
                channel.channelAccessToken,
                `token-${channel.id}`,
              )
            : ""}
        </div>

        ${isMessaging
          ? html`
              <div class="details-section">
                <div class="details-section-title">Messaging Info</div>
                ${channel.botUserId
                  ? html`<div class="details-row">
                      <span class="details-label">Add Friend URL</span>
                      <span class="details-value">${channel.botUserId}</span>
                    </div>`
                  : ""}
                ${channel.basicId
                  ? html`<div class="details-row">
                      <span class="details-label">Bot Basic ID</span>
                      <span class="details-value">${channel.basicId}</span>
                    </div>`
                  : ""}
                ${channel.pictureUrl
                  ? html`<div class="details-row">
                      <span class="details-label">Add Friend QR Code</span>
                      <span class="details-value">${channel.pictureUrl}</span>
                    </div>`
                  : ""}
              </div>
            `
          : this.inline
            ? ""
            : html`
                <div class="details-section" style="grid-column: 1 / -1;">
                  <div
                    class="details-section-title"
                    style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--line-account-border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem;"
                  >
                    <span>LIFF Applications</span>
                    ${this.readonly
                      ? ""
                      : html`<button
                          class="primary"
                          type="button"
                          style="min-height: auto; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600;"
                          @click=${() => this.#emitCreateLiff(channel.channelId)}
                        >
                          + Add LIFF App
                        </button>`}
                  </div>
                  ${this.liffApps.filter((l) => l.loginChannelId === channel.channelId).length === 0
                    ? html`<p
                        style="color: var(--line-account-muted-color); font-size: 0.85rem; padding: 0.5rem 0;"
                      >
                        No LIFF applications found under this channel.
                      </p>`
                    : html`
                        <table
                          class="details-table"
                          style="width: 100%; border-collapse: collapse; margin-top: 0.25rem; font-size: 0.85rem;"
                        >
                          <thead>
                            <tr
                              style="border-bottom: 1px solid var(--line-account-border-color); text-align: left; color: var(--line-account-muted-color);"
                            >
                              <th style="padding: 0.5rem 0.25rem; font-weight: 600;">LIFF ID</th>
                              <th style="padding: 0.5rem 0.25rem; font-weight: 600;">View Type</th>
                              <th style="padding: 0.5rem 0.25rem; font-weight: 600;">URL</th>
                              ${this.readonly
                                ? ""
                                : html`<th
                                    style="padding: 0.5rem 0.25rem; text-align: right; font-weight: 600;"
                                  >
                                    Actions
                                  </th>`}
                            </tr>
                          </thead>
                          <tbody>
                            ${this.liffApps
                              .filter((l) => l.loginChannelId === channel.channelId)
                              .map(
                                (l) => html`
                                  <tr
                                    style="border-bottom: 1px dashed var(--line-account-border-color); cursor: pointer;"
                                    @click=${() => this.#emitDrillLiff(l)}
                                  >
                                    <td
                                      style="padding: 0.5rem 0.25rem; font-weight: 600; color: var(--line-account-primary-color);"
                                    >
                                      ${l.liffId}
                                    </td>
                                    <td style="padding: 0.5rem 0.25rem;">
                                      ${l.view.type.toUpperCase()}
                                    </td>
                                    <td
                                      style="padding: 0.5rem 0.25rem; max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                                      title=${l.view.url}
                                    >
                                      ${l.view.url}
                                    </td>
                                    ${this.readonly
                                      ? ""
                                      : html`<td
                                          style="padding: 0.5rem 0.25rem; text-align: right;"
                                          @click=${(e: Event) => e.stopPropagation()}
                                        >
                                          <button
                                            style="min-height: auto; padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 600;"
                                            @click=${(e: Event) => this.#emitEdit(e, l)}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            class="danger"
                                            style="min-height: auto; padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 600; margin-left: 0.25rem;"
                                            @click=${(e: Event) => this.#emitDelete(e, l)}
                                          >
                                            Delete
                                          </button>
                                        </td>`}
                                  </tr>
                                `,
                              )}
                          </tbody>
                        </table>
                      `}
                </div>
              `}
      </div>

      ${this.readonly
        ? ""
        : html`<div class="details-actions">
            ${isMessaging
              ? html`<button
                  class="action-btn"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emitSync(channel)}
                  style="margin-right: auto;"
                >
                  Sync
                </button>`
              : ""}
            <button
              class="action-btn"
              type="button"
              ?disabled=${isPending}
              @click=${(e: Event) => this.#emitEdit(e, channel)}
            >
              Edit
            </button>
            <button
              class="danger"
              type="button"
              ?disabled=${isPending}
              @click=${(e: Event) => this.#emitDelete(e, channel)}
            >
              Delete
            </button>
          </div>`}
    `;
  }

  #renderLiffDetails(liff: LiffAppView) {
    const isPending = this.pendingItemIds.has(liff.id);

    return html`
      ${this.inline
        ? ""
        : html`<div class="details-header">
            <div class="details-identity">
              <span class="details-initial details-initial-liff">L</span>
              <div class="details-title-group">
                <h2>LIFF: ${liff.liffId}</h2>
                <div class="details-basic-id">Login Channel Record ID: ${liff.loginChannelId}</div>
              </div>
            </div>
          </div>`}

      <div class="details-grid">
        <div class="details-section">
          <div class="details-section-title">LIFF Settings</div>
          <div class="details-row">
            <span class="details-label">LIFF App ID</span>
            <span class="details-value">${liff.id}</span>
          </div>
          <div class="details-row">
            <span class="details-label">View Type</span>
            <span class="details-value">${liff.view.type.toUpperCase()}</span>
          </div>
          <div class="details-row">
            <span class="details-label">View URL</span>
            <span class="details-value">${liff.view.url}</span>
          </div>
        </div>

        ${liff.description
          ? html`
              <div class="details-section">
                <div class="details-section-title">Description</div>
                <div
                  style="font-size: 0.875rem; line-height: 1.5; color: var(--line-account-text-color, #1f2933)"
                >
                  ${liff.description}
                </div>
              </div>
            `
          : ""}
      </div>

      ${this.readonly
        ? ""
        : html`<div class="details-actions">
            <button
              class="action-btn"
              type="button"
              ?disabled=${isPending}
              @click=${(e: Event) => this.#emitEdit(e, liff)}
            >
              Edit
            </button>
            <button
              class="danger"
              type="button"
              ?disabled=${isPending}
              @click=${(e: Event) => this.#emitDelete(e, liff)}
            >
              Delete
            </button>
          </div>`}
    `;
  }
}
