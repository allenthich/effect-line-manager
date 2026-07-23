import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountForm,
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type LineAccountFormSubmitDetail,
  type LiffAppView,
  type LineLoginChannelView,
  type ProviderView,
  type LineMessagingChannelView,
} from "../../src/web/index.ts";

const mockProvider: ProviderView = {
  id: "provider-1",
  name: "LINE Marketing",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMessagingChannel: LineMessagingChannelView = {
  id: "channel-1",
  providerId: "provider-1",
  channelType: "messaging",
  name: "Support Channel",
  botDisplayName: null,
  channelId: "1234567890",
  botUserId: null,
  botBasicId: null,
  botPictureUrl: null,
  addFriendUrl: null,
  addFriendQrCodeUrl: null,
  isActive: true,
  channelSecret: "channel-secret",
  channelAccessToken: "channel-token",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLoginChannel: LineLoginChannelView = {
  id: "login-record-1",
  providerId: "provider-1",
  channelType: "login",
  name: "Login Channel",
  channelId: "2001043291",
  channelSecret: "login-secret",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLiffApp: LiffAppView = {
  id: "liff-record-1",
  loginChannelId: mockLoginChannel.channelId as LiffAppView["loginChannelId"],
  liffId: "2001043291-AbCdEf12",
  view: { type: "tall", url: "https://example.com/liff" },
  additionalUrlParameters: "campaign=spring&source=poster",
  description: "Campaign LIFF",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeAll(() => {
  defineLineAccountManagementElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

const makeForm = async (
  type: "provider" | "messagingChannel" | "loginChannel" | "liff",
  mode: "create" | "edit",
  item?: any,
  providers: ProviderView[] = [],
  loginChannels: LineLoginChannelView[] = [],
) => {
  const element = document.createElement("line-account-form") as LineAccountForm;
  element.type = type;
  element.mode = mode;
  element.item = item;
  element.providers = providers;
  element.loginChannels = loginChannels;
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

const select = (element: LineAccountForm, name: string): HTMLSelectElement => {
  const result = element.shadowRoot?.querySelector<HTMLSelectElement>(`[name="${name}"]`);
  if (result === null || result === undefined) throw new Error(`Missing select ${name}`);
  return result;
};

const setValue = (element: LineAccountForm, name: string, value: string): void => {
  const target = input(element, name);
  target.value = value;
  target.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
};

const setSelectValue = (element: LineAccountForm, name: string, value: string): void => {
  const target = select(element, name);
  target.value = value;
  target.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
};

const submit = (element: LineAccountForm): LineAccountFormSubmitDetail | undefined => {
  let detail: LineAccountFormSubmitDetail | undefined;
  element.addEventListener(
    "line-account-form-submit",
    (event) => {
      detail = (event as CustomEvent<LineAccountFormSubmitDetail>).detail;
    },
    { once: true },
  );
  element.shadowRoot
    ?.querySelector("form")
    ?.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  return detail;
};

describe("Provider form", () => {
  test("renders with default messages when used as a standalone custom element", async () => {
    const element = document.createElement("line-account-form") as LineAccountForm;
    document.body.append(element);

    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain(
      defaultLineAccountManagementMessages.createProviderHeading,
    );
  });

  test("submits provider create correctly", async () => {
    const element = await makeForm("provider", "create");
    setValue(element, "providerName", "My Provider");
    expect(submit(element)).toEqual({
      type: "provider",
      mode: "create",
      input: { name: "My Provider" },
    });
  });

  test("submits provider edit correctly", async () => {
    const element = await makeForm("provider", "edit", mockProvider);
    setValue(element, "providerName", "Updated Provider");
    expect(submit(element)).toEqual({
      type: "provider",
      mode: "edit",
      input: { name: "Updated Provider" },
    });
  });
});

describe("Messaging Channel form", () => {
  test("requires Messaging API fields and submits correctly", async () => {
    const element = await makeForm("messagingChannel", "create", undefined, [mockProvider]);
    setSelectValue(element, "channelProviderId", "provider-1");
    setValue(element, "channelName", "Support Bot");
    setValue(element, "channelId", "987654");
    setValue(element, "channelSecret", "my-secret");
    setValue(element, "channelAccessToken", "my-token");

    expect(submit(element)).toEqual({
      type: "messagingChannel",
      mode: "create",
      input: {
        providerId: "provider-1",
        name: "Support Bot",
        channelId: "987654",
        channelSecret: "my-secret",
        channelAccessToken: "my-token",
        botDisplayName: null,
        botUserId: null,
        botBasicId: null,
        botPictureUrl: null,
        addFriendUrl: null,
        addFriendQrCodeUrl: null,
      },
    });
  });

  test("submits Messaging Channel edit correctly", async () => {
    const element = await makeForm("messagingChannel", "edit", mockMessagingChannel, [
      mockProvider,
    ]);
    setValue(element, "channelName", "New Support Bot");
    expect(submit(element)).toEqual({
      type: "messagingChannel",
      mode: "edit",
      input: {
        name: "New Support Bot",
      },
    });
  });
});

describe("LIFF form", () => {
  test("labels the configured application URL as the endpoint URL", async () => {
    const element = await makeForm("liff", "create");
    const label = element.shadowRoot?.querySelector('label[for="liffViewUrl"]');

    expect(label?.textContent?.trim()).toBe("Endpoint URL*");
  });

  test("renders additional URL parameters input, updates launch URL preview, and opens QR code dialog", async () => {
    const element = await makeForm("liff", "create");
    setValue(element, "liffId", "2001043291-AbCdEf12");
    await element.updateComplete;

    const link = element.shadowRoot?.querySelector<HTMLAnchorElement>(".liff-url-link");
    expect(link?.href).toBe("https://liff.line.me/2001043291-AbCdEf12");
    expect(link?.textContent).toBe("https://liff.line.me/2001043291-AbCdEf12");

    setValue(element, "liffUrlParameters", "param=1&foo=bar");
    await element.updateComplete;

    expect(link?.href).toBe("https://liff.line.me/2001043291-AbCdEf12?param=1&foo=bar");
    expect(link?.textContent).toBe("https://liff.line.me/2001043291-AbCdEf12?param=1&foo=bar");

    const qrBtn = [
      ...(element.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ].find((b) => b.textContent?.includes("Show QR code"));
    expect(qrBtn).toBeDefined();
    qrBtn!.click();
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));
    await element.updateComplete;

    const img = element.shadowRoot?.querySelector<HTMLImageElement>(".qr-code");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("data-liff-url")).toBe(
      "https://liff.line.me/2001043291-AbCdEf12?param=1&foo=bar",
    );
  });

  test("submits canonical additional URL parameters when creating a LIFF app", async () => {
    const element = await makeForm("liff", "create", undefined, [], [mockLoginChannel]);
    setValue(element, "liffId", "2001043291-AbCdEf12");
    setValue(element, "liffViewUrl", "https://example.com/liff");
    setValue(element, "liffUrlParameters", "  ?campaign=spring&source=poster  ");

    expect(submit(element)).toEqual({
      type: "liff",
      mode: "create",
      input: {
        loginChannelId: mockLoginChannel.channelId,
        liffId: "2001043291-AbCdEf12",
        view: { type: "tall", url: "https://example.com/liff" },
        additionalUrlParameters: "campaign=spring&source=poster",
        description: undefined,
      },
    });
  });

  test("restores saved parameters when editing and submits an empty string when cleared", async () => {
    const element = await makeForm("liff", "edit", mockLiffApp, [], [mockLoginChannel]);

    expect(input(element, "liffUrlParameters").value).toBe("campaign=spring&source=poster");
    expect(element.shadowRoot?.querySelector<HTMLAnchorElement>(".liff-url-link")?.href).toBe(
      "https://liff.line.me/2001043291-AbCdEf12?campaign=spring&source=poster",
    );

    setValue(element, "liffUrlParameters", "");

    expect(submit(element)).toEqual({
      type: "liff",
      mode: "edit",
      input: { additionalUrlParameters: "" },
    });
  });
});
