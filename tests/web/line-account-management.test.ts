import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import {
  LineAccountDialog,
  LineAccountCard,
  LineAccountForm,
  LineAccountList,
  LineAccountManagement,
  defaultLineAccountManagementMessages,
  defineLineAccountManagementElements,
  type CreateLineAccountInput,
  type LineAccountErrorEventDetail,
  type LineAccountListPage,
  type LineAccountManagementAdapter,
  type LineAccountView,
  type UpdateLineAccountInput,
} from "../../src/web/index.ts";

const firstAccount: LineAccountView = {
  id: "account-1",
  name: "First account",
  channelId: "channel-1",
  botUserId: null,
  basicId: null,
  displayName: null,
  pictureUrl: null,
  isActive: true,
  loginChannelId: null,
  liffId: null,
  createdAt: new Date("2026-06-10T00:00:00.000Z"),
  updatedAt: new Date("2026-06-10T00:00:00.000Z"),
  hasChannelAccessToken: true,
  hasChannelSecret: true,
  hasLoginChannelSecret: false,
};

const secondAccount: LineAccountView = {
  ...firstAccount,
  id: "account-2",
  name: "Second account",
  channelId: "channel-2",
  isActive: false,
};

type MutableAdapter = {
  -readonly [Key in keyof LineAccountManagementAdapter]: LineAccountManagementAdapter[Key];
};

const pageOf = (accounts: ReadonlyArray<LineAccountView>): LineAccountListPage => ({
  data: [...accounts],
  pagination: {
    page: 1,
    pageSize: accounts.length,
    totalItems: accounts.length,
    totalPages: accounts.length === 0 ? 0 : 1,
  },
});

