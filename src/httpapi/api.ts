import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";
import {
  CreateLineAccountInput,
  LineAccountListPage,
  LineAccountView,
  LineChannelRecordId,
  UpdateLineAccountInput,
} from "../account/domain.ts";
import {
  LineAccountDuplicateChannelHttpError,
  LineAccountNotFoundHttpError,
  LineAccountPersistenceHttpError,
  LineAccountValidationMiddleware,
} from "./errors.ts";

const CreatedLineAccount = LineAccountView.pipe(HttpApiSchema.status(201));

const listLineAccounts = HttpApiEndpoint.get("list", "/line-accounts", {
  success: LineAccountListPage,
  error: LineAccountPersistenceHttpError,
});

const createLineAccount = HttpApiEndpoint.post("create", "/line-accounts", {
  payload: CreateLineAccountInput,
  success: CreatedLineAccount,
  error: [LineAccountDuplicateChannelHttpError, LineAccountPersistenceHttpError],
}).middleware(LineAccountValidationMiddleware);

const updateLineAccount = HttpApiEndpoint.patch("update", "/line-accounts/:id", {
  params: { id: LineChannelRecordId },
  payload: UpdateLineAccountInput,
  success: LineAccountView,
  error: [
    LineAccountNotFoundHttpError,
    LineAccountDuplicateChannelHttpError,
    LineAccountPersistenceHttpError,
  ],
}).middleware(LineAccountValidationMiddleware);

const deleteLineAccount = HttpApiEndpoint.delete("delete", "/line-accounts/:id", {
  params: { id: LineChannelRecordId },
  success: HttpApiSchema.NoContent,
  error: [LineAccountNotFoundHttpError, LineAccountPersistenceHttpError],
}).middleware(LineAccountValidationMiddleware);

const lineAccountsGroup = HttpApiGroup.make("lineAccounts").add(
  listLineAccounts,
  createLineAccount,
  updateLineAccount,
  deleteLineAccount,
);

export const LineAccountManagementApi = HttpApi.make("LineAccountManagementApi").add(
  lineAccountsGroup,
);
