import type {
  LineAccountManagementAdapter,
  LineAccountView,
  UpdateLineAccountInput,
} from "../src/web/index.ts";

const copyAccount = (account: LineAccountView): LineAccountView => ({ ...account });

export const createInMemoryLineAccountAdapter = (
  seed: readonly LineAccountView[] = [],
): LineAccountManagementAdapter => {
  let accounts: LineAccountView[] = seed.map((acc) => ({
    ...acc,
    hasChannelAccessToken: acc.hasChannelAccessToken ?? true,
    hasChannelSecret: acc.hasChannelSecret ?? true,
    hasLoginChannelSecret: acc.hasLoginChannelSecret ?? (acc.loginChannelId ? true : false),
    channelAccessTokenHint: acc.channelAccessTokenHint ?? "20010••••••••••••••••",
    channelSecretHint: acc.channelSecretHint ?? "e3b0c••••••••••••••••",
    loginChannelSecretHint:
      acc.loginChannelSecretHint ?? (acc.loginChannelId ? "f9afb••••••••••••••••" : null),
  }));
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
        hasChannelAccessToken: true,
        hasChannelSecret: true,
        hasLoginChannelSecret: input.loginChannelSecret ? true : false,
        channelAccessTokenHint: `${input.channelAccessToken.slice(0, 5)}••••••••••••••••`,
        channelSecretHint: `${input.channelSecret.slice(0, 5)}••••••••••••••••`,
        loginChannelSecretHint: input.loginChannelSecret
          ? `${input.loginChannelSecret.slice(0, 5)}••••••••••••••••`
          : null,
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
  ...(input.channelId === undefined ? {} : { channelId: input.channelId }),
  ...(input.loginChannelId === undefined ? {} : { loginChannelId: input.loginChannelId }),
  ...(input.liffId === undefined ? {} : { liffId: input.liffId }),
  ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  ...(input.channelAccessToken === undefined
    ? {}
    : {
        hasChannelAccessToken: true,
        channelAccessTokenHint: `${input.channelAccessToken.slice(0, 5)}••••••••••••••••`,
      }),
  ...(input.channelSecret === undefined
    ? {}
    : {
        hasChannelSecret: true,
        channelSecretHint: `${input.channelSecret.slice(0, 5)}••••••••••••••••`,
      }),
  ...(input.loginChannelId === null
    ? { hasLoginChannelSecret: false, loginChannelSecretHint: null }
    : input.loginChannelSecret !== undefined
      ? {
          hasLoginChannelSecret: input.loginChannelSecret !== null,
          loginChannelSecretHint:
            input.loginChannelSecret !== null
              ? `${input.loginChannelSecret.slice(0, 5)}••••••••••••••••`
              : null,
        }
      : {}),
  updatedAt: new Date().toISOString(),
});