beforeAll(() => {
  defineLineAccountManagementElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const settle = async (element: LineAccountManagement): Promise<void> => {
  for (let index = 0; index < 4; index++) {
    await Promise.resolve();
    await element.updateComplete;
  }
};

const makeAdapter = (initial: readonly LineAccountView[] = []) => {
  let accounts = [...initial];
  const createCalls: CreateLineAccountInput[] = [];
  const updateCalls: { id: string; input: UpdateLineAccountInput }[] = [];
  const deleteCalls: string[] = [];
  const adapter: MutableAdapter = {
    list: async () => pageOf(accounts),
    create: async (input) => {
      createCalls.push(input);
      const account = { ...firstAccount, id: `account-${accounts.length + 1}`, name: input.name };
      accounts = [...accounts, account];
      return account;
    },
    update: async (id, input) => {
      updateCalls.push({ id, input });
      const current = accounts.find((account) => account.id === id);
      if (current === undefined) throw new Error("missing account");
      const updated = { ...current, ...input };
      accounts = accounts.map((account) => (account.id === id ? updated : account));
      return updated;
    },
    delete: async (id) => {
      deleteCalls.push(id);
      accounts = accounts.filter((account) => account.id !== id);
    },
  };
  return { adapter, createCalls, updateCalls, deleteCalls };
};

const mount = async (adapter?: LineAccountManagementAdapter) => {
  const element = document.createElement("line-account-management") as LineAccountManagement;
  element.adapter = adapter;
  document.body.append(element);
  await settle(element);
  return element;
};

const click = (element: LineAccountManagement, selector: string): void => {
  const button = element.shadowRoot?.querySelector<HTMLButtonElement>(selector);
  if (button === null || button === undefined) throw new Error(`Missing button ${selector}`);
  button.click();
};

const getDialog = (element: LineAccountManagement, kind: string): LineAccountDialog => {
  const dialog = element.shadowRoot?.querySelector<LineAccountDialog>(
    `line-account-dialog[data-kind="${kind}"]`,
  );
  if (dialog === null || dialog === undefined) throw new Error(`Missing ${kind} dialog`);
  return dialog;
};

const getForm = (element: LineAccountManagement, kind = "create"): LineAccountForm => {
  const form = getDialog(element, kind).querySelector<LineAccountForm>("line-account-form");
  if (form === null || form === undefined) throw new Error("Missing account form");
  return form;
};

const getList = (element: LineAccountManagement): LineAccountList => {
  const list = element.shadowRoot?.querySelector<LineAccountList>("line-account-list");
  if (list === null || list === undefined) throw new Error("Missing account list");
  return list;
};

const getCards = (element: LineAccountManagement) =>
  getList(element).shadowRoot?.querySelectorAll<LineAccountCard>("line-account-card") ?? [];

const setFormValue = (form: LineAccountForm, name: string, value: string): void => {
  const target = form.shadowRoot?.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (target === null || target === undefined) throw new Error(`Missing input ${name}`);
  target.value = value;
  target.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
};

const submitForm = (form: LineAccountForm): void => {
  form.shadowRoot
    ?.querySelector("form")
    ?.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
};

describe("loading and localization", () => {
  test("renders an actionable absent-adapter state with localized overrides", async () => {
    const element = document.createElement("line-account-management") as LineAccountManagement;
    element.messages = { title: "LINE 接続" };
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("LINE 接続");
    expect(element.shadowRoot?.textContent).toContain(
      defaultLineAccountManagementMessages.adapterMissingDescription,
    );
    expect(element.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
  });

  test("loads on connection and renders loading, empty, and success states", async () => {
    const pending = deferred<LineAccountListPage>();
    const adapter = makeAdapter().adapter;
    adapter.list = () => pending.promise;
    const element = document.createElement("line-account-management") as LineAccountManagement;
    element.adapter = adapter;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain(
      defaultLineAccountManagementMessages.loadingAccounts,
    );
    expect(element.shadowRoot?.querySelector('[role="status"]')).not.toBeNull();

    pending.resolve(pageOf([]));
    await settle(element);
    expect(getList(element).shadowRoot?.textContent).toContain(
      defaultLineAccountManagementMessages.emptyHeading,
    );

    adapter.list = async () => pageOf([firstAccount]);
    await element.reload();
    await element.updateComplete;
    expect(getCards(element)).toHaveLength(1);
  });

  test("handles synchronous list failures safely and retries through reload", async () => {
    const originalError = new Error("private backend details");
    const adapter = makeAdapter().adapter;
    adapter.list = (() => {
      throw originalError;
    }) as LineAccountManagementAdapter["list"];
    const element = document.createElement("line-account-management") as LineAccountManagement;
    const errors: LineAccountErrorEventDetail[] = [];
    element.addEventListener("line-account-error", (event) => {
      errors.push((event as CustomEvent<LineAccountErrorEventDetail>).detail);
    });
    element.adapter = adapter;
    document.body.append(element);
    await settle(element);

    expect(element.shadowRoot?.textContent).toContain(
      defaultLineAccountManagementMessages.loadFailure,
    );
    expect(element.shadowRoot?.textContent).not.toContain("private backend details");
    expect(errors).toEqual([{ operation: "list", error: originalError }]);

    adapter.list = async () => pageOf([firstAccount]);
    click(element, '[part="retry-button"]');
    await settle(element);
    expect(getCards(element)).toHaveLength(1);
  });

  test("reloads when the adapter property is reassigned and ignores stale results", async () => {
    const stale = deferred<LineAccountListPage>();
    const first = makeAdapter().adapter;
    first.list = () => stale.promise;
    const element = await mount(first);

    const next = makeAdapter([secondAccount]).adapter;
    element.adapter = next;
    await settle(element);
    stale.resolve(pageOf([firstAccount]));
    await settle(element);

    expect(getCards(element)[0]?.account).toEqual(secondAccount);
  });
});

describe("dialogs and mutations", () => {
  test("opens and closes create, edit, and delete dialogs", async () => {
    const element = await mount(makeAdapter([firstAccount]).adapter);
    const createForm = getForm(element);
    await createForm.updateComplete;
    const nameInput = createForm.shadowRoot?.querySelector<HTMLInputElement>('[name="name"]');
    let focusCalls = 0;
    if (nameInput !== null && nameInput !== undefined) {
      nameInput.focus = () => {
        focusCalls++;
      };
    }

    click(element, '[part="add-button"]');
    await element.updateComplete;
    expect(getDialog(element, "create").open).toBe(true);
    await Promise.resolve();
    expect(focusCalls).toBe(1);
    getDialog(element, "create").dispatchEvent(
      new CustomEvent("line-account-dialog-close-request", { bubbles: true, composed: true }),
    );
    await element.updateComplete;
    expect(getDialog(element, "create").open).toBe(false);

    const card = getCards(element)[0];
    card?.dispatchEvent(
      new CustomEvent("line-account-edit-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;
    expect(getDialog(element, "edit").open).toBe(true);
    expect(getForm(element, "edit").account).toBe(firstAccount);

    card?.dispatchEvent(
      new CustomEvent("line-account-delete-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;
    expect(getDialog(element, "delete").open).toBe(true);
    expect(getDialog(element, "delete").textContent).toContain("First account");
  });

  test("resets create values when the dialog is closed and reopened", async () => {
    const element = await mount(makeAdapter().adapter);
    click(element, '[part="add-button"]');
    await element.updateComplete;
    const form = getForm(element);
    await form.updateComplete;
    setFormValue(form, "name", "Unsaved account");

    getDialog(element, "create").dispatchEvent(
      new CustomEvent("line-account-dialog-close-request", { bubbles: true, composed: true }),
    );
    await element.updateComplete;
    click(element, '[part="add-button"]');
    await element.updateComplete;
    await form.updateComplete;

    expect(form.shadowRoot?.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe("");
  });

  test("creates once, reloads, closes, and emits the created account", async () => {
    const state = makeAdapter();
    const pending = deferred<LineAccountView>();
    state.adapter.create = (input) => {
      state.createCalls.push(input);
      return pending.promise;
    };
    const element = await mount(state.adapter);
    const created: LineAccountView[] = [];
    element.addEventListener("line-account-created", (event) => {
      created.push((event as CustomEvent<{ account: LineAccountView }>).detail.account);
    });

    click(element, '[part="add-button"]');
    await element.updateComplete;
    const form = getForm(element);
    await form.updateComplete;
    setFormValue(form, "name", " New account ");
    setFormValue(form, "channelId", " channel-new ");
    setFormValue(form, "channelAccessToken", " token ");
    setFormValue(form, "channelSecret", " secret ");
    click(element, 'line-account-dialog[data-kind="create"] [part="submit-button"]');
    click(element, 'line-account-dialog[data-kind="create"] [part="submit-button"]');
    expect(state.createCalls).toHaveLength(1);

    const result = { ...firstAccount, id: "created", name: "New account" };
    pending.resolve(result);
    await settle(element);
    expect(getDialog(element, "create").open).toBe(false);
    expect(created).toEqual([result]);
  });

  test("keeps split details in sync with filtered accounts", async () => {
    const element = await mount(makeAdapter([firstAccount, secondAccount]).adapter);
    element.variant = "split";
    element.selectedListAccountId = firstAccount.id;
    element.searchQuery = "Second";
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("Second account");
    expect(element.shadowRoot?.textContent).not.toContain("First account");
  });

  test("closes an unchanged edit without calling the adapter", async () => {
    const state = makeAdapter([firstAccount]);
    const element = await mount(state.adapter);
    getCards(element)[0]?.dispatchEvent(
      new CustomEvent("line-account-edit-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;
    const form = getForm(element, "edit");
    await form.updateComplete;
    submitForm(form);
    await element.updateComplete;

    expect(state.updateCalls).toHaveLength(0);
    expect(getDialog(element, "edit").open).toBe(false);
  });

  test("preserves edit values and emits the original error when update fails", async () => {
    const state = makeAdapter([firstAccount]);
    const originalError = new Error("private update details");
    state.adapter.update = async () => {
      throw originalError;
    };
    const element = await mount(state.adapter);
    const errors: LineAccountErrorEventDetail[] = [];
    element.addEventListener("line-account-error", (event) => {
      errors.push((event as CustomEvent<LineAccountErrorEventDetail>).detail);
    });
    getCards(element)[0]?.dispatchEvent(
      new CustomEvent("line-account-edit-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;
    const form = getForm(element, "edit");
    await form.updateComplete;
    setFormValue(form, "name", "Unsaved name");
    click(element, 'line-account-dialog[data-kind="edit"] [part="submit-button"]');
    await settle(element);

    expect(getDialog(element, "edit").open).toBe(true);
    expect(form.shadowRoot?.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe(
      "Unsaved name",
    );
    expect(form.shadowRoot?.textContent).toContain(
      defaultLineAccountManagementMessages.updateFailure,
    );
    expect(form.shadowRoot?.textContent).not.toContain("private update details");
    expect(errors).toEqual([{ operation: "update", error: originalError }]);
  });

  test("updates an edited account and emits a composed updated event", async () => {
    const state = makeAdapter([firstAccount]);
    const element = await mount(state.adapter);
    let updatedEvent: CustomEvent<{ account: LineAccountView }> | undefined;
    element.addEventListener("line-account-updated", (event) => {
      updatedEvent = event as CustomEvent<{ account: LineAccountView }>;
    });
    getCards(element)[0]?.dispatchEvent(
      new CustomEvent("line-account-edit-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;
    const form = getForm(element, "edit");
    await form.updateComplete;
    setFormValue(form, "name", "Renamed account");
    submitForm(form);
    await settle(element);

    expect(state.updateCalls).toEqual([
      { id: firstAccount.id, input: { name: "Renamed account" } },
    ]);
    expect(updatedEvent?.detail.account.name).toBe("Renamed account");
    expect(updatedEvent?.bubbles).toBe(true);
    expect(updatedEvent?.composed).toBe(true);
  });

  test("preserves create values and emits a composed error when creation fails", async () => {
    const state = makeAdapter();
    const originalError = new Error("private create details");
    state.adapter.create = async () => {
      throw originalError;
    };
    const element = await mount(state.adapter);
    let errorEvent: CustomEvent<LineAccountErrorEventDetail> | undefined;
    element.addEventListener("line-account-error", (event) => {
      errorEvent = event as CustomEvent<LineAccountErrorEventDetail>;
    });
    click(element, '[part="add-button"]');
    await element.updateComplete;
    const form = getForm(element);
    await form.updateComplete;
    setFormValue(form, "name", "Unsaved account");
    setFormValue(form, "channelId", "channel-new");
    setFormValue(form, "channelAccessToken", "token");
    setFormValue(form, "channelSecret", "secret");
    submitForm(form);
    await settle(element);

    expect(getDialog(element, "create").open).toBe(true);
    expect(form.shadowRoot?.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe(
      "Unsaved account",
    );
    expect(form.shadowRoot?.textContent).toContain(
      defaultLineAccountManagementMessages.createFailure,
    );
    expect(errorEvent?.detail).toEqual({ operation: "create", error: originalError });
    expect(errorEvent?.bubbles).toBe(true);
    expect(errorEvent?.composed).toBe(true);
  });

  test("toggles with per-account pending state and emits an update", async () => {
    const state = makeAdapter([firstAccount, secondAccount]);
    const pending = deferred<LineAccountView>();
    state.adapter.update = (id, input) => {
      state.updateCalls.push({ id, input });
      return pending.promise;
    };
    const element = await mount(state.adapter);
    const cards = getCards(element);
    cards[0]?.dispatchEvent(
      new CustomEvent("line-account-toggle-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;

    expect(state.updateCalls).toEqual([{ id: firstAccount.id, input: { isActive: false } }]);
    expect(cards[0]?.disabled).toBe(true);
    expect(cards[1]?.disabled).toBe(false);

    pending.resolve({ ...firstAccount, isActive: false });
    await settle(element);
  });

  test("keeps toggle failures beside the affected card", async () => {
    const state = makeAdapter([firstAccount, secondAccount]);
    const originalError = new Error("private toggle details");
    state.adapter.update = async () => {
      throw originalError;
    };
    const element = await mount(state.adapter);
    let errorEvent: CustomEvent<LineAccountErrorEventDetail> | undefined;
    element.addEventListener("line-account-error", (event) => {
      errorEvent = event as CustomEvent<LineAccountErrorEventDetail>;
    });
    getCards(element)[0]?.dispatchEvent(
      new CustomEvent("line-account-toggle-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await settle(element);

    const cards = getCards(element);
    expect(cards[0]?.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain(
      defaultLineAccountManagementMessages.toggleFailure,
    );
    expect(cards[1]?.shadowRoot?.querySelector('[role="alert"]')).toBeNull();
    expect(errorEvent?.detail).toEqual({ operation: "toggle", error: originalError });
  });

  test("confirms deletion once, reloads, and emits the deleted id", async () => {
    const state = makeAdapter([firstAccount]);
    const pending = deferred<void>();
    state.adapter.delete = (id) => {
      state.deleteCalls.push(id);
      return pending.promise;
    };
    const element = await mount(state.adapter);
    const deleted: string[] = [];
    element.addEventListener("line-account-deleted", (event) => {
      deleted.push((event as CustomEvent<{ id: string }>).detail.id);
    });
    getCards(element)[0]?.dispatchEvent(
      new CustomEvent("line-account-delete-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;

    click(element, '[part="confirm-delete-button"]');
    click(element, '[part="confirm-delete-button"]');
    expect(state.deleteCalls).toEqual([firstAccount.id]);

    pending.resolve();
    await settle(element);
    expect(getDialog(element, "delete").open).toBe(false);
    expect(deleted).toEqual([firstAccount.id]);
  });

  test("keeps the delete dialog open and emits an error when deletion fails", async () => {
    const state = makeAdapter([firstAccount]);
    const originalError = new Error("private delete details");
    state.adapter.delete = async () => {
      throw originalError;
    };
    const element = await mount(state.adapter);
    const errors: LineAccountErrorEventDetail[] = [];
    element.addEventListener("line-account-error", (event) => {
      errors.push((event as CustomEvent<LineAccountErrorEventDetail>).detail);
    });
    getCards(element)[0]?.dispatchEvent(
      new CustomEvent("line-account-delete-request", {
        bubbles: true,
        composed: true,
        detail: { account: firstAccount },
      }),
    );
    await element.updateComplete;
    click(element, '[part="confirm-delete-button"]');
    await settle(element);

    expect(getDialog(element, "delete").open).toBe(true);
    expect(getDialog(element, "delete").textContent).toContain(
      defaultLineAccountManagementMessages.deleteFailure,
    );
    expect(errors).toEqual([{ operation: "delete", error: originalError }]);
  });
});
