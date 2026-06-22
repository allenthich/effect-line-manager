import { Schema } from "effect";
import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";
import type { LineAccountManagementMessages } from "./messages.ts";
import { LineLoginChannelId } from "../channel/domain.ts";
import type {
  ProviderView,
  ChannelView,
  LiffAppView,
  LineAccountFormMode,
  LineAccountFormType,
  LineAccountFormSubmitDetail,
} from "./types.ts";

interface FormValues {
  // Provider
  providerName: string;

  // Channel
  channelProviderId: string;
  channelType: "messaging" | "login";
  channelName: string;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  channelBotUserId: string;
  channelBotBasicId: string;
  channelBotDisplayName: string;
  channelBotPictureUrl: string;
  channelAddFriendUrl: string;
  channelAddFriendQrCodeUrl: string;

  // LIFF App
  liffLoginChannelId: string;
  liffId: string;
  liffViewType: "compact" | "tall" | "full";
  liffViewUrl: string;
  liffDescription: string;
}

const decodeLoginChannelId = Schema.decodeUnknownSync(LineLoginChannelId);

const trimOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

/** LitElement form component for creating and editing providers, channels, and LIFF apps. */
export class LineAccountForm extends LitElement {
  static properties = {
    type: { type: String, reflect: true },
    mode: { type: String, reflect: true },
    item: { attribute: false },
    providers: { attribute: false },
    channels: { attribute: false },
    messages: { attribute: false },
    submitting: { type: Boolean, reflect: true },
    error: { type: String },
    showChannelSecret: { state: true },
    showChannelAccessToken: { state: true },
    selectedProviderId: { type: String },
    selectedChannelId: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      color: var(--line-account-text-color, #1f2933);
      font-family: var(--line-account-font-family, system-ui, sans-serif);
    }

    form,
    fieldset,
    .field {
      display: grid;
    }

    form {
      gap: var(--line-account-space-5, 1.25rem);
    }

    fieldset {
      gap: var(--line-account-space-4, 1rem);
      min-width: 0;
      margin: 0;
      padding: 1.25rem;
      border: 1px solid var(--line-account-border-color, #e4e7eb);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-fieldset-bg, #fafbfc);
    }

    legend {
      font-weight: 700;
      padding: 0 0.5rem;
      color: var(--line-account-primary-text-color, #057b38);
      font-size: 0.95rem;
    }

    .field {
      gap: var(--line-account-space-2, 0.5rem);
    }

    .label-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    label {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    input,
    select {
      width: 100%;
      min-height: 2.75rem;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--line-account-border-color, #c7d0d9);
      border-radius: var(--line-account-input-radius, 0.5rem);
      background: var(--line-account-surface-background, #fff);
      color: inherit;
      box-sizing: border-box;
      font: inherit;
      transition:
        border-color 0.15s ease-in-out,
        box-shadow 0.15s ease-in-out;
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: var(--line-account-primary-color, #06c755);
      box-shadow: 0 0 0 3px var(--line-account-focus-color, rgb(6 199 85 / 15%));
    }

    input:read-only,
    select:disabled {
      background: var(--line-account-muted-background, #eef2f5);
      color: var(--line-account-muted-color, #52606d);
    }

    input:read-only:focus {
      border-color: var(--line-account-border-color, #c7d0d9);
      box-shadow: none;
    }

    [aria-invalid="true"] {
      border-color: var(--line-account-danger-color, #c62828);
    }

    [aria-invalid="true"]:focus {
      border-color: var(--line-account-danger-color, #c62828);
      box-shadow: 0 0 0 3px var(--line-account-danger-focus, rgb(198 40 40 / 15%));
    }

    .password-toggle {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      min-height: auto;
      padding: 0.375rem;
      color: var(--line-account-muted-color, #52606d);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition:
        color 0.15s,
        background-color 0.15s;
    }

    .password-toggle:hover {
      color: var(--line-account-text-color, #1f2933);
      background-color: var(--line-account-muted-background, #eef2f5);
    }

    .password-toggle svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .hint {
      color: var(--line-account-muted-color, #52606d);
      font-size: 0.8125rem;
    }

    .error {
      margin: 0;
      padding: var(--line-account-space-3, 0.75rem);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-danger-background, #fff0f0);
      color: var(--line-account-danger-color, #a61b1b);
    }

    .field-error-msg {
      color: var(--line-account-danger-color, #c62828);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    button[type="submit"] {
      min-height: 2.75rem;
      padding: 0.625rem 1.25rem;
      border: 1px solid var(--line-account-primary-color, #06c755);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-contrast, #fff);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      transition:
        background-color 0.15s,
        transform 0.1s;
    }

    button[type="submit"]:hover:not(:disabled) {
      background-color: var(--line-account-primary-hover, #05b04b);
      border-color: var(--line-account-primary-hover, #05b04b);
    }

    button[type="submit"]:active:not(:disabled) {
      transform: scale(0.98);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (min-width: 32rem) {
      .grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--line-account-space-4, 1rem);
      }
    }
  `;

  declare type: LineAccountFormType;
  declare mode: LineAccountFormMode;
  declare item: ProviderView | ChannelView | LiffAppView | undefined;
  declare providers: ProviderView[];
  declare channels: ChannelView[];
  declare messages: LineAccountManagementMessages;
  declare submitting: boolean;
  declare error: string | undefined;
  declare showChannelSecret: boolean;
  declare showChannelAccessToken: boolean;
  declare selectedProviderId: string | undefined;
  declare selectedChannelId: string | undefined;

  #values: FormValues;
  #invalidFields = new Set<keyof FormValues>();
  #validationError: string | undefined;

  constructor() {
    super();
    this.type = "provider";
    this.mode = "create";
    this.item = undefined;
    this.providers = [];
    this.channels = [];
    this.submitting = false;
    this.error = undefined;
    this.showChannelSecret = false;
    this.showChannelAccessToken = false;
    this.selectedProviderId = undefined;
    this.selectedChannelId = undefined;
    this.#values = this.#initialValues();
  }

  reset(): void {
    this.#values = this.#initialValues();
    this.#invalidFields = new Set();
    this.#validationError = undefined;
    this.showChannelSecret = false;
    this.showChannelAccessToken = false;
    this.requestUpdate();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (
      changedProperties.has("type") ||
      changedProperties.has("mode") ||
      changedProperties.has("item") ||
      changedProperties.has("providers") ||
      changedProperties.has("channels") ||
      changedProperties.has("selectedProviderId") ||
      changedProperties.has("selectedChannelId")
    ) {
      this.#values = this.#initialValues();
      this.#invalidFields = new Set();
      this.#validationError = undefined;
      this.showChannelSecret = false;
      this.showChannelAccessToken = false;
    }
  }

  protected render() {
    const visibleError = this.error ?? this.#validationError;

    return html`
      <form
        part="form"
        id="line-account-form"
        aria-describedby=${visibleError ? "form-error" : undefined}
        @submit=${this.#handleSubmit}
      >
        ${visibleError
          ? html`<p class="error" id="form-error" role="alert">${visibleError}</p>`
          : ""}
        ${this.type === "provider"
          ? this.#renderProviderFields()
          : this.type === "channel"
            ? this.#renderChannelFields()
            : this.#renderLiffFields()}
      </form>
    `;
  }

  #renderProviderFields() {
    return html`
      <fieldset>
        <legend>${this.messages.createProviderHeading}</legend>
        ${this.#renderInputField(
          "providerName",
          this.messages.providerNameLabel,
          "text",
          true,
          this.messages.providerNameHint,
        )}
      </fieldset>
    `;
  }

  #renderChannelFields() {
    const editing = this.mode === "edit";
    return html`
      <fieldset>
        <legend>
          ${editing ? this.messages.editChannelHeading : this.messages.createChannelHeading}
        </legend>

        <div class="grid-2col">
          <div class="field" part="field">
            <label for="channelProviderId">${this.messages.channelProviderLabel}*</label>
            <select
              id="channelProviderId"
              name="channelProviderId"
              .value=${this.#values.channelProviderId}
              ?disabled=${this.submitting ||
              editing ||
              (this.selectedProviderId !== undefined && this.selectedProviderId !== "")}
              @change=${this.#handleSelectChange}
            >
              ${this.providers.map(
                (p) =>
                  html`<option value=${p.id} ?selected=${p.id === this.#values.channelProviderId}>
                    ${p.name}
                  </option>`,
              )}
            </select>
          </div>

          <div class="field" part="field">
            <label for="channelType">${this.messages.channelTypeLabel}*</label>
            <select
              id="channelType"
              name="channelType"
              .value=${this.#values.channelType}
              ?disabled=${this.submitting || editing}
              @change=${this.#handleSelectChange}
            >
              <option value="messaging" ?selected=${this.#values.channelType === "messaging"}>
                Messaging API
              </option>
              <option value="login" ?selected=${this.#values.channelType === "login"}>
                LINE Login
              </option>
            </select>
          </div>
        </div>

        <div class="grid-2col">
          ${this.#renderInputField(
            "channelName",
            this.messages.channelNameLabel,
            "text",
            true,
            this.messages.channelNameHint,
          )}
          ${this.#renderInputField(
            "channelId",
            this.messages.channelIdLabel,
            "text",
            true,
            this.messages.channelIdHint,
            editing, // In edit mode, don't allow modifying ID
          )}
        </div>

        ${this.#renderInputField(
          "channelSecret",
          this.messages.channelSecretLabel,
          "password",
          !editing,
          editing ? this.messages.channelSecretEditHint : this.messages.channelSecretCreateHint,
        )}
        ${this.#values.channelType === "messaging"
          ? this.#renderInputField(
              "channelAccessToken",
              this.messages.channelAccessTokenLabel,
              "password",
              !editing,
              editing
                ? this.messages.channelAccessTokenEditHint
                : this.messages.channelAccessTokenCreateHint,
            )
          : ""}
        ${this.#values.channelType === "messaging"
          ? html`
              <fieldset style="margin-top: 0.5rem;">
                <legend>Bot Profile (synced from LINE)</legend>
                <div class="grid-2col">
                  ${this.#renderInputField(
                    "channelBotUserId",
                    "Bot User ID",
                    "text",
                    false,
                    undefined,
                    false,
                    "Uxxxxxxxxxx",
                  )}
                  ${this.#renderInputField(
                    "channelBotBasicId",
                    "Bot Basic ID",
                    "text",
                    false,
                    undefined,
                    false,
                    "@your_basic_id",
                  )}
                  ${this.#renderInputField(
                    "channelBotDisplayName",
                    "Bot Display Name",
                    "text",
                    false,
                    undefined,
                    false,
                    "Example name",
                  )}
                  ${this.#renderInputField(
                    "channelBotPictureUrl",
                    "Bot Picture URL",
                    "text",
                    false,
                    undefined,
                    false,
                    "https://profile.line-scdn.net/...",
                  )}
                </div>
                <div class="grid-2col" style="margin-top: 0.5rem;">
                  ${this.#renderInputField(
                    "channelAddFriendUrl",
                    "Add Friend URL",
                    "text",
                    false,
                    undefined,
                    false,
                    "https://lin.ee/your-line-id",
                  )}
                  ${this.#renderInputField(
                    "channelAddFriendQrCodeUrl",
                    "Add Friend QR Code",
                    "text",
                    false,
                    undefined,
                    false,
                    "https://qr-official.line.me/gs/your-qr-code.png",
                  )}
                </div>
              </fieldset>
            `
          : ""}
      </fieldset>
    `;
  }

  #renderLiffFields() {
    const editing = this.mode === "edit";
    const loginChannels = this.channels.filter((c) => c.channelType === "login");

    return html`
      <fieldset>
        <legend>
          ${editing ? this.messages.editLiffAppHeading : this.messages.createLiffAppHeading}
        </legend>

        <div class="grid-2col">
          <div class="field" part="field">
            <label for="liffLoginChannelId">${this.messages.liffChannelLabel}*</label>
            <select
              id="liffLoginChannelId"
              name="liffLoginChannelId"
              .value=${this.#values.liffLoginChannelId}
              ?disabled=${this.submitting ||
              editing ||
              (this.selectedChannelId !== undefined && this.selectedChannelId !== "")}
              @change=${this.#handleSelectChange}
            >
              ${loginChannels.map(
                (c) =>
                  html`<option value=${c.id} ?selected=${c.id === this.#values.liffLoginChannelId}>
                    ${c.name} (${c.channelId})
                  </option>`,
              )}
            </select>
          </div>

          ${this.#renderInputField(
            "liffId",
            this.messages.liffIdLabel,
            "text",
            true,
            this.messages.liffIdHint,
            editing,
          )}
        </div>

        <div class="grid-2col">
          <div class="field" part="field">
            <label for="liffViewType">${this.messages.liffViewTypeLabel}*</label>
            <select
              id="liffViewType"
              name="liffViewType"
              .value=${this.#values.liffViewType}
              ?disabled=${this.submitting}
              @change=${this.#handleSelectChange}
            >
              <option value="compact" ?selected=${this.#values.liffViewType === "compact"}>
                Compact
              </option>
              <option value="tall" ?selected=${this.#values.liffViewType === "tall"}>Tall</option>
              <option value="full" ?selected=${this.#values.liffViewType === "full"}>Full</option>
            </select>
          </div>

          ${this.#renderInputField(
            "liffViewUrl",
            this.messages.liffViewUrlLabel,
            "text",
            true,
            this.messages.liffViewUrlHint,
          )}
        </div>

        ${this.#renderInputField(
          "liffDescription",
          this.messages.liffDescriptionLabel,
          "text",
          false,
        )}
      </fieldset>
    `;
  }

  submit(): void {
    this.shadowRoot?.querySelector("form")?.requestSubmit();
  }

  #renderInputField(
    name: keyof FormValues,
    label: string,
    type: "text" | "password",
    required: boolean,
    hint?: string,
    readOnly = false,
    placeholder?: string,
  ) {
    const isPassword = type === "password";
    let showPassword = false;
    let toggleShowPassword: (() => void) | undefined;

    if (isPassword) {
      if (name === "channelAccessToken") {
        showPassword = this.showChannelAccessToken;
        toggleShowPassword = () => {
          this.showChannelAccessToken = !this.showChannelAccessToken;
        };
      } else if (name === "channelSecret") {
        showPassword = this.showChannelSecret;
        toggleShowPassword = () => {
          this.showChannelSecret = !this.showChannelSecret;
        };
      }
    }

    const inputType = isPassword ? (showPassword ? "text" : "password") : "text";
    const hintId = hint === undefined ? undefined : `${name}-hint`;
    const isInvalid = this.#invalidFields.has(name);
    const fieldErrorId = `${name}-error`;
    const describedBy = [hintId, isInvalid ? fieldErrorId : ""].filter(Boolean).join(" ");

    return html`
      <div class="field" part="field">
        <div class="label-wrapper">
          <label for=${name}
            >${label}${required
              ? html`<span style="color:var(--line-account-danger-color, #c62828);margin-left:2px"
                  >*</span
                >`
              : ""}</label
          >
        </div>
        <div class="input-wrapper">
          <input
            id=${name}
            name=${name}
            type=${inputType}
            .value=${this.#values[name]}
            ?required=${required}
            ?readonly=${readOnly}
            ?disabled=${this.submitting}
            aria-describedby=${describedBy || undefined}
            aria-invalid=${isInvalid ? "true" : "false"}
            autocomplete="off"
            placeholder=${placeholder || undefined}
            @input=${this.#handleInput}
          />
          ${isPassword && !readOnly
            ? html`
                <button
                  class="password-toggle"
                  type="button"
                  aria-label=${showPassword ? "Hide password" : "Show password"}
                  ?disabled=${this.submitting}
                  @click=${toggleShowPassword}
                >
                  ${showPassword
                    ? html`
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path
                            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                          ></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      `
                    : html`
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      `}
                </button>
              `
            : ""}
        </div>
        ${isInvalid
          ? html`<span class="field-error-msg" id=${fieldErrorId} role="alert"
              >${this.#validationError}</span
            >`
          : ""}
        ${hint === undefined ? "" : html`<span class="hint" id=${hintId}>${hint}</span>`}
      </div>
    `;
  }

  #initialValues(): FormValues {
    const item = this.item;
    const type = this.type;

    let providerName = "";
    let channelProviderId = "";
    let channelType: "messaging" | "login" = "messaging";
    let channelName = "";
    let channelId = "";
    let channelSecret = "";
    let channelAccessToken = "";
    let channelBotUserId = "";
    let channelBotBasicId = "";
    let channelBotDisplayName = "";
    let channelBotPictureUrl = "";
    let channelAddFriendUrl = "";
    let channelAddFriendQrCodeUrl = "";
    let liffLoginChannelId = "";
    let liffId = "";
    let liffViewType: "compact" | "tall" | "full" = "tall";
    let liffViewUrl = "";
    let liffDescription = "";

    if (item !== undefined) {
      if (type === "provider") {
        const provider = item as ProviderView;
        providerName = provider.name;
      } else if (type === "channel") {
        const channel = item as ChannelView;
        channelProviderId = channel.providerId;
        channelType = channel.channelType;
        channelName = channel.name;
        channelId = channel.channelId;
        channelSecret = channel.channelSecret ?? "";
        if (channel.channelType === "messaging") {
          channelAccessToken = channel.channelAccessToken ?? "";
          channelBotUserId = channel.botUserId ?? "";
          channelBotBasicId = channel.botBasicId ?? "";
          channelBotDisplayName = channel.botDisplayName ?? "";
          channelBotPictureUrl = channel.botPictureUrl ?? "";
          channelAddFriendUrl = channel.addFriendUrl ?? "";
          channelAddFriendQrCodeUrl = channel.addFriendQrCodeUrl ?? "";
        }
      } else if (type === "liff") {
        const liff = item as LiffAppView;
        liffLoginChannelId = liff.loginChannelId;
        liffId = liff.liffId;
        liffViewType = liff.view.type;
        liffViewUrl = liff.view.url;
        liffDescription = liff.description ?? "";
      }
    } else {
      if (this.selectedProviderId && this.providers.some((p) => p.id === this.selectedProviderId)) {
        channelProviderId = this.selectedProviderId;
      } else if (this.providers.length > 0) {
        channelProviderId = this.providers[0].id;
      }
      const loginChannels = this.channels.filter((c) => c.channelType === "login");
      if (this.selectedChannelId && loginChannels.some((c) => c.id === this.selectedChannelId)) {
        liffLoginChannelId = this.selectedChannelId;
      } else if (loginChannels.length > 0) {
        liffLoginChannelId = loginChannels[0].id;
      }
    }

    return {
      providerName,
      channelProviderId,
      channelType,
      channelName,
      channelId,
      channelSecret,
      channelAccessToken,
      channelBotUserId,
      channelBotBasicId,
      channelBotDisplayName,
      channelBotPictureUrl,
      channelAddFriendUrl,
      channelAddFriendQrCodeUrl,
      liffLoginChannelId,
      liffId,
      liffViewType,
      liffViewUrl,
      liffDescription,
    };
  }

  #handleInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const name = target.name as keyof FormValues;
    (this.#values as any)[name] = target.value;
    if (this.#invalidFields.delete(name)) {
      if (this.#invalidFields.size === 0) this.#validationError = undefined;
      this.requestUpdate();
    }
  };

  #handleSelectChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const name = target.name as keyof FormValues;
    (this.#values as any)[name] = target.value;
    if (this.#invalidFields.delete(name)) {
      if (this.#invalidFields.size === 0) this.#validationError = undefined;
    }
    this.requestUpdate();
  };

  #handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (this.submitting || !this.#validate()) return;

    let detail: LineAccountFormSubmitDetail;

    if (this.type === "provider") {
      detail = {
        type: "provider",
        mode: this.mode,
        input:
          this.mode === "create"
            ? { name: this.#values.providerName.trim() }
            : { name: this.#values.providerName.trim() },
      };
    } else if (this.type === "channel") {
      if (this.mode === "create") {
        detail = {
          type: "channel",
          mode: "create",
          input:
            this.#values.channelType === "messaging"
              ? {
                  channelType: "messaging",
                  providerId: this.#values.channelProviderId.trim(),
                  name: this.#values.channelName.trim(),
                  channelId: this.#values.channelId.trim(),
                  channelSecret: this.#values.channelSecret.trim(),
                  channelAccessToken: this.#values.channelAccessToken.trim(),
                  botDisplayName: trimOptional(this.#values.channelBotDisplayName) ?? null,
                  botUserId: trimOptional(this.#values.channelBotUserId) ?? null,
                  botBasicId: trimOptional(this.#values.channelBotBasicId) ?? null,
                  botPictureUrl: trimOptional(this.#values.channelBotPictureUrl) ?? null,
                  addFriendUrl: trimOptional(this.#values.channelAddFriendUrl) ?? null,
                  addFriendQrCodeUrl: trimOptional(this.#values.channelAddFriendQrCodeUrl) ?? null,
                }
              : {
                  channelType: "login",
                  providerId: this.#values.channelProviderId.trim(),
                  name: this.#values.channelName.trim(),
                  channelId: this.#values.channelId.trim(),
                  channelSecret: this.#values.channelSecret.trim(),
                },
        };
      } else {
        const channel = this.item as ChannelView;
        const input: any = {};
        if (this.#values.channelName.trim() !== channel.name) {
          input.name = this.#values.channelName.trim();
        }
        if (this.#values.channelId.trim() !== channel.channelId) {
          input.channelId = this.#values.channelId.trim();
        }
        const secret = this.#values.channelSecret.trim();
        if (secret !== "" && secret !== (channel.channelSecret ?? "")) {
          input.channelSecret = secret;
        }
        if (channel.channelType === "messaging") {
          const token = this.#values.channelAccessToken.trim();
          if (token !== "" && token !== (channel.channelAccessToken ?? "")) {
            input.channelAccessToken = token;
          }
          const botDisplayName = this.#values.channelBotDisplayName.trim();
          if (botDisplayName !== (channel.botDisplayName ?? "")) {
            input.botDisplayName = botDisplayName || null;
          }
          const botUserId = this.#values.channelBotUserId.trim();
          if (botUserId !== (channel.botUserId ?? "")) {
            input.botUserId = botUserId || null;
          }
          const botBasicId = this.#values.channelBotBasicId.trim();
          if (botBasicId !== (channel.botBasicId ?? "")) {
            input.botBasicId = botBasicId || null;
          }
          const botPictureUrl = this.#values.channelBotPictureUrl.trim();
          if (botPictureUrl !== (channel.botPictureUrl ?? "")) {
            input.botPictureUrl = botPictureUrl || null;
          }
          const addFriendUrl = this.#values.channelAddFriendUrl.trim();
          if (addFriendUrl !== (channel.addFriendUrl ?? "")) {
            input.addFriendUrl = addFriendUrl || null;
          }
          const addFriendQrCodeUrl = this.#values.channelAddFriendQrCodeUrl.trim();
          if (addFriendQrCodeUrl !== (channel.addFriendQrCodeUrl ?? "")) {
            input.addFriendQrCodeUrl = addFriendQrCodeUrl || null;
          }
        }
        detail = {
          type: "channel",
          mode: "edit",
          input,
        };
      }
    } else {
      // LIFF
      if (this.mode === "create") {
        detail = {
          type: "liff",
          mode: "create",
          input: {
            loginChannelId: decodeLoginChannelId(this.#values.liffLoginChannelId.trim()),
            liffId: this.#values.liffId.trim(),
            view: {
              type: this.#values.liffViewType,
              url: this.#values.liffViewUrl.trim(),
            },
            description: trimOptional(this.#values.liffDescription),
          },
        };
      } else {
        const liff = this.item as LiffAppView;
        const input: any = {};
        if (this.#values.liffId.trim() !== liff.liffId) {
          input.liffId = this.#values.liffId.trim();
        }
        if (
          this.#values.liffViewType !== liff.view.type ||
          this.#values.liffViewUrl.trim() !== liff.view.url
        ) {
          input.view = {
            type: this.#values.liffViewType,
            url: this.#values.liffViewUrl.trim(),
          };
        }
        const desc = trimOptional(this.#values.liffDescription);
        const originalDesc = liff.description ?? null;
        if (desc !== originalDesc) {
          input.description = desc;
        }
        detail = {
          type: "liff",
          mode: "edit",
          input,
        };
      }
    }

    this.dispatchEvent(
      new CustomEvent<LineAccountFormSubmitDetail>("line-account-form-submit", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  };

  #validate(): boolean {
    const required: (keyof FormValues)[] = [];
    if (this.type === "provider") {
      required.push("providerName");
    } else if (this.type === "channel") {
      required.push("channelProviderId", "channelName", "channelId");
      if (this.mode === "create") {
        required.push("channelSecret");
        if (this.#values.channelType === "messaging") {
          required.push("channelAccessToken");
        }
      }
    } else if (this.type === "liff") {
      required.push("liffLoginChannelId", "liffId", "liffViewUrl");
    }

    const invalid = required.filter((name) => this.#values[name].trim() === "");
    this.#invalidFields = new Set(invalid);

    if (invalid.length === 0) {
      this.#validationError = undefined;
      return true;
    }

    this.#validationError = invalid.some((name) => this.#values[name].length > 0)
      ? this.messages.whitespaceField
      : this.messages.requiredField;
    this.requestUpdate();
    return false;
  }
}
