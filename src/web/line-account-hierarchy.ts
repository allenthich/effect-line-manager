import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type { ProviderView, ChannelView, LiffAppView, LineAccountFormType } from "./types.ts";
import "./line-account-detail-panel.ts";

type EntityItem = ProviderView | ChannelView | LiffAppView;

interface TreeChannel {
  item: ChannelView;
  liffApps: LiffAppView[];
  match: boolean;
}

interface TreeProvider {
  item: ProviderView;
  channels: TreeChannel[];
  match: boolean;
}

/** LitElement collapsible tree component displaying a hierarchical view of providers, channels, and LIFF apps. */
export class LineAccountHierarchy extends LitElement {
  static properties = {
    providers: { attribute: false },
    channels: { attribute: false },
    liffApps: { attribute: false },
    messages: { attribute: false },
    pendingItemIds: { attribute: false },
    itemErrors: { attribute: false },
    selectedItemId: { type: String },
    selectedProviderId: { type: String },
    selectedChannelId: { type: String },
    selectedLiffId: { type: String },
    disabled: { type: Boolean },
    searchQuery: { type: String },
    variant: { type: String },
    expandedProviderIds: { attribute: false },
    expandedChannelIds: { attribute: false },
  };

  static styles = css`
    :host {
      display: block;
      font-family: var(--line-account-font-family, system-ui, sans-serif);
    }
    .tree {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .tree-node {
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-surface-background, #fff);
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .tree-node.selected {
      border-color: var(--line-account-primary-color, #10b981);
      box-shadow: 0 0 0 2px var(--line-account-focus-color, rgba(16, 185, 129, 0.15));
    }
    .tree-node-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      cursor: pointer;
      user-select: none;
      border-radius: inherit;
    }
    .tree-node-header:hover {
      background-color: var(--line-account-muted-background, #f1f5f9);
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
    .node-avatar {
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
    .avatar-channel-messaging {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }
    .avatar-channel-login {
      background: linear-gradient(135deg, #8b5cf6, #5b21b6);
    }
    .avatar-liff {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    .node-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      align-items: flex-start;
    }
    .node-name {
      font-weight: 600;
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .node-subtitle {
      font-size: 0.75rem;
      color: var(--line-account-muted-color, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 600;
    }
    .badge-type {
      background-color: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .badge-active {
      background-color: #ecfdf5;
      color: #047a36;
      border: 1px solid #a3f0c2;
    }
    .badge-inactive {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .node-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }
    .node-btn {
      min-height: 1.5rem;
      padding: 0.125rem 0.375rem;
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: 0.375rem;
      background: var(--line-account-surface-background, #fff);
      color: var(--line-account-text-color, #1f2933);
      cursor: pointer;
      font-size: 0.7rem;
      font-weight: 600;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .node-btn:hover:not(:disabled) {
      background-color: #f1f5f9;
      border-color: #64748b;
    }
    .node-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .node-btn.danger:hover:not(:disabled) {
      background-color: #fef2f2;
      color: #991b1b;
      border-color: #fca5a5;
    }
    .node-btn.primary {
      border-color: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-color, #06c755);
    }
    .node-btn.primary:hover:not(:disabled) {
      background-color: var(--line-account-primary-color, #06c755);
      color: #fff;
    }
    .switch {
      position: relative;
      width: 1.75rem;
      height: 1rem;
      padding: 0;
      border: 1px solid #c7d0d9;
      border-radius: 999px;
      background-color: var(--line-account-switch-off-bg, #e4e7eb);
      cursor: pointer;
      min-height: auto;
      transition:
        background-color 0.2s,
        border-color 0.2s;
    }
    .switch.checked {
      background-color: var(--line-account-primary-color, #06c755);
      border-color: var(--line-account-primary-color, #06c755);
    }
    .switch-thumb {
      position: absolute;
      top: 1px;
      left: 1px;
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s;
    }
    .switch.checked .switch-thumb {
      transform: translateX(0.75rem);
    }
    .children {
      border-top: 1px solid var(--line-account-border-color, #e4e7eb);
      padding: 0.5rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .add-child-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      border: 2px dashed var(--line-account-border-color, #cbd5e1);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: transparent;
      color: var(--line-account-muted-color, #64748b);
      cursor: pointer;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.15s;
      margin-inline: 1.5rem;
    }
    .add-child-btn:hover {
      border-color: var(--line-account-primary-color, #10b981);
      color: var(--line-account-primary-color, #10b981);
      background: var(--line-account-selected-bg, #ecfdf5);
    }
    .add-child-btn svg {
      width: 0.875rem;
      height: 0.875rem;
    }
    .error-text {
      color: var(--line-account-danger-color, #c62828);
      font-size: 0.7rem;
      margin-top: 0.125rem;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      border: 2px dashed var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 1rem);
      background: var(--line-account-surface-background, #fff);
      text-align: center;
    }
    .empty-state h3 {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
      color: var(--line-account-text-color, #1f2933);
    }
    .empty-state p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--line-account-muted-color, #52606d);
    }
  `;

