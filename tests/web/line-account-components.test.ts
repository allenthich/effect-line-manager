import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountCard,
  LineAccountDialog,
  LineAccountList,
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type ChannelView,
} from "../../src/web/index.ts";

const mockChannel: ChannelView = {
  id: "channel-1",
  providerId: "provider-1",
  channelType: "messaging",
  name: "Support Bot",
  displayName: "LINE Support",
  channelId: "1234567890",
  botUserId: null,
  basicId: null,
  pictureUrl: null,
  isActive: true,
  channelSecret: "channel-secret",
  channelAccessToken: "channel-token",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
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
    element.type = "channel";
    element.item = mockChannel;
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("LINE Support");
    expect(
      element.shadowRoot?.querySelector('[part="status-button"]')?.getAttribute("aria-checked"),
    ).toBe("true");
    expect(element.shadowRoot?.querySelector('[part="card"]')).not.toBeNull();
  });

  test("falls back to the account name and generated initial", async () => {
    const element = document.createElement("line-account-card") as LineAccountCard;
    element.type = "channel";
    element.item = { ...mockChannel, displayName: null };
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("Support Bot");
    expect(element.shadowRoot?.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe("S");
  });

  test("emits composed account request events and disables every action", async () => {
    const element = document.createElement("line-account-card") as LineAccountCard;
    element.type = "channel";
    element.item = mockChannel;
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
    expect(events.every((event) => event.detail.item === mockChannel)).toBe(true);

    element.disabled = true;
    await element.updateComplete;
    expect(
      [...(element.shadowRoot?.querySelectorAll("button") ?? [])].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
  });
});

describe("line-account-list", () => {
  test("renders an accessible empty state", async () => {
    const element = document.createElement("line-account-list") as LineAccountList;
    element.type = "provider";
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("No LINE Providers found");
    expect(element.shadowRoot?.querySelector('[part="list"]')).not.toBeNull();
  });

  test("renders cards and forwards their request events", async () => {
    const element = document.createElement("line-account-list") as LineAccountList;
    element.type = "channel";
    element.items = [mockChannel];
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    const card = element.shadowRoot?.querySelector("line-account-card") as LineAccountCard;
    expect(card.item).toBe(mockChannel);

    let received: CustomEvent | undefined;
    element.addEventListener("line-account-edit-request", (event) => {
      received = event as CustomEvent;
    });
    await card.updateComplete;
    card.shadowRoot?.querySelector<HTMLButtonElement>('[part="edit-button"]')?.click();

    expect(received?.detail.item).toBe(mockChannel);
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
});
