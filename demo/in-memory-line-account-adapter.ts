import type {
  LineAccountManagementAdapter,
  LineAccountView,
  UpdateLineAccountInput,
} from "../src/web/index.ts";

const copyAccount = (account: LineAccountView): LineAccountView => ({ ...account });

export const createInMemoryLineAccountAdapter = (
  seed: readonly LineAccountView[] = [],
): LineAccountManagementAdapter => {
  let accounts = seed.map(copyAccount);
  let nextId = accounts.length + 1;

  return {
    list: async () => accounts.map(copyAccount),
    create: async (input) => {
      const now = new Date().toISOString();
      const account: LineAccountView = {
        id: `demo-account-${nextId++}`,
        name: input.name,
        channelId: input.channelId,
        isActive: true,
        loginChannelId: input.loginChannelId,
        liffId: input.liffId,
        createdAt: now,
        updatedAt: now,
      };
      accounts = [...accounts, account];
      return copyAccount(account);
    },
    update: async (id, input) => {
      const current = accounts.find((account) => account.id === id);
      if (current === undefined) throw new Error(`Unknown demo account: ${id}`);

      const updated = applyUpdate(current, input);
      accounts = accounts.map((account) => (account.id === id ? updated : account));
      return copyAccount(updated);
    },
    delete: async (id) => {
      if (!accounts.some((account) => account.id === id)) {
        throw new Error(`Unknown demo account: ${id}`);
      }
      accounts = accounts.filter((account) => account.id !== id);
    },
  };
};

const applyUpdate = (account: LineAccountView, input: UpdateLineAccountInput): LineAccountView => ({
  ...account,
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.loginChannelId === undefined ? {} : { loginChannelId: input.loginChannelId }),
  ...(input.liffId === undefined ? {} : { liffId: input.liffId }),
  ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  updatedAt: new Date().toISOString(),
});
