import { afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test";

const qrCodeMock = vi.hoisted(() => ({
  generate: vi.fn<(value: string) => Promise<string>>(),
}));

vi.mock("../../src/web/qr-code.ts", () => ({
  generateQrCodeDataUrl: qrCodeMock.generate,
}));

import {
  LineDevelopersConsole,
  createInMemoryConsoleAdapter,
  defineLineDevelopersConsole,
  type ConsoleChannelView,
  type ConsoleLiffAppView,
  type ConsoleProviderView,
} from "../../src/web/developers-console/index.ts";

const providers: readonly ConsoleProviderView[] = [{ providerId: "provider-1", name: "Acme" }];
const channels: readonly ConsoleChannelView[] = [
  {
    providerId: "provider-1",
    channelId: "login-1",
    type: "login",
    name: "Auth",
  },
];
const liffApps: readonly ConsoleLiffAppView[] = [
  {
    channelId: "login-1",
    liffId: "login-1-first",
    view: { type: "tall", url: "https://example.com/first" },
  },
  {
    channelId: "login-1",
    liffId: "login-1-second",
    view: { type: "tall", url: "https://example.com/second" },
  },
];

const settle = async (element: LineDevelopersConsole): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
};

beforeAll(() => {
  defineLineDevelopersConsole();
});

afterEach(() => {
  document.body.replaceChildren();
  qrCodeMock.generate.mockReset();
});

describe("line-developers-console QR request ordering", () => {
  test("keeps the newest QR result when an older request fails later", async () => {
    const pending = new Map<
      string,
      { resolve: (value: string) => void; reject: (reason: unknown) => void }
    >();
    qrCodeMock.generate.mockImplementation(
      (value) =>
        new Promise((resolve, reject) => {
          pending.set(value, { resolve, reject });
        }),
    );

    const element = document.createElement("line-developers-console") as LineDevelopersConsole;
    element.adapter = createInMemoryConsoleAdapter({ providers, channels, liffApps });
    document.body.append(element);
    await settle(element);
    element.shadowRoot?.querySelector<HTMLButtonElement>(".node-header")?.click();
    await settle(element);
    element.shadowRoot?.querySelector<HTMLButtonElement>(".channel-header-toggle")?.click();
    await settle(element);

    const buttons = element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".qr-show-btn") ?? [];
    buttons[0]?.click();
    buttons[1]?.click();

    const firstUrl = "https://liff.line.me/login-1-first";
    const secondUrl = "https://liff.line.me/login-1-second";
    pending.get(secondUrl)?.resolve("data:image/svg+xml,second");
    await settle(element);
    pending.get(firstUrl)?.reject(new Error("late failure"));
    await settle(element);

    const image = element.shadowRoot?.querySelector<HTMLImageElement>(".qr-code");
    expect(image?.dataset.liffUrl).toBe(secondUrl);
    expect(image?.getAttribute("src")).toBe("data:image/svg+xml,second");
    expect(element.shadowRoot?.textContent).not.toContain("QR code could not be generated.");
  });
});
