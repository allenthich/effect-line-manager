import { createInMemoryLineAccountAdapter } from "./in-memory-line-account-adapter.ts";
import {
  defineLineAccountManagementElements,
  type LineAccountManagement,
  type LineAccountView,
} from "../src/web/index.ts";

const seedAccounts: readonly LineAccountView[] = [
  {
    id: "demo-account-1",
    name: "Customer Support",
    displayName: "LINE Support",
    channelId: "2001043291",
    basicId: "@line-support",
    isActive: true,
    loginChannelId: "2001043310",
    liffId: "2001043291-AbCdEf12",
  },
  {
    id: "demo-account-2",
    name: "Order Notifications",
    displayName: "LINE Orders",
    channelId: "2002098741",
    basicId: "@line-orders",
    isActive: true,
    loginChannelId: null,
    liffId: null,
  },
  {
    id: "demo-account-3",
    name: "Seasonal Campaign",
    channelId: "2003184427",
    isActive: false,
    loginChannelId: "2003184499",
    liffId: null,
  },
];

defineLineAccountManagementElements();

const page = document.querySelector<LineAccountManagement>("#line-accounts");
const status = document.querySelector<HTMLElement>("#demo-status");

if (page === null) throw new Error("Missing line-account-management demo element");

page.adapter = createInMemoryLineAccountAdapter(seedAccounts);

const announce = (message: string): void => {
  if (status !== null) status.textContent = message;
};

page.addEventListener("line-account-created", (event) => {
  const { account } = (event as CustomEvent<{ account: LineAccountView }>).detail;
  announce(`Created ${account.name}.`);
});

page.addEventListener("line-account-updated", (event) => {
  const { account } = (event as CustomEvent<{ account: LineAccountView }>).detail;
  announce(`Updated ${account.name}.`);
});

page.addEventListener("line-account-deleted", (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  announce(`Deleted account ${id}.`);
});

page.addEventListener("line-account-error", (event) => {
  const { operation } = (event as CustomEvent<{ operation: string }>).detail;
  announce(`The demo ${operation} operation failed.`);
});
