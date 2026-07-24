import { defineLineAccountManagementElements, type LineAccountFormType } from "../src/web/index.ts";
import {
  defineLineDevelopersConsoleElements,
  type LineDevelopersConsole,
} from "../src/web/developers-console/index.ts";
import { createInMemoryLineAccountAdapter } from "./in-memory-line-account-adapter.ts";
import { createLineAccountDemoData } from "./line-account-demo-data.ts";

defineLineAccountManagementElements();
defineLineDevelopersConsoleElements();

const element = document.querySelector<LineDevelopersConsole>("#developers-console");
const status = document.querySelector<HTMLElement>("#demo-status");

if (element === null) {
  throw new Error("Missing the developers-console tree demo element");
}

const demoData = createLineAccountDemoData();
element.adapter = createInMemoryLineAccountAdapter(
  demoData.providers,
  demoData.messagingChannels,
  demoData.loginChannels,
  demoData.liffApps,
);
element.variant = "tree";
void element.refresh();

let statusTimeout: number | undefined;

const announce = (message: string): void => {
  if (status === null) return;
  status.textContent = message;
  if (statusTimeout !== undefined) window.clearTimeout(statusTimeout);
  statusTimeout = window.setTimeout(() => {
    status.textContent = "";
    statusTimeout = undefined;
  }, 5000);
};

const displayName = (item: unknown, type: LineAccountFormType): string => {
  if (type === "liff" && typeof item === "object" && item !== null && "liffId" in item) {
    return String(item.liffId);
  }
  if (typeof item === "object" && item !== null && "name" in item) {
    return String(item.name);
  }
  return type;
};

element.addEventListener("line-account-created", (event) => {
  const { item, type } = (
    event as CustomEvent<{ readonly item: unknown; readonly type: LineAccountFormType }>
  ).detail;
  announce(`Created ${displayName(item, type)}.`);
});
element.addEventListener("line-account-updated", (event) => {
  const { item, type } = (
    event as CustomEvent<{ readonly item: unknown; readonly type: LineAccountFormType }>
  ).detail;
  announce(`Saved changes to ${displayName(item, type)}.`);
});
element.addEventListener("line-account-deleted", (event) => {
  const { id } = (event as CustomEvent<{ readonly id: string }>).detail;
  announce(`Deleted ${id}.`);
});
element.addEventListener("line-account-error", (event) => {
  const { operation } = (event as CustomEvent<{ readonly operation: string }>).detail;
  announce(`The demo ${operation} operation failed.`);
});
element.addEventListener("line-developers-console-error", (event) => {
  console.error("developers-console error", (event as CustomEvent).detail);
});
element.addEventListener("line-developers-console-copy", (event) => {
  console.info("copied console value", (event as CustomEvent).detail);
});
