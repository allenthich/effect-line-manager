import QRCode from "qrcode";
import { Schema } from "effect";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import type { LineProviderManagementAdapter } from "../../adapter/types.ts";
import { createLineConsoleAdapterFromProviderManagementAdapter } from "./console-adapter.ts";
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
import { buildLiffUrl } from "../liff-url.ts";
import type { LineAccountForm } from "../line-account-form.ts";
import { LineLoginChannelId } from "../../shared/domain.ts";
import type {
  ProviderView,
  LineMessagingChannelView,
  LineLoginChannelView,
  LiffAppView,
  LineAccountFormType,
  LineAccountEntity,
  LineAccountFormSubmitDetail,
} from "../types.ts";

const MASK = "••••••••";

const channelTypeLabel: Record<ConsoleChannelType, string> = {
  messaging: "Messaging API",
  login: "LINE Login",
  miniApp: "LINE MINI App",
  blockchain: "Blockchain Service",
};

const buildConsoleUrl = (channelId: string): string =>
  `https://developers.line.biz/console/channel/${channelId}`;

/** Visual layout for the hierarchy surface. */
export type LineDevelopersConsoleVariant = "list" | "tree";

/** LitElement wrapper around the LINE Developers Console: expandable hierarchy at a glance. */
export class LineDevelopersConsole extends LitElement {
  static properties = {
    adapter: { attribute: false },
    messages: { attribute: false },
    maskSecrets: { type: Boolean },
    variant: { type: String },
    searchQuery: { type: String },
    loading: { state: true },
    error: { state: true },
    providers: { state: true },
    channelsByProvider: { state: true },
    liffByChannel: { state: true },
    expandedProviderIds: { state: true },
    expandedChannelIds: { state: true },
    revealedSecrets: { state: true },
    editingItem: { state: true },
    saving: { state: true },
    _qrCodeDataUrl: { state: true },
    _qrCodeError: { state: true },
    _qrCodeOpen: { state: true },
    _qrCodeLiffUrl: { state: true },
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
    *,
    *::before,
    *::after {
      box-sizing: border-box;
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
    .channel-header-row {
      display: flex;
      align-items: stretch;
    }
    .channel-header-row .node-header {
      flex: 1;
      width: auto;
      min-width: 0;
    }
    .channel-header-row .open-link {
      display: inline-flex;
      align-items: center;
      margin: 0.625rem 0.75rem 0.625rem 0.25rem;
      white-space: nowrap;
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
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
      max-width: 100%;
      min-width: 0;
    }
    .secret {
      min-width: 0;
      word-break: break-all;
      overflow-wrap: anywhere;
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

    /* ---- variant="tree": Variation 2 compact IDE tree ----------------------- */

    .tv-surface {
      margin-top: 0.75rem;
      overflow: hidden;
      border: 1px solid var(--line-console-tree-border, #1e293b);
      border-radius: var(--line-account-radius, 1rem);
      background: var(--line-console-tree-background, #0f172a);
      color: var(--line-console-tree-text, #e2e8f0);
      box-shadow: var(--line-account-shadow, 0 18px 40px rgb(2 6 23 / 0.18));
    }
    .tv-toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border-bottom: 1px solid var(--line-console-tree-border, #1e293b);
      background: var(--line-console-tree-toolbar-background, rgb(2 6 23 / 0.82));
      flex-wrap: wrap;
    }
    .tv-search {
      display: flex;
      flex: 1;
      min-width: 15rem;
    }
    .tv-search input {
      width: 100%;
      min-width: 0;
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--line-console-tree-border, #1e293b);
      border-radius: 0.5rem;
      background: var(--line-console-tree-background, #0f172a);
      color: var(--line-console-tree-text, #e2e8f0);
      font-family: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
      font-size: 0.72rem;
    }
    .tv-search input::placeholder {
      color: var(--line-console-tree-muted, #64748b);
    }
    .tv-search input:focus-visible,
    .tv-toolbar .console-btn:focus-visible,
    .tv-row:focus-visible,
    .tv-actions .mini-btn:focus-visible,
    .icon-copy-btn:focus-visible,
    .tv-open-link:focus-visible {
      outline: 2px solid var(--line-account-primary-color, #10b981);
      outline-offset: 2px;
    }
    .tv-toolbar .row-count {
      color: var(--line-console-tree-muted, #94a3b8);
      font-family: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
      font-size: 0.65rem;
      white-space: nowrap;
    }
    .tv-toolbar .console-btn {
      border-color: var(--line-console-tree-border, #334155);
      background: var(--line-console-tree-button-background, #1e293b);
      color: var(--line-console-tree-text, #e2e8f0);
    }
    .tv-toolbar .console-btn:hover {
      border-color: var(--line-account-primary-color, #10b981);
      background: #047857;
      color: #ffffff;
    }
    .tv-toolbar .console-btn.primary {
      border-color: #047857;
      background: #047857;
      color: #ffffff;
    }
    .tv-scroll {
      overflow-x: auto;
      padding: 1rem;
      scrollbar-color: #475569 #1e293b;
      scrollbar-width: thin;
    }
    .tv {
      min-width: 42rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      font-family: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
      font-size: 0.72rem;
    }
    .tv-row-wrap {
      position: relative;
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 0.3rem;
      border: 1px solid var(--line-console-tree-border, #1e293b);
      border-radius: 0.5rem;
      background: rgb(30 41 59 / 0.42);
      transition:
        background-color 0.15s,
        border-color 0.15s;
    }
    .tv-row {
      position: relative;
      display: flex;
      width: auto;
      min-width: 0;
      flex: 0 1 auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0 0.375rem 0.5rem;
      border: 0;
      border-radius: 0.45rem;
      background: transparent;
      color: var(--line-console-tree-text, #e2e8f0);
      white-space: nowrap;
    }
    button.tv-row {
      cursor: pointer;
    }
    .tv-row-wrap:hover {
      background: rgb(30 41 59 / 0.78);
      border-color: #475569;
    }
    .tv-row-wrap.r-provider.sel {
      background: rgb(30 41 59 / 0.86);
      border-color: #475569;
    }
    .tv-row-wrap.r-messaging.sel {
      background: rgb(23 37 84 / 0.34);
      border-color: rgb(59 130 246 / 0.55);
    }
    .tv-row-wrap.r-login.sel {
      background: rgb(59 7 100 / 0.28);
      border-color: rgb(139 92 246 / 0.55);
    }
    .tv-row-wrap.r-liff {
      background: rgb(69 26 3 / 0.28);
      border-color: rgb(245 158 11 / 0.45);
    }
    .tv-disclosure {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 0.5rem;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .tv-toggle {
      width: 0.75rem;
      flex-shrink: 0;
      color: var(--line-console-tree-muted, #94a3b8);
      font-weight: 700;
      text-align: center;
    }
    .r-provider .tv-toggle,
    .r-provider .tv-name {
      color: #6ee7b7;
    }
    .r-messaging .tv-toggle {
      color: #60a5fa;
    }
    .r-login .tv-toggle,
    .r-login .tv-name {
      color: #c4b5fd;
    }
    .r-liff .tv-toggle,
    .r-liff .tv-name {
      color: #fcd34d;
    }
    .tv-name {
      max-width: 20rem;
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
    }
    .tv-id {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 0.25rem;
      color: var(--line-console-tree-muted, #94a3b8);
      font-size: 0.65rem;
    }
    .tv-type {
      flex-shrink: 0;
      padding: 0.1rem 0.45rem;
      border: 1px solid transparent;
      border-radius: 0.35rem;
      font-family: var(--line-account-font-family, system-ui, sans-serif);
      font-size: 0.62rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .tv-type.t-provider {
      border-color: rgb(16 185 129 / 0.25);
      background: rgb(16 185 129 / 0.1);
      color: #34d399;
    }
    .tv-type.t-messaging {
      border-color: rgb(59 130 246 / 0.25);
      background: rgb(59 130 246 / 0.1);
      color: #60a5fa;
    }
    .tv-type.t-login {
      border-color: rgb(139 92 246 / 0.3);
      background: rgb(139 92 246 / 0.16);
      color: #c4b5fd;
    }
    .tv-type.t-liff {
      border-color: rgb(245 158 11 / 0.25);
      background: rgb(245 158 11 / 0.1);
      color: #fbbf24;
    }
    .tv-actions {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.3rem;
      margin-left: auto;
      margin-right: 0.5rem;
    }
    .tv-actions .mini-btn,
    .tv-fields .mini-btn {
      min-height: 1.5rem;
      padding: 0.1rem 0.5rem;
      border: 1px solid #334155;
      border-radius: 0.375rem;
      background: #1e293b;
      color: #cbd5e1;
      font-family: var(--line-account-font-family, system-ui, sans-serif);
      font-size: 0.62rem;
      font-weight: 600;
      cursor: pointer;
    }
    .tv-actions .mini-btn:hover,
    .tv-fields .mini-btn:hover {
      border-color: var(--line-account-primary-color, #10b981);
      background: #047857;
      color: #ffffff;
    }
    .tv-actions .btn-messaging {
      border-color: #1d4ed8;
      background: #1e40af;
      color: #ffffff;
    }
    .tv-actions .btn-login {
      border-color: #6d28d9;
      background: #5b21b6;
      color: #ffffff;
    }
    .tree-branch {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-left: 1rem;
      padding-top: 0.3rem;
      padding-left: 1.5rem;
    }
    .tree-guide-v {
      position: absolute;
      top: 0;
      bottom: 0.75rem;
      left: 0.75rem;
      width: 1px;
      background: #334155;
    }
    .tree-guide-h {
      position: absolute;
      top: 50%;
      left: -0.8rem;
      width: 0.75rem;
      height: 1px;
      background: #334155;
    }
    .tv-children {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .tv-fields {
      margin: 0.25rem 0 0.25rem 1.5rem;
      padding: 0.75rem;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      background: rgb(2 6 23 / 0.9);
      color: var(--line-console-tree-text, #e2e8f0);
      font-family: var(--line-account-font-family, system-ui, sans-serif);
      font-size: 0.72rem;
    }
    .tv-fields.detail-messaging {
      border-color: rgb(59 130 246 / 0.35);
    }
    .tv-fields.detail-login {
      border-color: rgb(139 92 246 / 0.35);
    }
    .tv-fields.detail-liff {
      border-color: rgb(245 158 11 / 0.28);
    }
    .tv-fields-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .tv-field-card {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 0.2rem;
    }
    .tv-fields .k {
      color: var(--line-console-tree-muted, #94a3b8);
      font-family: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
      font-size: 0.6rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .tv-fields .v {
      display: inline-flex;
      flex-wrap: wrap;
      min-width: 0;
      max-width: 100%;
      align-items: center;
      gap: 0.25rem;
      word-break: break-all;
      overflow-wrap: anywhere;
      color: #e2e8f0;
      font-family: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
      font-size: 0.68rem;
    }
    .tv-fields .secret {
      color: #e2e8f0;
      font-family: "SFMono-Regular", ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
      min-width: 0;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .tv-detail-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.65rem;
      padding-top: 0.55rem;
      border-top: 1px solid #1e293b;
    }
    .tv-open-link {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.6rem;
      border: 1px solid #334155;
      border-radius: 0.375rem;
      background: #1e293b;
      color: #e2e8f0;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      text-decoration: none;
    }
    .tv-open-link:hover {
      border-color: #475569;
      background: #334155;
    }
    .icon-copy-btn {
      display: inline-flex;
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      padding: 0.1rem;
      border: 0;
      border-radius: 0.25rem;
      background: none;
      color: var(--line-console-tree-muted, #94a3b8);
      cursor: pointer;
      vertical-align: middle;
    }
    .icon-copy-btn:hover {
      color: #34d399;
    }
    .tv-sub-header {
      margin: 0.4rem 0 0.1rem 1.5rem;
      color: #94a3b8;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    @media (max-width: 48rem) {
      .tv-fields-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 40rem) {
      .tv-search {
        flex-basis: 100%;
      }
      .tv-toolbar .row-count {
        order: 2;
        width: 100%;
      }
    }

    .liff-url-field {
      display: grid;
      gap: 0.5rem;
      margin-top: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .liff-url-field input {
      width: 100%;
      min-height: 2.25rem;
      box-sizing: border-box;
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--line-account-border-color, #cbd5e1);
      border-radius: var(--line-account-input-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      font: inherit;
      font-size: 0.875rem;
    }

    .liff-url-field input:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 1px;
      border-color: var(--line-account-primary-color, #06c755);
    }

    .liff-url-hint {
      margin: 0;
      color: var(--line-account-muted-color, #64748b);
      font-size: 0.75rem;
    }

    .liff-launch-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .liff-url-link {
      color: var(--line-account-primary-text-color, #057b38);
      overflow-wrap: anywhere;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .qr-dialog-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      text-align: center;
    }

    .qr-code {
      display: block;
      width: min(15rem, 100%);
      height: auto;
      padding: 0.5rem;
      box-sizing: border-box;
      background: #fff;
    }

    .qr-url {
      max-width: 30rem;
      margin: 0;
      color: var(--line-account-muted-color, #64748b);
      font-size: 0.75rem;
      overflow-wrap: anywhere;
    }

    .qr-show-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 2.25rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--line-account-primary-color, #06c755);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-primary-color, #06c755);
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.15s ease-in-out;
    }

    .qr-show-btn:hover:not(:disabled) {
      background: var(--line-account-primary-hover, #05b04b);
      border-color: var(--line-account-primary-hover, #05b04b);
    }

    .dialog-action {
      min-height: 2.75rem;
      padding: 0.625rem 1rem;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
    }

    .dialog-action.primary {
      border-color: var(--line-account-primary-color, #06c755);
      background: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-contrast, #fff);
    }

    .dialog-action:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 2px;
    }

    .dialog-action:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `;

  declare adapter: LineConsoleAdapter | LineProviderManagementAdapter | undefined;
  declare messages: LineDevelopersConsoleMessages;
  declare maskSecrets: boolean;
  declare variant: LineDevelopersConsoleVariant;
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
  declare editingItem:
    | {
        type: LineAccountFormType;
        item: LineAccountEntity;
      }
    | undefined;
  declare saving: boolean;
  declare _qrCodeDataUrl: string;
  declare _qrCodeError: string;
  declare _qrCodeOpen: boolean;
  declare _qrCodeLiffUrl: string;

  #lastAdapter: LineConsoleAdapter | LineProviderManagementAdapter | undefined;

  constructor() {
    super();
    this.adapter = undefined;
    this.messages = defaultLineDevelopersConsoleMessages;
    this.maskSecrets = true;
    this.variant = "list";
    this.searchQuery = "";
    this.loading = false;
    this.error = undefined;
    this.providers = [];
    this.channelsByProvider = new Map();
    this.liffByChannel = new Map();
    this.expandedProviderIds = new Set();
    this.expandedChannelIds = new Set();
    this.revealedSecrets = new Set();
    this.editingItem = undefined;
    this.saving = false;
    this._qrCodeDataUrl = "";
    this._qrCodeError = "";
    this._qrCodeOpen = false;
    this._qrCodeLiffUrl = "";
  }

  #generateQrCode = async (liffUrl: string): Promise<void> => {
    try {
      const svg = await QRCode.toString(liffUrl, { type: "svg", width: 240, margin: 1 });
      this._qrCodeDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      this._qrCodeError = "";
    } catch {
      this._qrCodeDataUrl = "";
      this._qrCodeError = "QR code could not be generated.";
    }
  };

  #openQrCode = (liffUrl: string): void => {
    this._qrCodeLiffUrl = liffUrl;
    this._qrCodeOpen = true;
    this._qrCodeDataUrl = "";
    this._qrCodeError = "";
    void this.#generateQrCode(liffUrl);
  };

  #closeQrCode = (): void => {
    this._qrCodeOpen = false;
  };

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  #emitError(detail: LineDevelopersConsoleErrorDetail): void {
    this.error = { operation: detail.operation, message: this.messages.loadFailed };
    this.#emit("line-developers-console-error", detail);
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    this.#lastAdapter = this.adapter;
    void this.#loadProviders();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("adapter") && this.adapter !== this.#lastAdapter) {
      this.#lastAdapter = this.adapter;
      void this.refresh();
    }
  }

  async refresh(): Promise<void> {
    this.channelsByProvider = new Map();
    this.liffByChannel = new Map();
    await this.#loadProviders();
  }

  #getNormalizedAdapter(): LineConsoleAdapter | undefined {
    if (this.adapter === undefined) return undefined;
    if ("listChannels" in this.adapter) return this.adapter;
    return createLineConsoleAdapterFromProviderManagementAdapter(this.adapter);
  }

  async #loadProviders(): Promise<void> {
    const adapter = this.#getNormalizedAdapter();
    if (adapter === undefined) return;
    this.loading = true;
    this.error = undefined;
    try {
      const providers = await adapter.listProviders();
      this.providers = providers;
    } catch (error) {
      this.#emitError({ operation: "listProviders", error });
    } finally {
      this.loading = false;
    }
  }

  async #loadChannels(providerId: string, provider: ConsoleProviderView): Promise<void> {
    const adapter = this.#getNormalizedAdapter();
    if (adapter === undefined || this.channelsByProvider.has(providerId)) return;
    try {
      const channels = await adapter.listChannels(providerId);
      const next = new Map(this.channelsByProvider);
      next.set(providerId, channels);
      this.channelsByProvider = next;
    } catch (error) {
      this.#emitError({ operation: "listChannels", providerId, error });
      this.#selectProvider(provider, false);
    }
  }

  async #loadLiffApps(channelId: string, channel: ConsoleChannelView): Promise<void> {
    const adapter = this.#getNormalizedAdapter();
    if (adapter === undefined || this.liffByChannel.has(channelId)) return;
    try {
      const apps = await adapter.listLiffApps(channelId);
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

  /** Expands and loads the complete visible hierarchy. */
  async expandAll(): Promise<void> {
    const providers = this.#filteredProviders();
    this.expandedProviderIds = new Set(providers.map((provider) => provider.providerId));
    await Promise.all(
      providers.map((provider) => this.#loadChannels(provider.providerId, provider)),
    );

    const channels = providers.flatMap(
      (provider) => this.channelsByProvider.get(provider.providerId) ?? [],
    );
    this.expandedChannelIds = new Set(channels.map((channel) => channel.channelId));
    await Promise.all(
      channels
        .filter((channel) => channel.type === "login")
        .map((channel) => this.#loadLiffApps(channel.channelId, channel)),
    );
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
    if (this.variant === "tree") {
      return html`<div class="tv-surface">
          <div class="tv-toolbar" part="toolbar">
            <div class="tv-search">
              <input
                type="search"
                name="line-console-filter"
                .value=${this.searchQuery}
                placeholder=${this.messages.searchPlaceholder}
                aria-label=${this.messages.searchLabel}
                @input=${(event: Event) => {
                  this.searchQuery = (event.target as HTMLInputElement).value;
                }}
              />
            </div>
            <span class="row-count" aria-live="polite">${this.#rowSummary()}</span>
            <button
              class="console-btn"
              type="button"
              ?disabled=${this.loading || this.adapter === undefined}
              @click=${() => void this.refresh()}
              aria-label=${this.messages.refreshLabel}
            >
              ${this.messages.refresh}
            </button>
            <button
              class="console-btn primary"
              type="button"
              data-action="expand-all"
              ?disabled=${this.loading || this.adapter === undefined}
              @click=${() => void this.expandAll()}
              aria-label=${this.messages.expandAllLabel ?? "Expand the complete hierarchy"}
            >
              ${this.messages.expandAll ?? "Expand all"}
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
          <div class="tv-scroll">${this.loading ? this.#renderLoading() : this.#renderBody()}</div>
        </div>
        ${this.#renderEditDialog()}`;
    }

    return html`<div class="console-toolbar" part="toolbar">
        <div class="search">
          <input
            type="search"
            name="line-console-filter"
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
      ${this.loading ? this.#renderLoading() : this.#renderBody()} ${this.#renderEditDialog()}`;
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
    return this.variant === "tree"
      ? html`<div class="tv" part="tree" role="tree" aria-label=${this.messages.treeLabel}>
          ${providers.map((provider) => this.#renderTvProvider(provider))}
        </div>`
      : html`<div class="tree" part="tree" role="tree" aria-label=${this.messages.treeLabel}>
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
            ${channels.map((channel) => this.#renderChannel(channel))}
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
        <dd>${provider.region ?? "-"}</dd>
      </div>
      <div>
        <dt>${this.messages.certified}</dt>
        <dd>${provider.certified ? this.messages.yes : this.messages.no}</dd>
      </div>
      ${provider.createdAt
        ? html`<div>
            <dt>${this.messages.created}</dt>
            <dd>${provider.createdAt}</dd>
          </div>`
        : ""}
    </dl>`;
  }

  #renderChannel(channel: ConsoleChannelView): TemplateResult {
    const expanded = this.expandedChannelIds.has(channel.channelId);
    const liffApps =
      channel.type === "login" ? (this.liffByChannel.get(channel.channelId) ?? []) : [];
    const hasLiff = liffApps.length > 0;
    const badgeClass =
      channel.type === "messaging"
        ? "badge-messaging"
        : channel.type === "login"
          ? "badge-login"
          : "badge-provider";
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
      <div class="channel-header-row">
        <button
          class="node-header channel-header-toggle"
          type="button"
          @click=${() => this.#toggleChannel(channel)}
        >
          ${hasLiff ? this.#chevron(expanded) : html`<span class="chevron-placeholder"></span>`}
          <span class="avatar ${avatarClass}" aria-hidden="true"
            >${channel.name.charAt(0).toUpperCase()}</span
          >
          <span class="head-row">
            <span class="head-name">${channel.name}</span>
            <span class="badge ${badgeClass}">${channelTypeLabel[channel.type]}</span>
            <span class="meta-pill">${channel.channelId}</span>
            ${channel.status ? html`<span class="meta-pill">${channel.status}</span>` : ""}
          </span>
        </button>
        <a
          class="open-link"
          href=${buildConsoleUrl(channel.channelId)}
          target="_blank"
          rel="noopener"
          >${this.messages.openConsole} ↗</a
        >
      </div>
      ${expanded
        ? html`<div class="children">
            ${this.#renderChannelMeta(channel)}
            ${channel.type === "login"
              ? html`<div style="margin-top:0.5rem;">
                  ${liffApps.map((liff) => this.#renderLiff(liff))}
                </div>`
              : ""}
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
    const liffUrl = buildLiffUrl(liff.liffId, liff.additionalUrlParameters);

    return html`<div class="node" role="treeitem" aria-expanded="false">
      <div class="node-header" style="cursor:default;">
        <span class="chevron-placeholder"></span>
        <span class="avatar avatar-liff" aria-hidden="true">L</span>
        <div class="head-row">
          <span class="head-name">${liff.liffId}</span>
          <span class="badge badge-liff">LIFF</span>
          <span class="badge badge-type">${liff.view.type.toUpperCase()}</span>
          <a
            class="open-link"
            href=${liffUrl}
            target="_blank"
            rel="noopener"
            style="margin-left:0.5rem;"
            >${this.messages.openLiff} ↗</a
          >
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
          <div>
            <dt>${this.messages.liffLaunchUrl ?? "LIFF URL"}</dt>
            <dd>${liffUrl}</dd>
          </div>
          ${liff.description
            ? html`<div>
                <dt>${this.messages.liffDescription}</dt>
                <dd>${liff.description}</dd>
              </div>`
            : ""}
        </dl>
        <div class="liff-launch-actions" style="margin-top:0.5rem;">
          <a class="liff-url-link" href=${liffUrl} target="_blank" rel="noopener">${liffUrl}</a>
          <button class="qr-show-btn" type="button" @click=${() => this.#openQrCode(liffUrl)}>
            Show QR code
          </button>
        </div>
      </div>
    </div>`;
  }

  #renderCopyBtn(value: string, label?: string): TemplateResult {
    return html`<button
      class="icon-copy-btn"
      type="button"
      title=${label ?? this.messages.copy}
      aria-label=${label ?? this.messages.copy}
      @click=${(e: Event) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value);
        this.#emit("line-developers-console-copy", { value });
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    </button>`;
  }

  #renderTvProvider(provider: ConsoleProviderView): TemplateResult {
    const expanded = this.expandedProviderIds.has(provider.providerId);
    const channels = this.channelsByProvider.get(provider.providerId) ?? [];
    const hasChildren = channels.length > 0;
    return html`<div role="treeitem" aria-expanded=${expanded ? "true" : "false"}>
      <div class="tv-row-wrap r-provider ${expanded ? "sel" : ""}">
        <button
          class="tv-row r-provider ${expanded ? "sel" : ""}"
          type="button"
          aria-expanded=${expanded ? "true" : "false"}
          @click=${() => this.#toggleProvider(provider)}
        >
          <span class="tv-toggle">${expanded ? "▾" : "▸"}</span>
          <span class="tv-name">${provider.name}</span>
        </button>
        <span class="tv-id">(id: ${provider.providerId})</span>
        ${this.#renderCopyBtn(provider.providerId, `Copy provider ID ${provider.providerId}`)}
        <span class="tv-type t-provider">Provider</span>
        <div class="tv-actions">
          <button
            class="mini-btn btn-provider"
            type="button"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.#openEditProvider(provider);
            }}
          >
            ${this.messages.edit ?? "Edit"}
          </button>
        </div>
      </div>
      ${expanded && hasChildren
        ? html`<div class="tree-branch" role="group">
            <span class="tree-guide-v" aria-hidden="true"></span>
            ${channels.map((channel) => this.#renderTvChannel(channel))}
          </div>`
        : ""}
    </div>`;
  }

  #renderTvChannel(channel: ConsoleChannelView): TemplateResult {
    const expanded = this.expandedChannelIds.has(channel.channelId);
    const liffApps =
      channel.type === "login" ? (this.liffByChannel.get(channel.channelId) ?? []) : [];
    const hasLiff = channel.type === "login" && liffApps.length > 0;
    const typeClass =
      channel.type === "messaging"
        ? "t-messaging"
        : channel.type === "login"
          ? "t-login"
          : "t-provider";
    const rowClass =
      channel.type === "messaging"
        ? "r-messaging"
        : channel.type === "login"
          ? "r-login"
          : "r-provider";
    const btnClass =
      channel.type === "messaging"
        ? "btn-messaging"
        : channel.type === "login"
          ? "btn-login"
          : "btn-provider";

    return html`<div role="treeitem" aria-expanded=${expanded ? "true" : "false"}>
      <div class="tv-row-wrap ${rowClass} ${expanded ? "sel" : ""}">
        <button
          class="tv-row ${rowClass} ${expanded ? "sel" : ""}"
          type="button"
          aria-expanded=${expanded ? "true" : "false"}
          @click=${() => this.#toggleChannel(channel)}
        >
          <span class="tree-guide-h" aria-hidden="true"></span>
          <span class="tv-toggle">${expanded ? "▾" : "▸"}</span>
          <span class="tv-name">${channel.name}</span>
        </button>
        <span class="tv-id">(id: ${channel.channelId})</span>
        ${this.#renderCopyBtn(channel.channelId, `Copy channel ID ${channel.channelId}`)}
        <span class="tv-type ${typeClass}">${channelTypeLabel[channel.type]}</span>
        <div class="tv-actions">
          <button
            class="mini-btn ${btnClass}"
            type="button"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.#openEditChannel(channel);
            }}
          >
            ${this.messages.edit ?? "Edit"}
          </button>
        </div>
      </div>
      ${expanded
        ? html`<div class="tv-children">
            ${this.#renderTvChannelFields(channel)}
            ${hasLiff
              ? html`<div class="tv-sub-header">LIFF APPS (${liffApps.length}):</div>
                  <div class="tree-branch" role="group">
                    <span class="tree-guide-v" aria-hidden="true"></span>
                    ${liffApps.map((liff) => this.#renderTvLiff(liff))}
                  </div>`
              : ""}
          </div>`
        : ""}
    </div>`;
  }

  #renderTvChannelFields(channel: ConsoleChannelView): TemplateResult {
    const parts: TemplateResult[] = [];
    if (channel.botBasicId)
      parts.push(
        html`<div class="tv-field-card">
          <span class="k">botBasicId</span>
          <span class="v">${channel.botBasicId} ${this.#renderCopyBtn(channel.botBasicId)}</span>
        </div>`,
      );
    if (channel.botUserId)
      parts.push(
        html`<div class="tv-field-card">
          <span class="k">botUserId</span>
          <span class="v">${channel.botUserId} ${this.#renderCopyBtn(channel.botUserId)}</span>
        </div>`,
      );
    if (channel.webhookUrl)
      parts.push(
        html`<div class="tv-field-card">
          <span class="k">webhookUrl</span>
          <span class="v">${channel.webhookUrl} ${this.#renderCopyBtn(channel.webhookUrl)}</span>
        </div>`,
      );
    if (channel.callbackUrl)
      parts.push(
        html`<div class="tv-field-card">
          <span class="k">callbackUrl</span>
          <span class="v">${channel.callbackUrl} ${this.#renderCopyBtn(channel.callbackUrl)}</span>
        </div>`,
      );
    if (channel.channelSecret !== undefined && channel.channelSecret !== null)
      parts.push(
        html`<div class="tv-field-card">
          <span class="k">channelSecret</span>
          ${this.#renderTvSecret(channel.channelId, "channelSecret", channel.channelSecret)}
        </div>`,
      );
    if (channel.channelAccessToken !== undefined && channel.channelAccessToken !== null)
      parts.push(
        html`<div class="tv-field-card">
          <span class="k">accessToken</span>
          ${this.#renderTvSecret(
            channel.channelId,
            "channelAccessToken",
            channel.channelAccessToken,
          )}
        </div>`,
      );
    const detailClass = channel.type === "login" ? "detail-login" : "detail-messaging";
    return html`<div class="tv-fields ${detailClass}">
      <div class="tv-fields-grid">${parts.map((p) => p)}</div>
      <div class="tv-detail-footer">
        <a
          class="tv-open-link"
          href=${buildConsoleUrl(channel.channelId)}
          target="_blank"
          rel="noopener"
          >${this.messages.openConsole} ↗</a
        >
      </div>
    </div>`;
  }

  #renderTvSecret(channelId: string, field: string, value: string): TemplateResult {
    const key = this.#revealKey(channelId, field);
    const revealed = !this.maskSecrets || this.revealedSecrets.has(key);
    const shown = revealed ? value : MASK;
    return html`<span class="secret-row">
      <span class="secret">${shown}</span>
      ${this.maskSecrets
        ? html`<button
            class="mini-btn"
            type="button"
            @click=${() => this.#toggleReveal(channelId, field)}
          >
            ${revealed ? this.messages.hide : this.messages.reveal}
          </button>`
        : ""}
      ${this.#renderCopyBtn(value, this.messages.copy)}
    </span>`;
  }

  #renderTvLiff(liff: ConsoleLiffAppView): TemplateResult {
    const liffUrl = buildLiffUrl(liff.liffId, liff.additionalUrlParameters);

    return html`<div role="treeitem" aria-expanded="true">
      <div class="tv-row-wrap r-liff">
        <div class="tv-row r-liff">
          <span class="tree-guide-h" aria-hidden="true"></span>
          <span class="tv-toggle">▾</span>
          <span class="tv-name">${liff.description || liff.liffId}</span>
        </div>
        <span class="tv-id">(liffId: ${liff.liffId})</span>
        ${this.#renderCopyBtn(liff.liffId, `Copy LIFF ID ${liff.liffId}`)}
        <span class="tv-type t-liff">LIFF App</span>
        <div class="tv-actions">
          <button
            class="mini-btn btn-liff"
            type="button"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.#openEditLiff(liff);
            }}
          >
            ${this.messages.edit ?? "Edit"}
          </button>
        </div>
      </div>
      <div class="tv-fields detail-liff">
        <div class="tv-fields-grid">
          <div class="tv-field-card">
            <span class="k">${this.messages.liffUrl}</span>
            <span class="v"
              >${liff.view.url} ${this.#renderCopyBtn(liff.view.url, "Copy endpoint URL")}</span
            >
          </div>
          <div class="tv-field-card">
            <span class="k">${this.messages.liffSize}</span>
            <span class="v">${liff.view.type}</span>
          </div>
          <div class="tv-field-card">
            <span class="k">${this.messages.liffLaunchUrl ?? "LIFF URL"}</span>
            <span class="v">${liffUrl} ${this.#renderCopyBtn(liffUrl, "Copy LIFF URL")}</span>
          </div>
        </div>
        <div class="tv-detail-footer">
          <button class="tv-open-link" type="button" @click=${() => this.#openQrCode(liffUrl)}>
            Show QR code
          </button>
          <a class="tv-open-link" href=${liffUrl} target="_blank" rel="noopener"
            >${this.messages.openLiff} ↗</a
          >
        </div>
      </div>
    </div>`;
  }

  #supportsInternalEditing(): boolean {
    return this.adapter !== undefined && "updateProvider" in this.adapter;
  }

  #openEditProvider(provider: ConsoleProviderView): void {
    this.#emit("line-developers-console-edit", { kind: "provider", item: provider });
    if (!this.#supportsInternalEditing()) return;

    const pItem: ProviderView = {
      id: provider.providerId,
      name: provider.name,
      createdAt: provider.createdAt ? new Date(provider.createdAt) : new Date(),
      updatedAt: new Date(),
    };
    this.editingItem = { type: "provider", item: pItem };
  }

  #openEditChannel(channel: ConsoleChannelView): void {
    this.#emit("line-developers-console-edit", { kind: "channel", item: channel });
    if (!this.#supportsInternalEditing()) return;

    const type: LineAccountFormType =
      channel.type === "login" ? "loginChannel" : "messagingChannel";
    const cItem: LineAccountEntity =
      channel.type === "login"
        ? ({
            id: channel.channelId,
            channelId: channel.channelId,
            providerId: channel.providerId,
            channelType: "login",
            name: channel.name,
            channelSecret: channel.channelSecret ?? null,
            createdAt: channel.createdAt ? new Date(channel.createdAt) : new Date(),
            updatedAt: new Date(),
          } as LineLoginChannelView)
        : ({
            id: channel.channelId,
            channelId: channel.channelId,
            providerId: channel.providerId,
            channelType: "messaging",
            name: channel.name,
            botUserId: channel.botUserId ?? null,
            botBasicId: channel.botBasicId ?? null,
            botDisplayName: channel.botDisplayName ?? null,
            botPictureUrl: channel.botPictureUrl ?? null,
            addFriendUrl: channel.addFriendUrl ?? null,
            addFriendQrCodeUrl: channel.addFriendQrCodeUrl ?? null,
            isActive: channel.status ? channel.status === "Active" : true,
            channelSecret: channel.channelSecret ?? null,
            channelAccessToken: channel.channelAccessToken ?? null,
            createdAt: channel.createdAt ? new Date(channel.createdAt) : new Date(),
            updatedAt: new Date(),
          } as LineMessagingChannelView);

    this.editingItem = { type, item: cItem };
  }

  #openEditLiff(liff: ConsoleLiffAppView): void {
    this.#emit("line-developers-console-edit", { kind: "liff", item: liff });
    if (!this.#supportsInternalEditing()) return;

    const decodeLoginChannelId = Schema.decodeUnknownSync(LineLoginChannelId);
    const lItem: LiffAppView = {
      id: liff.liffId,
      loginChannelId: decodeLoginChannelId(liff.channelId),
      liffId: liff.liffId,
      view: liff.view,
      additionalUrlParameters: liff.additionalUrlParameters ?? "",
      description: liff.description ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.editingItem = { type: "liff", item: lItem };
  }

  async #handleFormSubmit(event: CustomEvent<LineAccountFormSubmitDetail>): Promise<void> {
    if (this.adapter === undefined || this.editingItem === undefined) return;
    const detail = event.detail;
    const adapterAny = this.adapter as any;
    this.saving = true;

    try {
      if (detail.type === "provider") {
        if (typeof adapterAny.updateProvider === "function") {
          await adapterAny.updateProvider(this.editingItem.item.id, detail.input);
        }
      } else if (detail.type === "messagingChannel") {
        if (typeof adapterAny.updateMessagingChannel === "function") {
          const channelId = (this.editingItem.item as LineMessagingChannelView).channelId;
          await adapterAny.updateMessagingChannel(channelId, detail.input);
        }
      } else if (detail.type === "loginChannel") {
        if (typeof adapterAny.updateLoginChannel === "function") {
          const channelId = (this.editingItem.item as LineLoginChannelView).channelId;
          await adapterAny.updateLoginChannel(channelId, detail.input);
        }
      } else if (detail.type === "liff") {
        if (typeof adapterAny.updateLiffApp === "function") {
          const liffId = (this.editingItem.item as LiffAppView).liffId;
          await adapterAny.updateLiffApp(liffId, detail.input);
        }
      }

      this.editingItem = undefined;
      await this.refresh();
      this.#emit("line-account-updated", { type: detail.type, input: detail.input });
    } catch (error) {
      this.#emitError({ operation: "updateProvider" as any, error });
    } finally {
      this.saving = false;
    }
  }

  #submitEditForm(): void {
    this.shadowRoot
      ?.querySelector<LineAccountForm>('line-account-dialog[data-kind="edit"] line-account-form')
      ?.submit();
  }

  #renderEditDialog(): TemplateResult {
    const editing = this.editingItem !== undefined;
    const type = this.editingItem?.type ?? "provider";
    const item = this.editingItem?.item;
    const heading =
      type === "provider"
        ? "Edit Provider"
        : type === "messagingChannel"
          ? "Edit Messaging Channel"
          : type === "loginChannel"
            ? "Edit Login Channel"
            : "Edit LIFF Application";

    const providerViews: ProviderView[] = this.providers.map((p) => ({
      id: p.providerId,
      name: p.name,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: new Date(),
    }));

    const loginChannelViews: LineLoginChannelView[] = [...this.channelsByProvider.values()]
      .flat()
      .filter((c) => c.type === "login")
      .map((c) => ({
        id: c.channelId,
        channelId: c.channelId,
        providerId: c.providerId,
        channelType: "login",
        name: c.name,
        channelSecret: c.channelSecret ?? null,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: new Date(),
      }));

    return html`
      <line-account-dialog
        data-kind="edit"
        .open=${editing}
        .heading=${heading}
        @line-account-dialog-close-request=${() => {
          this.editingItem = undefined;
        }}
      >
        <line-account-form
          .type=${type}
          .mode=${"edit"}
          .item=${item}
          .providers=${providerViews}
          .loginChannels=${loginChannelViews}
          @line-account-form-submit=${(e: CustomEvent<LineAccountFormSubmitDetail>) =>
            void this.#handleFormSubmit(e)}
        ></line-account-form>
        <button
          class="dialog-action"
          slot="footer"
          type="button"
          ?disabled=${this.saving}
          @click=${() => {
            this.editingItem = undefined;
          }}
        >
          Cancel
        </button>
        <button
          class="dialog-action primary"
          part="submit-button"
          slot="footer"
          type="button"
          ?disabled=${this.saving}
          @click=${() => this.#submitEditForm()}
        >
          ${this.saving ? "Saving..." : "Save changes"}
        </button>
      </line-account-dialog>

      <line-account-dialog
        .open=${this._qrCodeOpen}
        heading="QR code"
        @line-account-dialog-close-request=${this.#closeQrCode}
      >
        <div class="qr-dialog-content">
          ${this._qrCodeDataUrl
            ? html`<img
                class="qr-code"
                src=${this._qrCodeDataUrl}
                alt="QR code for ${this._qrCodeLiffUrl}"
                data-liff-url=${this._qrCodeLiffUrl}
              />`
            : this._qrCodeError
              ? html`<p role="alert">${this._qrCodeError}</p>`
              : html`<p role="status">Generating QR code...</p>`}
          <p class="qr-url">${this._qrCodeLiffUrl}</p>
        </div>
        <button slot="footer" type="button" @click=${this.#closeQrCode}>Close</button>
      </line-account-dialog>
    `;
  }
}
