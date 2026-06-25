import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";
import { defaultLineDevelopersConsoleMessages } from "./messages.ts";
import type { LineDevelopersConsoleMessages } from "./messages.ts";
import type {
  ConsoleChannelType,
  ConsoleChannelView,
  ConsoleLiffAppView,
  ConsoleProviderView,
  LineConsoleAdapter,
  LineDevelopersConsoleErrorDetail,
} from "./types.ts";

const MASK = "••••••••";

const channelTypeLabel: Record<ConsoleChannelType, string> = {
  messaging: "Messaging API",
  login: "LINE Login",
  miniApp: "LINE MINI App",
  blockchain: "Blockchain Service",
};

/** LitElement wrapper around the LINE Developers Console: expandable hierarchy at a glance. */
export class LineDevelopersConsole extends LitElement {
  static properties = {
    adapter: { attribute: false },
    messages: { attribute: false },
    maskSecrets: { type: Boolean },
    searchQuery: { type: String },
    loading: { state: true },
    error: { state: true },
    providers: { state: true },
    channelsByProvider: { state: true },
    liffByChannel: { state: true },
    expandedProviderIds: { state: true },
    expandedChannelIds: { state: true },
    revealedSecrets: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      font-family: var(--line-account-font-family, system-ui, sans-serif);
      color: var(--line-account-text-color, #0f172a);
    }
    :host([hidden]) {
      display: none;
    }

    .console-toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: var(--line-account-radius, 1rem);
      background: var(--line-account-surface-background, #fff);
      box-shadow: var(--line-account-shadow, 0 4px 6px -1px rgb(0 0 0 / 0.04));
      flex-wrap: wrap;
    }
    .search {
      display: flex;
      flex: 1;
      min-width: 14rem;
      align-items: center;
      gap: 0.25rem;
    }
    .search input {
      flex: 1;
      min-width: 0;
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: 0.5rem;
      font: inherit;
      font-size: 0.8rem;
      background: var(--line-account-fieldset-bg, #f8fafc);
      color: inherit;
    }
    .search input:focus-visible {
      outline: 2px solid var(--line-account-primary-color, #10b981);
      outline-offset: 1px;
    }
    .toolbar-spacer {
      margin-left: auto;
    }
    .row-count {
      font-size: 0.72rem;
      color: var(--line-account-muted-color, #64748b);
    }
    .console-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.3rem 0.55rem;
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: 0.5rem;
      background: var(--line-account-surface-background, #fff);
      color: var(--line-account-text-color, #1f2933);
      cursor: pointer;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .console-btn:hover {
      border-color: var(--line-account-primary-color, #10b981);
      color: var(--line-account-primary-color, #10b981);
    }
    .console-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .console-btn svg {
      width: 0.85rem;
      height: 0.85rem;
    }

    .tree {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .node {
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-button-radius, 0.75rem);
      background: var(--line-account-surface-background, #fff);
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .node.selected {
      border-color: var(--line-account-primary-color, #10b981);
      box-shadow: 0 0 0 2px var(--line-account-focus-color, rgba(16, 185, 129, 0.15));
    }
    .node-header {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      cursor: pointer;
      background: none;
      border: 0;
      text-align: left;
      font: inherit;
      color: inherit;
      border-radius: inherit;
    }
    .node-header:hover {
      background: var(--line-account-muted-background, #f1f5f9);
    }
    .node-header:focus-visible {
      outline: 2px solid var(--line-account-primary-color, #10b981);
      outline-offset: -2px;
    }
    .chevron {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      color: var(--line-account-muted-color, #8a9ba8);
      transition: transform 0.2s;
    }
    .chevron.expanded {
      transform: rotate(90deg);
    }
    .chevron-placeholder {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }
    .avatar {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .avatar-provider {
      background: linear-gradient(135deg, #10b981, #059669);
    }
    .avatar-messaging {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }
    .avatar-login {
      background: linear-gradient(135deg, #8b5cf6, #5b21b6);
    }
    .avatar-liff {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    .head-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
      flex-wrap: wrap;
    }
    .head-name {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .head-sub {
      font-size: 0.72rem;
      color: var(--line-account-muted-color, #64748b);
    }
    .head-pills {
      display: inline-flex;
      gap: 0.25rem;
      align-items: center;
      margin-left: auto;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.05rem 0.45rem;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 600;
    }
    .badge-type {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .badge-provider {
      background: #ecfdf5;
      color: #047a36;
      border: 1px solid #a3f0c2;
    }
    .badge-messaging {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .badge-login {
      background: #f5f3ff;
      color: #5b21b6;
      border: 1px solid #ddd6fe;
    }
    .badge-liff {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-active {
      background: #ecfdf5;
      color: #047a36;
      border: 1px solid #a3f0c2;
    }
    .badge svg {
      width: 0.65rem;
      height: 0.65rem;
    }

    .children {
      border-top: 1px solid var(--line-account-border-color, #f0f3f9);
      padding: 0.75rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.4rem 1rem;
      font-size: 0.72rem;
    }
    .meta-grid > div {
      min-width: 0;
    }
    .meta-grid dt {
      color: var(--line-account-muted-color, #94a3b8);
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .meta-grid dd {
      margin: 0;
      font-weight: 600;
      word-break: break-word;
    }
    .secret-row {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .mini-btn {
      padding: 0 0.4rem;
      min-height: 1.3rem;
      font-size: 0.62rem;
      font-weight: 600;
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: 0.35rem;
      background: var(--line-account-surface-background, #fff);
      color: var(--line-account-muted-color, #64748b);
      cursor: pointer;
    }
    .mini-btn:hover {
      color: var(--line-account-primary-color, #10b981);
      border-color: var(--line-account-primary-color, #10b981);
    }
    .open-link {
      font-size: 0.72rem;
      color: var(--line-account-primary-color, #10b981);
    }
    .open-link:hover {
      text-decoration: underline;
    }

    .status-block {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
      max-width: 24rem;
    }
    .empty-state h3 {
      margin: 0;
      font-size: 1rem;
    }
    .empty-state p {
      margin: 0;
      font-size: 0.8rem;
      color: var(--line-account-muted-color, #64748b);
    }
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .skeleton .bar {
      height: 2.5rem;
      border-radius: 0.5rem;
      background: var(--line-account-muted-background, #f1f5f9);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .skeleton .bar.short {
      width: 60%;
    }
    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.45;
      }
    }
    .error-card {
      border: 1px solid var(--line-account-danger-border, #fca5a5);
      border-radius: 0.75rem;
      background: var(--line-account-danger-background, #fef2f2);
      color: var(--line-account-danger-color, #991b1b);
      padding: 0.75rem 1rem;
    }
    @media (max-width: 40rem) {
      .meta-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `;

  declare adapter: LineConsoleAdapter | undefined;
  declare messages: LineDevelopersConsoleMessages;
  declare maskSecrets: boolean;
  declare searchQuery: string;
  declare loading: boolean;
  declare error:
    | { operation: LineDevelopersConsoleErrorDetail["operation"]; message: string }
    | undefined;
  declare providers: readonly ConsoleProviderView[];
  declare channelsByProvider: Map<string, readonly ConsoleChannelView[]>;
  declare liffByChannel: Map<string, readonly ConsoleLiffAppView[]>;
  declare expandedProviderIds: Set<string>;
  declare expandedChannelIds: Set<string>;
  declare revealedSecrets: Set<string>;

  constructor() {
    super();
    this.adapter = undefined;
    this.messages = defaultLineDevelopersConsoleMessages;
    this.maskSecrets = true;
    this.searchQuery = "";
    this.loading = false;
    this.error = undefined;
    this.providers = [];
    this.channelsByProvider = new Map();
    this.liffByChannel = new Map();
    this.expandedProviderIds = new Set();
    this.expandedChannelIds = new Set();
    this.revealedSecrets = new Set();
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  #emitError(detail: LineDevelopersConsoleErrorDetail): void {
    this.error = { operation: detail.operation, message: this.messages.loadFailed };
    this.#emit("line-developers-console-error", detail);
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    void this.#loadProviders();
  }

  async refresh(): Promise<void> {
    this.channelsByProvider = new Map();
    this.liffByChannel = new Map();
    await this.#loadProviders();
  }

  async #loadProviders(): Promise<void> {
    if (this.adapter === undefined) return;
    this.loading = true;
    this.error = undefined;
    try {
      const providers = await this.adapter.listProviders();
      this.providers = providers;
    } catch (error) {
      this.#emitError({ operation: "listProviders", error });
    } finally {
      this.loading = false;
    }
  }

  async #loadChannels(providerId: string, provider: ConsoleProviderView): Promise<void> {
    if (this.adapter === undefined || this.channelsByProvider.has(providerId)) return;
    try {
      const channels = await this.adapter.listChannels(providerId);
      const next = new Map(this.channelsByProvider);
      next.set(providerId, channels);
      this.channelsByProvider = next;
    } catch (error) {
      this.#emitError({ operation: "listChannels", providerId, error });
      this.#selectProvider(provider, false);
    }
  }

  async #loadLiffApps(channelId: string, channel: ConsoleChannelView): Promise<void> {
    if (this.adapter === undefined || this.liffByChannel.has(channelId)) return;
    try {
      const apps = await this.adapter.listLiffApps(channelId);
      const next = new Map(this.liffByChannel);
      next.set(channelId, apps);
      this.liffByChannel = next;
    } catch (error) {
      this.#emitError({ operation: "listLiffApps", channelId, error });
      this.#toggleChannel(channel, false);
    }
  }

  #toggleProvider(provider: ConsoleProviderView): void {
    const expanded = this.expandedProviderIds.has(provider.providerId);
    this.expandedProviderIds = new Set(
      this.#setToggle(this.expandedProviderIds, provider.providerId, !expanded),
    );
    this.#selectProvider(provider, !expanded);
    if (!expanded) void this.#loadChannels(provider.providerId, provider);
  }

  #toggleChannel(channel: ConsoleChannelView, expand?: boolean): void {
    const shouldExpand = expand ?? !this.expandedChannelIds.has(channel.channelId);
    this.expandedChannelIds = new Set(
      this.#setToggle(this.expandedChannelIds, channel.channelId, shouldExpand),
    );
    if (shouldExpand && channel.type === "login")
      void this.#loadLiffApps(channel.channelId, channel);
  }

  #selectProvider(provider: ConsoleProviderView, selected: boolean): void {
    this.#emit("line-developers-console-select", { kind: "provider", item: provider, selected });
  }

  #setToggle(set: Set<string>, id: string, on: boolean): Set<string> {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  }

  #revealKey(channelId: string, field: string): string {
    return `${channelId}::${field}`;
  }

  #toggleReveal(channelId: string, field: string): void {
    const key = this.#revealKey(channelId, field);
    this.revealedSecrets = this.#setToggle(
      this.revealedSecrets,
      key,
      !this.revealedSecrets.has(key),
    );
  }

  #filteredProviders(): readonly ConsoleProviderView[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (query.length === 0) return this.providers;
    return this.providers.filter((p) => {
      if (p.name.toLowerCase().includes(query) || p.providerId.toLowerCase().includes(query))
        return true;
      const channels = this.channelsByProvider.get(p.providerId) ?? [];
      return channels.some(
        (c) => c.name.toLowerCase().includes(query) || c.channelId.toLowerCase().includes(query),
      );
    });
  }

  #rowSummary = (): string => {
    const providerCount = this.providers.length;
    const channelCount = [...this.channelsByProvider.values()].reduce(
      (sum, list) => sum + list.length,
      0,
    );
    const liffCount = [...this.liffByChannel.values()].reduce((sum, list) => sum + list.length, 0);
    return this.messages.rowSummary(providerCount, channelCount, liffCount);
  };

  #chevron(expanded: boolean): TemplateResult {
    return html`<svg
      class="chevron ${expanded ? "expanded" : ""}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>`;
  }

  protected render(): TemplateResult {
    return html`<div class="console-toolbar" part="toolbar">
        <div class="search">
          <input
            type="search"
            .value=${this.searchQuery}
            placeholder=${this.messages.searchPlaceholder}
            aria-label=${this.messages.searchLabel}
            @input=${(event: Event) => {
              this.searchQuery = (event.target as HTMLInputElement).value;
            }}
          />
        </div>
        <span class="row-count" aria-live="polite">${this.#rowSummary()}</span>
        <span class="toolbar-spacer"></span>
        <button
          class="console-btn"
          type="button"
          ?disabled=${this.loading || this.adapter === undefined}
          @click=${() => void this.refresh()}
          aria-label=${this.messages.refreshLabel}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          ${this.messages.refresh}
        </button>
        <button
          class="console-btn"
          type="button"
          @click=${() => {
            this.expandedProviderIds = new Set();
            this.expandedChannelIds = new Set();
          }}
          aria-label=${this.messages.collapseAllLabel}
        >
          ${this.messages.collapseAll}
        </button>
      </div>
      ${this.loading ? this.#renderLoading() : this.#renderBody()}`;
  }

  #renderLoading(): TemplateResult {
    return html`<div class="skeleton" aria-busy="true" aria-label=${this.messages.loadingLabel}>
      ${Array.from({ length: 3 }, () => html`<div class="bar"></div>`)}
      <div class="bar short"></div>
    </div>`;
  }

  #renderBody(): TemplateResult {
    if (this.adapter === undefined)
      return this.#renderEmpty(this.messages.noAdapter, this.messages.noAdapterHint);
    if (this.error !== undefined && this.providers.length === 0) return this.#renderError();
    const providers = this.#filteredProviders();
    if (providers.length === 0)
      return this.#renderEmpty(this.messages.emptyProviders, this.messages.emptyProvidersHint);
    return html`<div class="tree" part="tree" role="tree" aria-label=${this.messages.treeLabel}>
      ${providers.map((provider) => this.#renderProvider(provider))}
    </div>`;
  }

  #renderError(): TemplateResult {
    return html`<div class="error-card" role="alert" part="error">
      <strong>${this.messages.loadFailed}</strong>
      <p style="margin:0.25rem 0 0;">${this.error?.message ?? ""}</p>
      <button
        class="console-btn"
        style="margin-top:0.5rem;border-color:currentColor;color:inherit;"
        type="button"
        @click=${() => void this.refresh()}
      >
        ${this.messages.retry}
      </button>
    </div>`;
  }

  #renderEmpty(title: string, hint: string): TemplateResult {
    return html`<div class="status-block">
      <div class="empty-state" role="status">
        <svg
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          style="color:var(--line-account-muted-color,#94a3b8);"
          aria-hidden="true"
        >
          <path d="M3 7h18M3 12h18M3 17h18"></path>
        </svg>
        <h3>${title}</h3>
        <p>${hint}</p>
        ${this.adapter === undefined
          ? html`<a
              class="open-link"
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noopener"
              >${this.messages.openConsole} ↗</a
            >`
          : html`<button class="console-btn" type="button" @click=${() => void this.refresh()}>
              ${this.messages.refresh}
            </button>`}
      </div>
    </div>`;
  }

  #renderProvider(provider: ConsoleProviderView): TemplateResult {
    const expanded = this.expandedProviderIds.has(provider.providerId);
    const channels = this.channelsByProvider.get(provider.providerId) ?? [];
    const hasChildren = channels.length > 0;
    return html`<div class="node" role="treeitem" aria-expanded=${expanded ? "true" : "false"}>
      <button
        class="node-header"
        type="button"
        aria-controls="provider-content-${provider.providerId}"
        @click=${() => this.#toggleProvider(provider)}
      >
        ${hasChildren ? this.#chevron(expanded) : html`<span class="chevron-placeholder"></span>`}
        <span class="avatar avatar-provider" aria-hidden="true"
          >${provider.name.charAt(0).toUpperCase()}</span
        >
        <div class="head-row">
          <span class="head-name">${provider.name}</span>
          <span class="badge badge-provider">Provider</span>
          <span class="head-sub"
            >${provider.providerId}${provider.region ? ` · ${provider.region}` : ""}</span
          >
          <div class="head-pills">
            ${hasChildren
              ? html`<span class="badge badge-type"
                  >${channels.length}
                  ${channels.length === 1 ? this.messages.channel : this.messages.channels}</span
                >`
              : ""}
            ${provider.certified ? html`<span class="badge badge-active">Certified</span>` : ""}
          </div>
        </div>
      </button>
      ${expanded && hasChildren
        ? html`<div id="provider-content-${provider.providerId}" class="children">
            ${this.#renderProviderMeta(provider)}
            ${channels.map((channel) => this.#renderChannel(provider, channel))}
          </div>`
        : ""}
    </div>`;
  }

  #renderProviderMeta(provider: ConsoleProviderView): TemplateResult {
    return html`<dl class="meta-grid">
      <div>
        <dt>${this.messages.providerId}</dt>
        <dd>${provider.providerId}</dd>
      </div>
      <div>
        <dt>${this.messages.region}</dt>
        <dd>${provider.region ?? "—"}</dd>
      </div>
      <div>
        <dt>${this.messages.certified}</dt>
        <dd>${provider.certified ? this.messages.yes : this.messages.no}</dd>
      </div>
      <div>
        <dt>${this.messages.created}</dt>
        <dd>${provider.createdAt ?? "—"}</dd>
      </div>
    </dl>`;
  }

  #renderChannel(provider: ConsoleProviderView, channel: ConsoleChannelView): TemplateResult {
    const expanded = this.expandedChannelIds.has(channel.channelId);
    const liffApps =
      channel.type === "login" ? (this.liffByChannel.get(channel.channelId) ?? []) : [];
    const hasLiff = channel.type === "login" && liffApps.length > 0;
    const badgeClass =
      channel.type === "messaging"
        ? "badge-messaging"
        : channel.type === "login"
          ? "badge-login"
          : "badge-type";
    const avatarClass =
      channel.type === "messaging"
        ? "avatar-messaging"
        : channel.type === "login"
          ? "avatar-login"
          : "avatar-provider";
    return html`<div
      class="node ${expanded ? "selected" : ""}"
      role="treeitem"
      aria-expanded=${expanded ? "true" : "false"}
    >
      <button class="node-header" type="button" @click=${() => this.#toggleChannel(channel)}>
        ${hasLiff ? this.#chevron(expanded) : html`<span class="chevron-placeholder"></span>`}
        <span class="avatar ${avatarClass}" aria-hidden="true"
          >${channel.name.charAt(0).toUpperCase()}</span
        >
        <div class="head-row">
          <span class="head-name">${channel.name}</span>
          <span class="badge ${badgeClass}">${channelTypeLabel[channel.type]}</span>
          <span class="head-sub">${channel.channelId}</span>
          <div class="head-pills">
            ${channel.status
              ? html`<span
                  class="badge ${channel.status.toLowerCase() === "active" ||
                  channel.status.toLowerCase() === "published"
                    ? "badge-active"
                    : "badge-type"}"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  ${channel.status}
                </span>`
              : ""}
          </div>
        </div>
        <button
          class="console-btn"
          type="button"
          style="margin-left:0.5rem;"
          @click=${(event: Event) => {
            event.stopPropagation();
            this.#emit("line-developers-console-open", { kind: "channel", item: channel });
          }}
          aria-label=${this.messages.openConsole}
        >
          ↗
        </button>
      </button>
      ${expanded
        ? html`<div class="children">
            ${this.#renderChannelMeta(channel)}
            ${hasLiff ? liffApps.map((liff) => this.#renderLiff(liff)) : ""}
          </div>`
        : ""}
    </div>`;
  }

  #renderChannelMeta(channel: ConsoleChannelView): TemplateResult {
    return html`<dl class="meta-grid">
      <div>
        <dt>${this.messages.channelId}</dt>
        <dd>${channel.channelId}</dd>
      </div>
      ${channel.status
        ? html`<div>
            <dt>${this.messages.status}</dt>
            <dd>${channel.status}</dd>
          </div>`
        : ""}
      ${channel.botBasicId
        ? html`<div>
            <dt>${this.messages.botBasicId}</dt>
            <dd>${channel.botBasicId}</dd>
          </div>`
        : ""}
      ${channel.botUserId
        ? html`<div>
            <dt>${this.messages.botUserId}</dt>
            <dd>${channel.botUserId}</dd>
          </div>`
        : ""}
      ${channel.webhookUrl
        ? html`<div>
            <dt>${this.messages.webhookUrl}</dt>
            <dd>${channel.webhookUrl}</dd>
          </div>`
        : ""}
      ${channel.callbackUrl
        ? html`<div>
            <dt>${this.messages.callbackUrl}</dt>
            <dd>${channel.callbackUrl}</dd>
          </div>`
        : ""}
      ${channel.email
        ? html`<div>
            <dt>${this.messages.email}</dt>
            <dd>${channel.email}</dd>
          </div>`
        : ""}
      ${channel.channelSecret !== undefined && channel.channelSecret !== null
        ? html`<div>
            <dt>${this.messages.channelSecret}</dt>
            <dd>
              ${this.#renderSecret(channel.channelId, "channelSecret", channel.channelSecret)}
            </dd>
          </div>`
        : ""}
      ${channel.channelAccessToken !== undefined && channel.channelAccessToken !== null
        ? html`<div>
            <dt>${this.messages.accessToken}</dt>
            <dd>
              ${this.#renderSecret(
                channel.channelId,
                "channelAccessToken",
                channel.channelAccessToken,
              )}
            </dd>
          </div>`
        : ""}
      ${channel.createdAt
        ? html`<div>
            <dt>${this.messages.created}</dt>
            <dd>${channel.createdAt}</dd>
          </div>`
        : ""}
    </dl>`;
  }

  #renderSecret(channelId: string, field: string, value: string): TemplateResult {
    const key = this.#revealKey(channelId, field);
    const revealed = !this.maskSecrets || this.revealedSecrets.has(key);
    const shown = revealed ? value : MASK;
    return html`<span class="secret-row">
      <span aria-label=${revealed ? this.messages.secretRevealed : this.messages.secretMasked}
        >${shown}</span
      >
      ${this.maskSecrets
        ? html`<button
            class="mini-btn"
            type="button"
            @click=${() => this.#toggleReveal(channelId, field)}
          >
            ${revealed ? this.messages.hide : this.messages.reveal}
          </button>`
        : ""}
      <button
        class="mini-btn"
        type="button"
        @click=${() => {
          void navigator.clipboard?.writeText(value);
          this.#emit("line-developers-console-copy", { field, channelId });
        }}
      >
        ${this.messages.copy}
      </button>
    </span>`;
  }

  #renderLiff(liff: ConsoleLiffAppView): TemplateResult {
    return html`<div class="node" role="treeitem" aria-expanded="false">
      <div class="node-header" style="cursor:default;">
        <span class="chevron-placeholder"></span>
        <span class="avatar avatar-liff" aria-hidden="true">L</span>
        <div class="head-row">
          <span class="head-name">${liff.liffId}</span>
          <span class="badge badge-liff">LIFF</span>
          <span class="badge badge-type">${liff.view.type.toUpperCase()}</span>
          ${liff.permanentUrl
            ? html`<a
                class="open-link"
                href=${liff.permanentUrl}
                target="_blank"
                rel="noopener"
                style="margin-left:0.5rem;"
                >${this.messages.openLiff} ↗</a
              >`
            : ""}
        </div>
      </div>
      <div class="children">
        <dl class="meta-grid">
          <div>
            <dt>${this.messages.liffId}</dt>
            <dd>${liff.liffId}</dd>
          </div>
          <div>
            <dt>${this.messages.liffSize}</dt>
            <dd>${liff.view.type}</dd>
          </div>
          <div>
            <dt>${this.messages.liffUrl}</dt>
            <dd>${liff.view.url}</dd>
          </div>
          ${liff.description
            ? html`<div>
                <dt>${this.messages.liffDescription}</dt>
                <dd>${liff.description}</dd>
              </div>`
            : ""}
        </dl>
      </div>
    </div>`;
  }
}
