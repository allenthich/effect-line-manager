import { LitElement, css, html } from "lit";
import type { PropertyValues } from "lit";
import { defaultLineAccountManagementMessages } from "./messages.ts";
import type { LineAccountManagementMessages } from "./messages.ts";
import type {
  CreateLineAccountInput,
  LineAccountFormMode,
  LineAccountFormSubmitDetail,
  LineAccountView,
  UpdateLineAccountInput,
} from "./types.ts";

interface FormValues {
  name: string;
  channelId: string;
  channelAccessToken: string;
  channelSecret: string;
  loginChannelId: string;
  loginChannelSecret: string;
  liffId: string;
}

const trimOptional = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export class LineAccountForm extends LitElement {
  static properties = {
    mode: { type: String, reflect: true },
    account: { attribute: false },
    messages: { attribute: false },
    submitting: { type: Boolean, reflect: true },
    error: { type: String },
    showChannelAccessToken: { state: true },
    showChannelSecret: { state: true },
    showLoginChannelSecret: { state: true },
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

    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
    }

    .badge.configured {
      background-color: var(--line-account-badge-configured-bg, #e6fdf0);
      color: var(--line-account-badge-configured-color, #047a36);
      border: 1px solid var(--line-account-badge-configured-border, #a3f0c2);
    }

    .badge.unconfigured {
      background-color: var(--line-account-badge-unconfigured-bg, #f1f3f5);
      color: var(--line-account-badge-unconfigured-color, #52606d);
      border: 1px solid var(--line-account-badge-unconfigured-border, #d9e0e6);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    input {
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

    input:focus {
      outline: none;
      border-color: var(--line-account-primary-color, #06c755);
      box-shadow: 0 0 0 3px var(--line-account-focus-color, rgb(6 199 85 / 15%));
    }

    input:read-only {
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

  declare mode: LineAccountFormMode;
  declare account: LineAccountView | undefined;
  declare messages: LineAccountManagementMessages;
  declare submitting: boolean;
  declare error: string | undefined;
  declare showChannelAccessToken: boolean;
  declare showChannelSecret: boolean;
  declare showLoginChannelSecret: boolean;

  #values: FormValues;
  #initialFormValues: FormValues | undefined;
  #invalidFields = new Set<keyof FormValues>();
  #validationError: string | undefined;

  constructor() {
    super();
    this.mode = "create";
    this.account = undefined;
    this.messages = defaultLineAccountManagementMessages;
    this.submitting = false;
    this.error = undefined;
    this.showChannelAccessToken = false;
    this.showChannelSecret = false;
    this.showLoginChannelSecret = false;
    this.#values = this.#initialValues();
    this.#initialFormValues = { ...this.#values };
  }

  reset(): void {
    this.#values = this.#initialValues();
    this.#initialFormValues = { ...this.#values };
    this.#invalidFields = new Set();
    this.#validationError = undefined;
    this.showChannelAccessToken = false;
    this.showChannelSecret = false;
    this.showLoginChannelSecret = false;
    this.requestUpdate();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("mode") || changedProperties.has("account")) {
      this.#values = this.#initialValues();
      this.#initialFormValues = { ...this.#values };
      this.#invalidFields = new Set();
      this.#validationError = undefined;
      this.showChannelAccessToken = false;
      this.showChannelSecret = false;
      this.showLoginChannelSecret = false;
    }
  }

  protected render() {
    const visibleError = this.error ?? this.#validationError;
    const editing = this.mode === "edit";

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
        <fieldset>
          <legend>${this.messages.messagingApiGroup}</legend>
          <div class="grid-2col">
            ${this.#renderField(
              "name",
              this.messages.nameLabel,
              "text",
              true,
              this.messages.nameHint,
            )}
            ${this.#renderField(
              "channelId",
              this.messages.channelIdLabel,
              "text",
              true,
              this.messages.channelIdHint,
              false,
            )}
          </div>
          ${this.#renderField(
            "channelAccessToken",
            this.messages.channelAccessTokenLabel,
            "password",
            !editing,
            editing
              ? this.messages.channelAccessTokenEditHint
              : this.messages.channelAccessTokenCreateHint,
          )}
          ${this.#renderField(
            "channelSecret",
            this.messages.channelSecretLabel,
            "password",
            !editing,
            editing ? this.messages.channelSecretEditHint : this.messages.channelSecretCreateHint,
          )}
        </fieldset>
        <fieldset>
          <legend>${this.messages.lineLoginGroup}</legend>
          <div class="grid-2col">
            ${this.#renderField("loginChannelId", this.messages.loginChannelIdLabel, "text", false)}
            ${this.#renderField(
              "loginChannelSecret",
              this.messages.loginChannelSecretLabel,
              "password",
              false,
              editing ? this.messages.loginChannelSecretEditHint : undefined,
            )}
          </div>
        </fieldset>
        <fieldset>
          <legend>${this.messages.liffGroup}</legend>
          ${this.#renderField("liffId", this.messages.liffIdLabel, "text", false)}
        </fieldset>
      </form>
    `;
  }

  submit(): void {
    this.shadowRoot?.querySelector("form")?.requestSubmit();
  }

  #renderField(
    name: keyof FormValues,
    label: string,
    type: "text" | "password",
    required: boolean,
    hint?: string,
    readOnly = false,
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
      } else if (name === "loginChannelSecret") {
        showPassword = this.showLoginChannelSecret;
        toggleShowPassword = () => {
          this.showLoginChannelSecret = !this.showLoginChannelSecret;
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
    const account = this.account;
    return {
      name: account?.name ?? "",
      channelId: account?.channelId ?? "",
      channelAccessToken: account?.hasChannelAccessToken ? "••••••••••••••••" : "",
      channelSecret: account?.hasChannelSecret ? "••••••••••••••••" : "",
      loginChannelId: account?.loginChannelId ?? "",
      loginChannelSecret: account?.hasLoginChannelSecret ? "••••••••••••••••" : "",
      liffId: account?.liffId ?? "",
    };
  }

  #handleInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const name = target.name as keyof FormValues;
    this.#values[name] = target.value;
    if (this.#invalidFields.delete(name)) {
      if (this.#invalidFields.size === 0) this.#validationError = undefined;
      this.requestUpdate();
    }
  };

  #handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (this.submitting || !this.#validate()) return;

    const detail: LineAccountFormSubmitDetail =
      this.mode === "create"
        ? { mode: "create", input: this.#createInput() }
        : { mode: "edit", input: this.#updateInput() };

    this.dispatchEvent(
      new CustomEvent<LineAccountFormSubmitDetail>("line-account-form-submit", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  };

  #validate(): boolean {
    const required: (keyof FormValues)[] =
      this.mode === "create"
        ? ["name", "channelId", "channelAccessToken", "channelSecret"]
        : ["name", "channelId"];
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

  #createInput(): CreateLineAccountInput {
    return {
      name: this.#values.name.trim(),
      channelId: this.#values.channelId.trim(),
      channelAccessToken: this.#values.channelAccessToken.trim(),
      channelSecret: this.#values.channelSecret.trim(),
      loginChannelId: trimOptional(this.#values.loginChannelId),
      loginChannelSecret: trimOptional(this.#values.loginChannelSecret),
      liffId: trimOptional(this.#values.liffId),
    };
  }

  #updateInput(): UpdateLineAccountInput {
    const account = this.account;
    if (account === undefined) return {};

    const input: {
      name?: string;
      channelId?: string;
      channelAccessToken?: string;
      channelSecret?: string;
      loginChannelId?: string | null;
      loginChannelSecret?: string | null;
      liffId?: string | null;
    } = {};
    const name = this.#values.name.trim();
    const channelId = this.#values.channelId.trim();
    const channelAccessToken = trimOptional(this.#values.channelAccessToken);
    const channelSecret = trimOptional(this.#values.channelSecret);
    const loginChannelId = trimOptional(this.#values.loginChannelId);
    const loginChannelSecret = trimOptional(this.#values.loginChannelSecret);
    const liffId = trimOptional(this.#values.liffId);

    if (name !== account.name) input.name = name;
    if (channelId !== account.channelId) input.channelId = channelId;

    if (
      channelAccessToken !== null &&
      channelAccessToken !== this.#initialFormValues?.channelAccessToken
    ) {
      input.channelAccessToken = channelAccessToken;
    }
    if (channelSecret !== null && channelSecret !== this.#initialFormValues?.channelSecret) {
      input.channelSecret = channelSecret;
    }

    if (loginChannelId !== account.loginChannelId) {
      input.loginChannelId = loginChannelId;
      if (loginChannelId === null) input.loginChannelSecret = null;
      else if (
        loginChannelSecret !== null &&
        loginChannelSecret !== this.#initialFormValues?.loginChannelSecret
      ) {
        input.loginChannelSecret = loginChannelSecret;
      }
    } else if (
      loginChannelSecret !== null &&
      loginChannelSecret !== this.#initialFormValues?.loginChannelSecret
    ) {
      input.loginChannelSecret = loginChannelSecret;
    }

    if (liffId !== account.liffId) input.liffId = liffId;
    return input;
  }
}
