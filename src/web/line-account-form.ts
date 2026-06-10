import { LitElement, css, html, nothing } from "lit";
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
      padding: 0;
      border: 0;
    }

    legend {
      margin-bottom: var(--line-account-space-3, 0.75rem);
      font-weight: 700;
    }

    .field {
      gap: var(--line-account-space-2, 0.5rem);
    }

    label {
      font-weight: 600;
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
    }

    input:read-only {
      background: var(--line-account-muted-background, #eef2f5);
      color: var(--line-account-muted-color, #52606d);
    }

    input:focus-visible,
    button:focus-visible {
      outline: 3px solid var(--line-account-focus-color, #74d7a1);
      outline-offset: 2px;
    }

    [aria-invalid="true"] {
      border-color: var(--line-account-danger-color, #c62828);
    }

    .hint {
      color: var(--line-account-muted-color, #52606d);
      font-size: 0.875rem;
    }

    .error {
      margin: 0;
      padding: var(--line-account-space-3, 0.75rem);
      border-radius: var(--line-account-radius, 0.75rem);
      background: var(--line-account-danger-background, #fff0f0);
      color: var(--line-account-danger-color, #a61b1b);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
    }

    button {
      min-height: 2.75rem;
      padding: 0.625rem 1rem;
      border: 1px solid var(--line-account-primary-color, #06c755);
      border-radius: var(--line-account-button-radius, 0.5rem);
      background: var(--line-account-primary-color, #06c755);
      color: var(--line-account-primary-contrast, #fff);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `;

  declare mode: LineAccountFormMode;
  declare account: LineAccountView | undefined;
  declare messages: LineAccountManagementMessages;
  declare submitting: boolean;
  declare error: string | undefined;

  #values: FormValues;
  #invalidFields = new Set<keyof FormValues>();
  #validationError: string | undefined;

  constructor() {
    super();
    this.mode = "create";
    this.account = undefined;
    this.messages = defaultLineAccountManagementMessages;
    this.submitting = false;
    this.error = undefined;
    this.#values = this.#initialValues();
  }

  reset(): void {
    this.#values = this.#initialValues();
    this.#invalidFields = new Set();
    this.#validationError = undefined;
    this.requestUpdate();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("mode") || changedProperties.has("account")) {
      this.#values = this.#initialValues();
      this.#invalidFields = new Set();
      this.#validationError = undefined;
    }
  }

  protected render() {
    const visibleError = this.error ?? this.#validationError;
    const editing = this.mode === "edit";

    return html`
      <form
        part="form"
        aria-describedby=${visibleError ? "form-error" : nothing}
        @submit=${this.#handleSubmit}
      >
        ${visibleError
          ? html`<p class="error" id="form-error" role="alert">${visibleError}</p>`
          : nothing}
        <fieldset>
          <legend>${this.messages.messagingApiGroup}</legend>
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
            !editing,
            this.messages.channelIdHint,
            editing,
          )}
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
          ${this.#renderField("loginChannelId", this.messages.loginChannelIdLabel, "text", false)}
          ${this.#renderField(
            "loginChannelSecret",
            this.messages.loginChannelSecretLabel,
            "password",
            false,
            editing ? this.messages.loginChannelSecretEditHint : undefined,
          )}
        </fieldset>
        <fieldset>
          <legend>${this.messages.liffGroup}</legend>
          ${this.#renderField("liffId", this.messages.liffIdLabel, "text", false)}
        </fieldset>
        <div class="actions">
          <button part="submit-button" type="submit" ?disabled=${this.submitting}>
            ${this.submitting
              ? editing
                ? this.messages.savingAccount
                : this.messages.creatingAccount
              : editing
                ? this.messages.saveChanges
                : this.messages.createAccount}
          </button>
        </div>
      </form>
    `;
  }

  #renderField(
    name: keyof FormValues,
    label: string,
    type: "text" | "password",
    required: boolean,
    hint?: string,
    readOnly = false,
  ) {
    const hintId = hint === undefined ? nothing : `${name}-hint`;
    return html`
      <div class="field" part="field">
        <label for=${name}>${label}</label>
        <input
          id=${name}
          name=${name}
          type=${type}
          .value=${this.#values[name]}
          ?required=${required}
          ?readonly=${readOnly}
          ?disabled=${this.submitting}
          aria-describedby=${hintId}
          aria-invalid=${this.#invalidFields.has(name) ? "true" : "false"}
          autocomplete="off"
          @input=${this.#handleInput}
        />
        ${hint === undefined ? nothing : html`<span class="hint" id=${hintId}>${hint}</span>`}
      </div>
    `;
  }

  #initialValues(): FormValues {
    const account = this.account;
    return {
      name: account?.name ?? "",
      channelId: account?.channelId ?? "",
      channelAccessToken: "",
      channelSecret: "",
      loginChannelId: account?.loginChannelId ?? "",
      loginChannelSecret: "",
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
        : ["name"];
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
      channelAccessToken?: string;
      channelSecret?: string;
      loginChannelId?: string | null;
      loginChannelSecret?: string | null;
      liffId?: string | null;
    } = {};
    const name = this.#values.name.trim();
    const channelAccessToken = trimOptional(this.#values.channelAccessToken);
    const channelSecret = trimOptional(this.#values.channelSecret);
    const loginChannelId = trimOptional(this.#values.loginChannelId);
    const loginChannelSecret = trimOptional(this.#values.loginChannelSecret);
    const liffId = trimOptional(this.#values.liffId);

    if (name !== account.name) input.name = name;
    if (channelAccessToken !== null) input.channelAccessToken = channelAccessToken;
    if (channelSecret !== null) input.channelSecret = channelSecret;

    if (loginChannelId !== account.loginChannelId) {
      input.loginChannelId = loginChannelId;
      if (loginChannelId === null) input.loginChannelSecret = null;
      else if (loginChannelSecret !== null) input.loginChannelSecret = loginChannelSecret;
    } else if (loginChannelSecret !== null) {
      input.loginChannelSecret = loginChannelSecret;
    }

    if (liffId !== account.liffId) input.liffId = liffId;
    return input;
  }
}
