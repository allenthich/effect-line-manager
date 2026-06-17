import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountForm,
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type LineAccountFormSubmitDetail,
  type ProviderView,
  type ChannelView,
} from "../../src/web/index.ts";

const mockProvider: ProviderView = {
  id: "provider-1",
  name: "LINE Marketing",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockChannel: ChannelView = {
  id: "channel-1",
  providerId: "provider-1",
  channelType: "messaging",
  name: "Support Channel",
  displayName: null,
  channelId: "1234567890",
  botUserId: null,
  basicId: null,
  pictureUrl: null,
  isActive: true,
  hasChannelSecret: true,
  hasChannelAccessToken: true,
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
  type: "provider" | "channel" | "liff",
  mode: "create" | "edit",
  item?: any,
  providers: ProviderView[] = [],
  channels: ChannelView[] = [],
) => {
  const element = document.createElement("line-account-form") as LineAccountForm;
  element.type = type;
  element.mode = mode;
  element.item = item;
  element.providers = providers;
  element.channels = channels;
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

describe("Channel form", () => {
  test("requires Messaging API fields and submits correctly", async () => {
    const element = await makeForm("channel", "create", undefined, [mockProvider]);
    setSelectValue(element, "channelProviderId", "provider-1");
    setValue(element, "channelName", "Support Bot");
    setValue(element, "channelId", "987654");
    setValue(element, "channelSecret", "my-secret");
    setValue(element, "channelAccessToken", "my-token");

    expect(submit(element)).toEqual({
      type: "channel",
      mode: "create",
      input: {
        channelType: "messaging",
        providerId: "provider-1",
        name: "Support Bot",
        channelId: "987654",
        channelSecret: "my-secret",
        channelAccessToken: "my-token",
      },
    });
  });

  test("submits Channel edit correctly", async () => {
    const element = await makeForm("channel", "edit", mockChannel, [mockProvider]);
    setValue(element, "channelName", "New Support Bot");
    expect(submit(element)).toEqual({
      type: "channel",
      mode: "edit",
      input: {
        name: "New Support Bot",
      },
    });
  });
});
