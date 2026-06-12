import type {
  CreateLineAccountInput,
  LineAccountView,
  UpdateLineAccountInput,
} from "../account/domain.ts";

export type {
  CreateLineAccountInput,
  LineAccountManagementAdapter,
  LineAccountListPage,
  LineAccountView,
  UpdateLineAccountInput,
} from "../account/domain.ts";

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
