import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountCard,
  LineAccountDetailPanel,
  LineAccountDialog,
  LineAccountList,
  LineAccountToolbar,
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type LineMessagingChannelView,
  type LiffAppView,
} from "../../src/web/index.ts";

const mockMessagingChannel: LineMessagingChannelView = {
  id: "channel-1",
  providerId: "provider-1",
  channelType: "messaging",
  name: "Support Bot",
  botDisplayName: "LINE Support",
  channelId: "1234567890",
  botUserId: null,
  botBasicId: null,
  botPictureUrl: null,
  addFriendUrl: null,
  addFriendQrCodeUrl: null,
  isActive: true,
  channelSecret: "channel-secret",
  channelAccessToken: "channel-token",
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
};

const mockLiffApp: LiffAppView = {
  id: "liff-1",
  loginChannelId: "login-channel-1" as LiffAppView["loginChannelId"],
  liffId: "2001043291-AbCdEf12",
  view: { type: "tall", url: "https://example.com/liff" },
  additionalUrlParameters: "campaign=spring&source=poster",
  description: "Loyalty card",
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
    element.type = "messagingChannel";
    element.item = mockMessagingChannel;
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
    element.type = "messagingChannel";
    element.item = { ...mockMessagingChannel, botDisplayName: null };
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("Support Bot");
    expect(element.shadowRoot?.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe("S");
  });

  test("emits composed account request events and disables every action", async () => {
    const element = document.createElement("line-account-card") as LineAccountCard;
    element.type = "messagingChannel";
    element.item = mockMessagingChannel;
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
    expect(events.every((event) => event.detail.item === mockMessagingChannel)).toBe(true);

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
    element.type = "messagingChannel";
    element.items = [mockMessagingChannel];
    element.messages = defaultLineAccountManagementMessages;
    document.body.append(element);
    await element.updateComplete;

    const card = element.shadowRoot?.querySelector("line-account-card") as LineAccountCard;
    expect(card.item).toBe(mockMessagingChannel);

    let received: CustomEvent | undefined;
    element.addEventListener("line-account-edit-request", (event) => {
      received = event as CustomEvent;
    });
    await card.updateComplete;
    card.shadowRoot?.querySelector<HTMLButtonElement>('[part="edit-button"]')?.click();

    expect(received?.detail.item).toBe(mockMessagingChannel);
    expect(received?.composed).toBe(true);
  });
});

describe("line-account-toolbar", () => {
  test("gives the search field a stable form-control name", async () => {
    const element = document.createElement("line-account-toolbar") as LineAccountToolbar;
    document.body.append(element);
    await element.updateComplete;

    const search = element.shadowRoot?.querySelector<HTMLInputElement>('[aria-label="Search"]');
    expect(search?.id).toBe("line-account-search");
    expect(search?.name).toBe("search");
  });
});

describe("line-account-detail-panel LIFF launch URL", () => {
  test("distinguishes the endpoint URL from the generated LIFF URL", async () => {
    const element = document.createElement("line-account-detail-panel") as LineAccountDetailPanel;
    element.item = mockLiffApp;
    element.currentTab = "liff";
    document.body.append(element);
    await element.updateComplete;

    const text = element.shadowRoot?.textContent ?? "";
    expect(text).toContain("Endpoint URL");
    expect(text).toContain("https://example.com/liff");
    expect(text).toContain("LIFF URL");
    expect(text).toContain(
      "https://liff.line.me/2001043291-AbCdEf12?campaign=spring&source=poster",
    );
  });

  test("displays the persisted LIFF launch URL and opens QR code dialog", async () => {
    const element = document.createElement("line-account-detail-panel") as LineAccountDetailPanel;
    element.item = mockLiffApp;
    element.currentTab = "liff";
    document.body.append(element);
    await element.updateComplete;

    const parameters = element.shadowRoot?.querySelector<HTMLInputElement>(
      '[name="liffUrlParameters"]',
    );
    expect(parameters).toBeNull();

    const expectedUrl = "https://liff.line.me/2001043291-AbCdEf12?campaign=spring&source=poster";
    expect(element.shadowRoot?.textContent).toContain(expectedUrl);

    const openQrCode = [...(element.shadowRoot?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent?.trim() === "Show QR code",
    );
    expect(openQrCode).toBeDefined();
    openQrCode!.click();
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;

    const qrDialog = element.shadowRoot?.querySelector("line-account-dialog") as LineAccountDialog;
    await qrDialog.updateComplete;
    const qrCode = qrDialog.querySelector<HTMLImageElement>("[data-liff-url]");
    expect(qrDialog.open).toBe(true);
    expect(qrCode?.dataset.liffUrl).toBe(expectedUrl);
    expect(qrCode?.src).toMatch(/^data:image\/svg\+xml/);
    expect(qrDialog.textContent).toContain(expectedUrl);
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

  test("emits close request on true backdrop click (both mousedown and click on dialog itself)", async () => {
    const element = document.createElement("line-account-dialog") as LineAccountDialog;
    element.heading = "Add LINE account";
    element.open = true;
    document.body.append(element);
    await element.updateComplete;

    const dialog = element.shadowRoot!.querySelector("dialog")!;
    let closeRequestCalled = false;
    element.addEventListener("line-account-dialog-close-request", () => {
      closeRequestCalled = true;
    });

    dialog.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(closeRequestCalled).toBe(true);
  });

  test("does not emit close request when mousedown is inside content but click ends on backdrop", async () => {
    const element = document.createElement("line-account-dialog") as LineAccountDialog;
    element.heading = "Add LINE account";
    element.open = true;
    document.body.append(element);
    await element.updateComplete;

    const dialog = element.shadowRoot!.querySelector("dialog")!;
    const heading = element.shadowRoot!.querySelector("h2")!;
    let closeRequestCalled = false;
    element.addEventListener("line-account-dialog-close-request", () => {
      closeRequestCalled = true;
    });

    heading.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(closeRequestCalled).toBe(false);
  });

  test("does not emit close request when clicking inside dialog content", async () => {
    const element = document.createElement("line-account-dialog") as LineAccountDialog;
    element.heading = "Add LINE account";
    element.open = true;
    document.body.append(element);
    await element.updateComplete;

    const heading = element.shadowRoot!.querySelector("h2")!;
    let closeRequestCalled = false;
    element.addEventListener("line-account-dialog-close-request", () => {
      closeRequestCalled = true;
    });

    heading.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    heading.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(closeRequestCalled).toBe(false);
  });
});