  declare providers: readonly ProviderView[];
  declare channels: readonly ChannelView[];
  declare liffApps: readonly LiffAppView[];
  declare messages: LineAccountManagementMessages;
  declare pendingItemIds: ReadonlySet<string>;
  declare itemErrors: ReadonlyMap<string, string>;
  declare selectedItemId: string | undefined;
  declare selectedProviderId: string | undefined;
  declare selectedChannelId: string | undefined;
  declare selectedLiffId: string | undefined;
  declare disabled: boolean;
  declare variant: string;
  declare searchQuery: string;
  declare expandedProviderIds: Set<string>;
  declare expandedChannelIds: Set<string>;

  constructor() {
    super();
    this.providers = [];
    this.channels = [];
    this.liffApps = [];
    this.messages = defaultLineAccountManagementMessages;
    this.pendingItemIds = new Set();
    this.itemErrors = new Map();
    this.selectedItemId = undefined;
    this.selectedProviderId = undefined;
    this.selectedChannelId = undefined;
    this.selectedLiffId = undefined;
    this.disabled = false;
    this.variant = "grid";
    this.searchQuery = "";
    this.expandedProviderIds = new Set();
    this.expandedChannelIds = new Set();
  }

  willUpdate(changedProperties: PropertyValues<this>): void {
    if (
      (changedProperties.has("selectedItemId") && this.selectedItemId) ||
      (changedProperties.has("selectedChannelId") && this.selectedChannelId) ||
      (changedProperties.has("selectedLiffId") && this.selectedLiffId)
    ) {
      const newExpandedProviders = new Set(this.expandedProviderIds);
      const newExpandedChannels = new Set(this.expandedChannelIds);

      const activeLiffId = this.selectedLiffId || this.selectedItemId;
      const liff = activeLiffId ? this.liffApps.find((l) => l.id === activeLiffId) : undefined;
      if (liff) {
        newExpandedChannels.add(liff.loginChannelId);
        const channel = this.channels.find((c) => c.id === liff.loginChannelId);
        if (channel) {
          newExpandedProviders.add(channel.providerId);
        }
      }

      const activeChannelId =
        this.selectedChannelId || (activeLiffId ? undefined : this.selectedItemId);
      if (activeChannelId) {
        const channel = this.channels.find((c) => c.id === activeChannelId);
        if (channel) {
          newExpandedProviders.add(channel.providerId);
        }
      }

      this.expandedProviderIds = newExpandedProviders;
      this.expandedChannelIds = newExpandedChannels;
    }
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  #toggleProvider = (id: string): void => {
    const next = new Set(this.expandedProviderIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expandedProviderIds = next;

    const provider = this.providers.find((p) => p.id === id);
    if (provider) {
      this.#selectItem(provider);
    }
  };

  #toggleChannel = (id: string): void => {
    const next = new Set(this.expandedChannelIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expandedChannelIds = next;

    const channel = this.channels.find((c) => c.id === id);
    if (channel) {
      this.#selectItem(channel);
    }
  };

  #selectItem = (item: EntityItem): void => {
    const type = this.#typeOf(item);
    let isAlreadySelected = false;
    if (type === "provider") {
      isAlreadySelected = this.selectedProviderId === item.id;
    } else if (type === "channel") {
      isAlreadySelected = this.selectedChannelId === item.id;
    } else if (type === "liff") {
      isAlreadySelected = this.selectedLiffId === item.id;
    }

    if (isAlreadySelected) {
      this.#emit("hierarchy-select", { item: null, type });
    } else {
      this.#emit("hierarchy-select", { item, type });
    }
  };

