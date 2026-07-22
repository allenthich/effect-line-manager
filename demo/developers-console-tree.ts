import {
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type LineAccountDialog,
  type LineAccountForm,
  type LineAccountFormSubmitDetail,
} from "../src/web/index.ts";
import {
  defineLineDevelopersConsoleElements,
  type LineDevelopersConsole,
} from "../src/web/developers-console/index.ts";
import {
  createDemoConsoleEditor,
  type DemoConsoleEditDetail,
  type DemoConsoleEditTarget,
} from "./developers-console-seed.ts";

defineLineAccountManagementElements();
defineLineDevelopersConsoleElements();

const element = document.querySelector<LineDevelopersConsole>("#developers-console");
const dialog = document.querySelector<LineAccountDialog>("#edit-dialog");
const form = document.querySelector<LineAccountForm>("#edit-form");
const cancelButton = document.querySelector<HTMLButtonElement>("#edit-cancel");
const saveButton = document.querySelector<HTMLButtonElement>("#edit-save");
const status = document.querySelector<HTMLElement>("#demo-status");

if (
  element === null ||
  dialog === null ||
  form === null ||
  cancelButton === null ||
  saveButton === null
) {
  throw new Error("Missing a required developers-console tree demo element");
}

const editor = createDemoConsoleEditor();
let editTarget: DemoConsoleEditTarget | undefined;
let statusTimeout: number | undefined;

const headings = {
  provider: defaultLineAccountManagementMessages.editProviderHeading,
  messagingChannel: defaultLineAccountManagementMessages.editMessagingChannelHeading,
  loginChannel: defaultLineAccountManagementMessages.editLoginChannelHeading,
  liff: defaultLineAccountManagementMessages.editLiffAppHeading,
} as const;

const announce = (message: string): void => {
  if (status === null) return;
  status.textContent = message;
  if (statusTimeout !== undefined) window.clearTimeout(statusTimeout);
  statusTimeout = window.setTimeout(() => {
    status.textContent = "";
    statusTimeout = undefined;
  }, 5000);
};

const closeEditor = (): void => {
  dialog.open = false;
  editTarget = undefined;
  form.error = undefined;
};

const openEditor = (detail: DemoConsoleEditDetail): void => {
  const target = editor.resolveEdit(detail);
  editTarget = target;
  form.type = target.type;
  form.mode = "edit";
  form.item = target.item;
  form.providers = [...editor.providers];
  form.loginChannels = [...editor.loginChannels];
  form.messages = defaultLineAccountManagementMessages;
  form.selectedProviderId =
    target.type === "messagingChannel" || target.type === "loginChannel"
      ? target.item.providerId
      : undefined;
  form.selectedChannelId = target.type === "liff" ? target.item.loginChannelId : undefined;
  form.submitting = false;
  form.error = undefined;
  form.reset();
  dialog.heading = headings[target.type];
  dialog.open = true;
};

element.adapter = editor.adapter;
element.variant = "tree";
void element.refresh();

element.addEventListener("line-developers-console-edit", (event) => {
  openEditor((event as CustomEvent<DemoConsoleEditDetail>).detail);
});
element.addEventListener("line-developers-console-error", (event) => {
  console.error("developers-console error", (event as CustomEvent).detail);
});
element.addEventListener("line-developers-console-copy", (event) => {
  console.info("copied secret", (event as CustomEvent).detail);
});

dialog.addEventListener("line-account-dialog-close-request", closeEditor);
cancelButton.addEventListener("click", closeEditor);
saveButton.addEventListener("click", () => form.submit());

form.addEventListener("line-account-form-submit", (event) => {
  const detail = (event as CustomEvent<LineAccountFormSubmitDetail>).detail;
  if (editTarget === undefined) return;

  try {
    const updated = editor.update(editTarget, detail);
    const label = "name" in updated ? updated.name : updated.liffId;
    closeEditor();
    void (async () => {
      await dialog.updateComplete;
      await element.refresh();
      await element.expandAll();
      announce(`Saved changes to ${label}.`);
    })();
  } catch (error) {
    form.error = error instanceof Error ? error.message : "Unable to save the demo item.";
  }
});
