import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountCard,
  LineAccountDialog,
  LineAccountList,
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type LineAccountView,
} from "../../src/web/index.ts";

const account: LineAccountView = {
  id: "account-1",
  name: "Internal name",
  displayName: "LINE Store",
  channelId: "1234567890",
  pictureUrl: null,
  basicId: "@line-store",
  isActive: true,
  loginChannelId: "login-1",
  liffId: null,
};

beforeAll(() => {
  defineLineAccountManagementElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("line-account-card", () => {
  test("renders identity and explicit configuration statuses", async () => {
    const element = document.createElement("line-account-card") as LineAccountCard;
    element.account = account;
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("LINE Store");
    expect(element.shadowRoot?.textContent).toContain("@line-store");
    expect(element.shadowRoot?.textContent).toContain("Active");
    expect(element.shadowRoot?.textContent).toContain("LINE Login");
    expect(element.shadowRoot?.textContent).toContain("LIFF");
    expect(element.shadowRoot?.querySelector('[part="card"]')).not.toBeNull();
  });

  test("falls back to the account name and generated initial", async () => {
    const element = document.createElement("line-account-card") as LineAccountCard;
    element.account = { ...account, displayName: null, basicId: null, loginChannelId: null };
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("Internal name");
    expect(element.shadowRoot?.querySelector('[aria-hidden="true"]')?.textContent).toBe("I");
    expect(element.shadowRoot?.textContent).toContain("LINE Login");
  });

  test("emits composed account request events and disables every action", async () => {
    const element = document.createElement("line-account-card") as LineAccountCard;
    element.account = account;
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    const events: CustomEvent[] = [];
    for (const name of [
      "line-account-edit-request",
      "line-account-toggle-request",
      "line-account-delete-request",
    ]) {
      element.addEventListener(name, (event) => events.push(event as CustomEvent));
    }

    element.shadowRoot?.querySelector<HTMLButtonElement>('[part="edit-button"]')?.click();
    element.shadowRoot?.querySelector<HTMLButtonElement>('[part="status-button"]')?.click();
    element.shadowRoot?.querySelector<HTMLButtonElement>('[part="delete-button"]')?.click();

    expect(events).toHaveLength(3);
    expect(events.every((event) => event.bubbles && event.composed)).toBe(true);
    expect(events.every((event) => event.detail.account === account)).toBe(true);

    element.disabled = true;
    await element.updateComplete;
    expect(
      [...(element.shadowRoot?.querySelectorAll("button") ?? [])].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
  });

  test("renders an action error inside the affected card", async () => {
    const element = document.createElement("line-account-card") as LineAccountCard;
    element.account = account;
    element.messages = defaultLineAccountManagementMessages;
    element.error = "The LINE account status could not be updated.";
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain(
      "The LINE account status could not be updated.",
    );
  });
});

describe("line-account-list", () => {
  test("renders an accessible empty state", async () => {
    const element = document.createElement("line-account-list") as LineAccountList;
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("No LINE accounts");
    expect(element.shadowRoot?.querySelector('[part="list"]')).not.toBeNull();
  });

  test("renders cards and forwards their request events", async () => {
    const element = document.createElement("line-account-list") as LineAccountList;
    element.accounts = [account];
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    const card = element.shadowRoot?.querySelector("line-account-card") as LineAccountCard;
    expect(card.account).toBe(account);

    let received: CustomEvent | undefined;
    element.addEventListener("line-account-edit-request", (event) => {
      received = event as CustomEvent;
    });
    await card.updateComplete;
    card.shadowRoot?.querySelector<HTMLButtonElement>('[part="edit-button"]')?.click();

    expect(received?.detail.account).toBe(account);
    expect(received?.composed).toBe(true);
  });
});

describe("line-account-dialog", () => {
  test("uses a labelled native dialog and emits a close request on cancel", async () => {
    const element = document.createElement("line-account-dialog") as LineAccountDialog;
    element.heading = "Add LINE account";
    element.open = true;
    document.body.append(element);
    await element.updateComplete;

    const dialog = element.shadowRoot?.querySelector("dialog");
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute("aria-labelledby")).toBe("dialog-heading");
    expect(element.shadowRoot?.textContent).toContain("Add LINE account");
    expect(element.shadowRoot?.querySelector('[part="dialog"]')).toBe(dialog);
    expect(element.shadowRoot?.querySelector('[part="dialog-actions"]')).not.toBeNull();

    let closeRequest: CustomEvent | undefined;
    element.addEventListener("line-account-dialog-close-request", (event) => {
      closeRequest = event as CustomEvent;
    });
    dialog?.dispatchEvent(new Event("cancel", { cancelable: true }));

    expect(closeRequest?.bubbles).toBe(true);
    expect(closeRequest?.composed).toBe(true);
    expect(element.open).toBe(true);
  });

  test("requests close from the backdrop and restores focus when the parent closes it", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open";
    document.body.append(opener);
    opener.focus();

    const element = document.createElement("line-account-dialog") as LineAccountDialog;
    element.heading = "Confirm delete";
    document.body.append(element);
    element.open = true;
    await element.updateComplete;

    let requests = 0;
    element.addEventListener("line-account-dialog-close-request", () => requests++);
    const dialog = element.shadowRoot?.querySelector("dialog");
    dialog?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(requests).toBe(1);

    element.open = false;
    await element.updateComplete;
    expect(document.activeElement).toBe(opener);
  });
});
