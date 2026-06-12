import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountForm,
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type LineAccountFormSubmitDetail,
  type LineAccountView,
} from "../../src/web/index.ts";

const account: LineAccountView = {
  id: "account-1",
  name: "Store account",
  channelId: "1234567890",
  botUserId: null,
  basicId: null,
  displayName: null,
  pictureUrl: null,
  isActive: true,
  loginChannelId: "login-old",
  liffId: "liff-old",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
  hasChannelAccessToken: true,
  hasChannelSecret: true,
  hasLoginChannelSecret: true,
};

beforeAll(() => {
  defineLineAccountManagementElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

const makeForm = async (mode: "create" | "edit", value?: LineAccountView) => {
  const element = document.createElement("line-account-form") as LineAccountForm;
  element.mode = mode;
  element.account = value;
  element.messages = defaultLineAccountManagementMessages;
  document.body.append(element);
  await element.updateComplete;
  return element;
};

const input = (element: LineAccountForm, name: string): HTMLInputElement => {
  const result = element.shadowRoot?.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (result === null || result === undefined) throw new Error(`Missing input ${name}`);
  return result;
};

const setValue = (element: LineAccountForm, name: string, value: string): void => {
  const target = input(element, name);
  target.value = value;
  target.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
};

const submit = (element: LineAccountForm): LineAccountFormSubmitDetail | undefined => {
  let detail: LineAccountFormSubmitDetail | undefined;
  element.addEventListener(
    "line-account-form-submit",
    (event) => {
      detail = (event as CustomEvent<LineAccountFormSubmitDetail>).detail;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    },
    { once: true },
  );
  element.shadowRoot
    ?.querySelector("form")
    ?.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  return detail;
};

describe("create mode", () => {
  test("requires non-whitespace Messaging API fields with visible validation", async () => {
    const element = await makeForm("create");

    expect(element.shadowRoot?.querySelector("form")?.noValidate).toBe(false);
    expect(input(element, "name").required).toBe(true);

    setValue(element, "name", "   ");
    setValue(element, "channelId", "channel");
    setValue(element, "channelAccessToken", "token");
    setValue(element, "channelSecret", "secret");
    expect(submit(element)).toBeUndefined();
    await element.updateComplete;

    const error = element.shadowRoot?.querySelector('[role="alert"]');
    expect(error?.textContent).toContain(defaultLineAccountManagementMessages.whitespaceField);
    expect(error?.id).toBe("form-error");
    expect(element.shadowRoot?.querySelector("form")?.getAttribute("aria-describedby")).toBe(
      "form-error",
    );
    expect(input(element, "name").getAttribute("aria-invalid")).toBe("true");
  });

  test("trims required values and converts optional blanks to null", async () => {
    const element = await makeForm("create");
    setValue(element, "name", "  Store  ");
    setValue(element, "channelId", "  123  ");
    setValue(element, "channelAccessToken", "  token  ");
    setValue(element, "channelSecret", "  secret  ");
    setValue(element, "loginChannelId", "   ");
    setValue(element, "loginChannelSecret", "   ");
    setValue(element, "liffId", "   ");

    expect(submit(element)).toEqual({
      mode: "create",
      input: {
        name: "Store",
        channelId: "123",
        channelAccessToken: "token",
        channelSecret: "secret",
        loginChannelId: null,
        loginChannelSecret: null,
        liffId: null,
      },
    });
  });
});

describe("edit mode", () => {
  test("shows editable channel ID and emits an empty payload when unchanged", async () => {
    const element = await makeForm("edit", account);

    expect(input(element, "channelId").readOnly).toBe(false);
    expect(input(element, "channelId").value).toBe(account.channelId);
    expect(input(element, "channelAccessToken").value).toBe("••••••••••••••••");
    expect(input(element, "channelSecret").value).toBe("••••••••••••••••");
    expect(submit(element)).toEqual({ mode: "edit", input: {} });
  });

  test("includes changed names, channel IDs, and non-empty Messaging API credentials", async () => {
    const element = await makeForm("edit", account);
    setValue(element, "name", " Updated store ");
    setValue(element, "channelId", " 987654321 ");
    setValue(element, "channelAccessToken", " rotated-token ");
    setValue(element, "channelSecret", " rotated-secret ");

    expect(submit(element)).toEqual({
      mode: "edit",
      input: {
        name: "Updated store",
        channelId: "987654321",
        channelAccessToken: "rotated-token",
        channelSecret: "rotated-secret",
      },
    });
  });

  test("pairs Login ID clearing with secret clearing and clears LIFF independently", async () => {
    const element = await makeForm("edit", account);
    setValue(element, "loginChannelId", "  ");
    setValue(element, "loginChannelSecret", "ignored-on-clear");
    setValue(element, "liffId", "  ");

    expect(submit(element)).toEqual({
      mode: "edit",
      input: {
        loginChannelId: null,
        loginChannelSecret: null,
        liffId: null,
      },
    });
  });

  test("sends a Login secret only when entered", async () => {
    const element = await makeForm("edit", account);
    setValue(element, "loginChannelSecret", " new-login-secret ");

    expect(submit(element)).toEqual({
      mode: "edit",
      input: { loginChannelSecret: "new-login-secret" },
    });
  });

  test("resets values when the selected account changes", async () => {
    const element = await makeForm("edit", account);
    setValue(element, "name", "Unsaved value");

    element.account = {
      ...account,
      id: "account-2",
      name: "Second account",
      channelId: "channel-2",
    };
    await element.updateComplete;

    expect(input(element, "name").value).toBe("Second account");
    expect(input(element, "channelId").value).toBe("channel-2");
  });

  test("uses generic password placeholders and excludes unmodified credentials from payload", async () => {
    const accountWithCredentials: LineAccountView = {
      ...account,
      hasChannelAccessToken: true,
      hasChannelSecret: true,
      hasLoginChannelSecret: true,
    };
    const element = await makeForm("edit", accountWithCredentials);

    const accessTokenInput = input(element, "channelAccessToken");
    expect(accessTokenInput.value).toBe("••••••••••••••••");
    expect(accessTokenInput.type).toBe("password");

    // Click the eye toggle to reveal
    const toggleButton = element.shadowRoot?.querySelector<HTMLButtonElement>(
      'button[aria-label="Show password"]',
    );
    expect(toggleButton).not.toBeNull();
    toggleButton?.click();
    await element.updateComplete;

    expect(accessTokenInput.type).toBe("text");

    // Click the eye toggle to hide
    const hideButton = element.shadowRoot?.querySelector<HTMLButtonElement>(
      'button[aria-label="Hide password"]',
    );
    expect(hideButton).not.toBeNull();
    hideButton?.click();
    await element.updateComplete;

    expect(accessTokenInput.type).toBe("password");

    // Submit without changing should emit empty payload
    expect(submit(element)).toEqual({ mode: "edit", input: {} });

    // Change one field
    setValue(element, "channelAccessToken", "new-token");
    expect(submit(element)).toEqual({
      mode: "edit",
      input: { channelAccessToken: "new-token" },
    });
  });

  test("disables submission and shows an external error without clearing values", async () => {
    const element = await makeForm("edit", account);
    let submitted = false;
    element.addEventListener("line-account-form-submit", () => {
      submitted = true;
    });
    setValue(element, "name", "Unsaved value");
    element.submitting = true;
    element.error = "The LINE account could not be updated.";
    await element.updateComplete;

    expect(
      element.shadowRoot?.querySelector<HTMLButtonElement>('button[type="submit"]'),
    ).toBeNull();
    element.submit();
    expect(submitted).toBe(false);
    expect(element.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain(
      "The LINE account could not be updated.",
    );
    expect(input(element, "name").value).toBe("Unsaved value");
  });
});
