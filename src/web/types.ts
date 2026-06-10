export interface LineAccountView {
  readonly id: string;
  readonly name: string;
  readonly channelId: string;
  readonly displayName?: string | null;
  readonly pictureUrl?: string | null;
  readonly basicId?: string | null;
  readonly isActive: boolean;
  readonly loginChannelId: string | null;
  readonly liffId: string | null;
  readonly createdAt?: string | Date;
  readonly updatedAt?: string | Date;
  readonly hasChannelAccessToken?: boolean;
  readonly hasChannelSecret?: boolean;
  readonly hasLoginChannelSecret?: boolean;
  readonly channelAccessTokenHint?: string | null;
  readonly channelSecretHint?: string | null;
  readonly loginChannelSecretHint?: string | null;
}

export interface CreateLineAccountInput {
  readonly name: string;
  readonly channelId: string;
  readonly channelAccessToken: string;
  readonly channelSecret: string;
  readonly loginChannelId: string | null;
  readonly loginChannelSecret: string | null;
  readonly liffId: string | null;
}

export interface UpdateLineAccountInput {
  readonly name?: string;
  readonly channelId?: string;
  readonly channelAccessToken?: string;
  readonly channelSecret?: string;
  readonly loginChannelId?: string | null;
  readonly loginChannelSecret?: string | null;
  readonly liffId?: string | null;
  readonly isActive?: boolean;
}

export interface LineAccountManagementAdapter {
  readonly list: () => Promise<readonly LineAccountView[]>;
  readonly create: (input: CreateLineAccountInput) => Promise<LineAccountView>;
  readonly update: (id: string, input: UpdateLineAccountInput) => Promise<LineAccountView>;
  readonly delete: (id: string) => Promise<void>;
}

export type LineAccountFormMode = "create" | "edit";

export type LineAccountOperation = "list" | "create" | "update" | "toggle" | "delete";

export interface LineAccountRequestDetail {
  readonly account: LineAccountView;
}

export type LineAccountFormSubmitDetail =
  | { readonly mode: "create"; readonly input: CreateLineAccountInput }
  | { readonly mode: "edit"; readonly input: UpdateLineAccountInput };

export interface LineAccountCreatedEventDetail {
  readonly account: LineAccountView;
}

export interface LineAccountUpdatedEventDetail {
  readonly account: LineAccountView;
}

export interface LineAccountDeletedEventDetail {
  readonly id: string;
}

export interface LineAccountErrorEventDetail {
  readonly operation: LineAccountOperation;
  readonly error: unknown;
}
