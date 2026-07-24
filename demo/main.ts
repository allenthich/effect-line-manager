import { createInMemoryLineAccountAdapter } from "./in-memory-line-account-adapter.ts";
import {
  defineLineAccountManagementElements,
  type LineAccountManagement,
} from "../src/web/index.ts";
import { createLineAccountDemoData } from "./line-account-demo-data.ts";

defineLineAccountManagementElements();

const page = document.querySelector<LineAccountManagement>("#line-accounts");
const status = document.querySelector<HTMLElement>("#demo-status");

if (page === null) throw new Error("Missing line-account-management demo element");

const demoData = createLineAccountDemoData();
page.adapter = createInMemoryLineAccountAdapter(
  demoData.providers,
  demoData.messagingChannels,
  demoData.loginChannels,
  demoData.liffApps,
);

const announce = (message: string): void => {
  if (status !== null) status.textContent = message;
};

const displayName = (item: any, type: string): string => {
  if (type === "provider" || type === "messagingChannel" || type === "loginChannel") {
    return item.name as string;
  }
  return item.liffId as string;
};

page.addEventListener("line-account-created", (event) => {
  const { item, type } = (event as CustomEvent<{ item: any; type: string }>).detail;
  announce(`Created ${type}: ${displayName(item, type)}.`);
});

page.addEventListener("line-account-updated", (event) => {
  const { item, type } = (event as CustomEvent<{ item: any; type: string }>).detail;
  announce(`Updated ${type}: ${displayName(item, type)}.`);
});

page.addEventListener("line-account-deleted", (event) => {
  const { id, type } = (event as CustomEvent<{ id: string; type: string }>).detail;
  announce(`Deleted ${type}: ${id}.`);
});

page.addEventListener("line-account-error", (event) => {
  const { operation } = (event as CustomEvent<{ operation: string }>).detail;
  announce(`The demo ${operation} operation failed.`);
});

// Theme toggle logic
const themeToggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
if (themeToggle) {
  const savedTheme = localStorage.getItem("theme");
  if (
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.body.classList.add("dark-mode");
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}