  #typeOf(item: EntityItem): LineAccountFormType {
    if ("channelType" in item) return "channel";
    if ("liffId" in item) return "liff";
    return "provider";
  }

  #buildTree(): TreeProvider[] {
    const query = this.searchQuery.toLowerCase().trim();
    const tree: TreeProvider[] = this.providers.map((p) => {
      const providerChannels = this.channels.filter((c) => c.providerId === p.id);
      const treeChannels: TreeChannel[] = providerChannels.map((c) => ({
        item: c,
        liffApps: this.liffApps.filter(
          (l) => c.channelType === "login" && l.loginChannelId === c.id,
        ),
        match: false,
      }));
      return { item: p, channels: treeChannels, match: false };
    });
    if (!query) return tree;
    for (const p of tree) {
      const pMatch =
        p.item.name.toLowerCase().includes(query) || p.item.id.toLowerCase().includes(query);
      for (const c of p.channels) {
        const cMatch =
          c.item.name.toLowerCase().includes(query) ||
          c.item.channelId.toLowerCase().includes(query);
        for (const l of c.liffApps) {
          if (
            l.liffId.toLowerCase().includes(query) ||
            (l.description ?? "").toLowerCase().includes(query)
          )
            c.match = true;
        }
        if (cMatch) p.match = true;
      }
      if (pMatch) {
        p.match = true;
        for (const c of p.channels) c.match = true;
      }
    }
    return tree
      .filter((p) => p.match || p.channels.some((c) => c.match))
      .map((p) => ({
        item: p.item,
        channels: p.channels
          .filter((c) => c.match || (p.match && !query))
          .map((c) => ({
            item: c.item,
            liffApps: query
              ? c.liffApps.filter(
                  (l) =>
                    l.liffId.toLowerCase().includes(query) ||
                    (l.description ?? "").toLowerCase().includes(query),
                )
              : c.liffApps,
            match: c.match,
          })),
        match: p.match,
      }));
  }

  #chevron(expanded: boolean) {
    return html`<svg
      class="chevron ${expanded ? "expanded" : ""}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>`;
  }

  protected render() {
    const tree = this.#buildTree();
    if (tree.length === 0) {
      return html`<div class="empty-state">
        <h3>${this.messages.emptyProviders}</h3>
        <button
          class="node-btn primary"
          type="button"
          @click=${() => this.#emit("hierarchy-add-provider", {})}
        >
          ${this.messages.addProvider}
        </button>
      </div>`;
    }
    return html`<div class="tree" part="tree">${tree.map((p) => this.#renderProvider(p))}</div>`;
  }

  #renderProvider(p: TreeProvider) {
    const expanded = this.expandedProviderIds.has(p.item.id);
    const isPending = this.pendingItemIds.has(p.item.id);
    const error = this.itemErrors.get(p.item.id);
    const initial = p.item.name.charAt(0).toUpperCase();
    return html` <div
      class="tree-node ${this.selectedProviderId === p.item.id ? "selected" : ""}"
      part="node"
    >
      <div class="tree-node-header" @click=${() => this.#toggleProvider(p.item.id)}>
        ${p.channels.length > 0
          ? this.#chevron(expanded)
          : html`<span class="chevron-placeholder"></span>`}
        <span class="node-avatar avatar-provider">${initial}</span>
        <div class="node-info">
          <span class="node-name">${p.item.name}</span>
          <span class="node-subtitle">Provider · ${p.item.id}</span>
          <span class="badge badge-type"
            >${p.channels.length} channel${p.channels.length !== 1 ? "s" : ""}</span
          >
        </div>
        ${this.variant === "split"
          ? ""
          : html`
              <div class="node-actions" @click=${(e: Event) => e.stopPropagation()}>
                <button
                  class="node-btn primary"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emit("hierarchy-add-channel", { providerId: p.item.id })}
                  title="Add Channel"
                >
                  +
                </button>
                <button
                  class="node-btn"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emit("hierarchy-edit", { item: p.item })}
                >
                  Edit
                </button>
                <button
                  class="node-btn danger"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emit("hierarchy-delete", { item: p.item })}
                >
                  Del
                </button>
              </div>
            `}
      </div>
      ${error
        ? html`<div class="error-text" style="padding: 0 0.75rem 0.5rem 2.5rem;">${error}</div>`
        : ""}
      ${expanded && p.channels.length > 0
        ? html` <div class="children">
            ${p.channels.map((c) => this.#renderChannel(c))}
            ${this.variant === "split"
              ? ""
              : html`<button
                  class="add-child-btn"
                  type="button"
                  @click=${() => this.#emit("hierarchy-add-channel", { providerId: p.item.id })}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Channel
                </button>`}
          </div>`
        : ""}
    </div>`;
  }

  #renderChannel(c: TreeChannel) {
    const expanded = this.expandedChannelIds.has(c.item.id);
    const isMessaging = c.item.channelType === "messaging";
    const isPending = this.pendingItemIds.has(c.item.id);
    const error = this.itemErrors.get(c.item.id);
    const initial = c.item.name.charAt(0).toUpperCase();
    const hasLiff = c.liffApps.length > 0;
    return html` <div
      class="tree-node ${this.selectedChannelId === c.item.id ? "selected" : ""}"
      part="node"
    >
      <div
        class="tree-node-header"
        @click=${() => (isMessaging ? this.#selectItem(c.item) : this.#toggleChannel(c.item.id))}
      >
        ${!isMessaging && hasLiff
          ? this.#chevron(expanded)
          : html`<span class="chevron-placeholder"></span>`}
        <span
          class="node-avatar ${isMessaging ? "avatar-channel-messaging" : "avatar-channel-login"}"
          >${initial}</span
        >
        <div class="node-info">
          <span class="node-name">${c.item.name}</span>
          <span class="node-subtitle"
            >${isMessaging ? "Messaging API" : "LINE Login"} · ${c.item.channelId}</span
          >
          ${c.item.channelType === "messaging"
            ? html`<span class="badge ${c.item.isActive ? "badge-active" : "badge-inactive"}"
                >${c.item.isActive ? "Active" : "Inactive"}</span
              >`
            : ""}
        </div>
        ${this.variant === "split"
          ? ""
          : html`
              <div class="node-actions" @click=${(e: Event) => e.stopPropagation()}>
                ${c.item.channelType === "messaging"
                  ? html`<button
                      class="switch ${c.item.isActive ? "checked" : ""}"
                      role="switch"
                      aria-checked=${c.item.isActive ? "true" : "false"}
                      aria-label=${c.item.isActive ? "Deactivate" : "Activate"}
                      ?disabled=${isPending}
                      @click=${() => this.#emit("hierarchy-toggle", { item: c.item })}
                    >
                      <span class="switch-thumb"></span>
                    </button>`
                  : html`<button
                      class="node-btn primary"
                      type="button"
                      ?disabled=${isPending}
                      @click=${() => this.#emit("hierarchy-add-liff", { channelId: c.item.id })}
                      title="Add LIFF"
                    >
                      +
                    </button>`}
                ${c.item.channelType === "messaging"
                  ? html`<button
                      class="node-btn"
                      type="button"
                      ?disabled=${isPending}
                      @click=${() => this.#emit("hierarchy-sync", { item: c.item })}
                    >
                      Sync
                    </button>`
                  : ""}
                <button
                  class="node-btn"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emit("hierarchy-edit", { item: c.item })}
                >
                  Edit
                </button>
                <button
                  class="node-btn danger"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emit("hierarchy-delete", { item: c.item })}
                >
                  Del
                </button>
              </div>
            `}
      </div>
      ${error
        ? html`<div class="error-text" style="padding: 0 0.75rem 0.5rem 2.5rem;">${error}</div>`
        : ""}
      ${this.variant !== "split" && this.selectedChannelId === c.item.id
        ? html`
            <div
              style="padding: 0.75rem 1.5rem; border-top: 1px solid var(--line-account-border-color, #e4e7eb);"
            >
              <line-account-detail-panel
                .item=${c.item}
                .currentTab=${"channel"}
                .providers=${this.providers}
                .channels=${this.channels}
                .liffApps=${this.liffApps}
                .pendingItemIds=${this.pendingItemIds}
                .messages=${this.messages}
                .readonly=${true}
                .inline=${true}
              ></line-account-detail-panel>
            </div>
          `
        : ""}
      ${!isMessaging && expanded && hasLiff
        ? html` <div class="children">
            ${c.liffApps.map((l) => this.#renderLiff(l))}
            ${this.variant === "split"
              ? ""
              : html`<button
                  class="add-child-btn"
                  type="button"
                  @click=${() => this.#emit("hierarchy-add-liff", { channelId: c.item.id })}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add LIFF App
                </button>`}
          </div>`
        : ""}
    </div>`;
  }

  #renderLiff(l: LiffAppView) {
    const isPending = this.pendingItemIds.has(l.id);
    const error = this.itemErrors.get(l.id);
    return html` <div
      class="tree-node ${this.selectedLiffId === l.id ? "selected" : ""}"
      part="node"
    >
      <div class="tree-node-header" @click=${() => this.#selectItem(l)}>
        <span class="chevron-placeholder"></span>
        <span class="node-avatar avatar-liff">L</span>
        <div class="node-info">
          <span class="node-name">${l.liffId}</span>
          <span class="node-subtitle">LIFF · ${l.view.type.toUpperCase()}</span>
          <span class="badge badge-type">${l.view.type.toUpperCase()}</span>
        </div>
        ${this.variant === "split"
          ? ""
          : html`
              <div class="node-actions" @click=${(e: Event) => e.stopPropagation()}>
                <button
                  class="node-btn"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emit("hierarchy-edit", { item: l })}
                >
                  Edit
                </button>
                <button
                  class="node-btn danger"
                  type="button"
                  ?disabled=${isPending}
                  @click=${() => this.#emit("hierarchy-delete", { item: l })}
                >
                  Del
                </button>
              </div>
            `}
      </div>
      ${error
        ? html`<div class="error-text" style="padding: 0 0.75rem 0.5rem 2.5rem;">${error}</div>`
        : ""}
      ${this.variant !== "split" && this.selectedLiffId === l.id
        ? html`
            <div
              style="padding: 0.75rem 1.5rem; border-top: 1px solid var(--line-account-border-color, #e4e7eb);"
            >
              <line-account-detail-panel
                .item=${l}
                .currentTab=${"liff"}
                .providers=${this.providers}
                .channels=${this.channels}
                .liffApps=${this.liffApps}
                .pendingItemIds=${this.pendingItemIds}
                .messages=${this.messages}
                .readonly=${true}
                .inline=${true}
              ></line-account-detail-panel>
            </div>
          `
        : ""}
    </div>`;
  }
}
