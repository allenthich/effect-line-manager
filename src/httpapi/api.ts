import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";
import {
  ChannelView,
  ChannelListPage,
  CreateChannelInput,
  CreateLiffAppInput,
  CreateProviderInput,
  LiffAppView,
  LiffAppListPage,
  LineChannelRecordId,
  LineLiffRecordId,
  LineProviderId,
  ProviderView,
  ProviderListPage,
  UpdateChannelInput,
  UpdateLiffAppInput,
  UpdateProviderInput,
} from "../account/domain.ts";
import {
  ChannelDuplicateHttpError,
  ChannelNotFoundHttpError,
  LiffAppDuplicateHttpError,
  LiffAppNotFoundHttpError,
  LineValidationMiddleware,
  LinePersistenceHttpError,
  ProviderDuplicateHttpError,
  ProviderNotFoundHttpError,
} from "./errors.ts";

// ── Status-code annotated schemas ──────────────────────────────────────

const CreatedProviderView = ProviderView.pipe(HttpApiSchema.status(201));
const CreatedChannelView = ChannelView.pipe(HttpApiSchema.status(201));
const CreatedLiffAppView = LiffAppView.pipe(HttpApiSchema.status(201));

// ── Query parameter schemas ────────────────────────────────────────────

const ProviderIdQuery = Schema.Struct({
  providerId: Schema.optional(Schema.String),
});
const ChannelIdQuery = Schema.Struct({
  channelId: Schema.optional(Schema.String),
});

// ── Providers group ────────────────────────────────────────────────────

const listProviders = HttpApiEndpoint.get("listProviders", "/line-providers", {
  success: ProviderListPage,
  error: LinePersistenceHttpError,
});

const getProvider = HttpApiEndpoint.get("getProvider", "/line-providers/:id", {
  params: { id: LineProviderId },
  success: ProviderView,
  error: [ProviderNotFoundHttpError, LinePersistenceHttpError],
});

const createProvider = HttpApiEndpoint.post("createProvider", "/line-providers", {
  payload: CreateProviderInput,
  success: CreatedProviderView,
  error: [ProviderDuplicateHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const updateProvider = HttpApiEndpoint.patch("updateProvider", "/line-providers/:id", {
  params: { id: LineProviderId },
  payload: UpdateProviderInput,
  success: ProviderView,
  error: [ProviderNotFoundHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const deleteProvider = HttpApiEndpoint.delete("deleteProvider", "/line-providers/:id", {
  params: { id: LineProviderId },
  success: HttpApiSchema.NoContent,
  error: [ProviderNotFoundHttpError, LinePersistenceHttpError],
});

const providersGroup = HttpApiGroup.make("lineProviders").add(
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
);

// ── Channels group ─────────────────────────────────────────────────────

const listChannels = HttpApiEndpoint.get("listChannels", "/line-channels", {
  query: ProviderIdQuery,
  success: ChannelListPage,
  error: LinePersistenceHttpError,
});

const getChannel = HttpApiEndpoint.get("getChannel", "/line-channels/:id", {
  params: { id: LineChannelRecordId },
  success: ChannelView,
  error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
});

const createChannel = HttpApiEndpoint.post("createChannel", "/line-channels", {
  payload: CreateChannelInput,
  success: CreatedChannelView,
  error: [ChannelDuplicateHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const updateChannel = HttpApiEndpoint.patch("updateChannel", "/line-channels/:id", {
  params: { id: LineChannelRecordId },
  payload: UpdateChannelInput,
  success: ChannelView,
  error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const deleteChannel = HttpApiEndpoint.delete("deleteChannel", "/line-channels/:id", {
  params: { id: LineChannelRecordId },
  success: HttpApiSchema.NoContent,
  error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
});

const channelsGroup = HttpApiGroup.make("lineChannels").add(
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
);

// ── LIFF Apps group ────────────────────────────────────────────────────

const listLiffApps = HttpApiEndpoint.get("listLiffApps", "/line-liff-apps", {
  query: ChannelIdQuery,
  success: LiffAppListPage,
  error: LinePersistenceHttpError,
});

const getLiffApp = HttpApiEndpoint.get("getLiffApp", "/line-liff-apps/:id", {
  params: { id: LineLiffRecordId },
  success: LiffAppView,
  error: [LiffAppNotFoundHttpError, LinePersistenceHttpError],
});

const createLiffApp = HttpApiEndpoint.post("createLiffApp", "/line-liff-apps", {
  payload: CreateLiffAppInput,
  success: CreatedLiffAppView,
  error: [LiffAppDuplicateHttpError, ChannelNotFoundHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const updateLiffApp = HttpApiEndpoint.patch("updateLiffApp", "/line-liff-apps/:id", {
  params: { id: LineLiffRecordId },
  payload: UpdateLiffAppInput,
  success: LiffAppView,
  error: [LiffAppNotFoundHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const deleteLiffApp = HttpApiEndpoint.delete("deleteLiffApp", "/line-liff-apps/:id", {
  params: { id: LineLiffRecordId },
  success: HttpApiSchema.NoContent,
  error: [LiffAppNotFoundHttpError, LinePersistenceHttpError],
});

const liffAppsGroup = HttpApiGroup.make("lineLiffApps").add(
  listLiffApps,
  getLiffApp,
  createLiffApp,
  updateLiffApp,
  deleteLiffApp,
);

// ── Top-level API ──────────────────────────────────────────────────────

export const LineApi = HttpApi.make("LineApi").add(providersGroup, channelsGroup, liffAppsGroup);

// ═══════════════════════════════════════════════════════════════════════
// DEPRECATED — old LineAccount API kept for backward compatibility
// ═══════════════════════════════════════════════════════════════════════

import {
  CreateLineAccountInput,
  LineAccountListPage,
  LineAccountView,
  UpdateLineAccountInput,
} from "../account/domain.ts";
import {
  LineAccountDuplicateChannelHttpError,
  LineAccountNotFoundHttpError,
  LineAccountPersistenceHttpError,
  LineAccountValidationMiddleware,
} from "./errors.ts";

const CreatedLineAccount = LineAccountView.pipe(HttpApiSchema.status(201));

/** @deprecated Use the new Provider, Channel, and LIFF endpoints instead. */
const listLineAccounts = HttpApiEndpoint.get("list", "/line-accounts", {
  success: LineAccountListPage,
  error: LineAccountPersistenceHttpError,
});

/** @deprecated */
const createLineAccount = HttpApiEndpoint.post("create", "/line-accounts", {
  payload: CreateLineAccountInput,
  success: CreatedLineAccount,
  error: [LineAccountDuplicateChannelHttpError, LineAccountPersistenceHttpError],
}).middleware(LineAccountValidationMiddleware);

/** @deprecated */
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

/** @deprecated */
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

/** @deprecated Use {@link LineApi} instead. */
export const LineAccountManagementApi = HttpApi.make("LineAccountManagementApi").add(
  lineAccountsGroup,
);
