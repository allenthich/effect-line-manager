import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";
import {
  LineProviderId,
  ProviderView,
  ProviderListPage,
  CreateProviderInput,
  UpdateProviderInput,
  ListProvidersQuery,
} from "../provider/domain.ts";
import { LineChannelId } from "../shared/domain.ts";
import {
  CreateLineMessagingChannelInput,
  UpdateLineMessagingChannelInput,
  CreateLineLoginChannelInput,
  UpdateLineLoginChannelInput,
  ListLineMessagingChannelsQuery,
  ListLineLoginChannelsQuery,
  LineMessagingChannelView,
  LineLoginChannelView,
  LineMessagingChannelListPage,
  LineLoginChannelListPage,
} from "../channels/management-domain.ts";
import {
  LineLiffId,
  LiffAppView,
  LiffAppListPage,
  CreateLiffAppInput,
  UpdateLiffAppInput,
  ListLiffAppsQuery,
} from "../liff/domain.ts";
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

//#region Status-code annotated schemas

const CreatedProviderView = ProviderView.pipe(HttpApiSchema.status(201));
const CreatedLineMessagingChannelView = LineMessagingChannelView.pipe(HttpApiSchema.status(201));
const CreatedLineLoginChannelView = LineLoginChannelView.pipe(HttpApiSchema.status(201));
const CreatedLiffAppView = LiffAppView.pipe(HttpApiSchema.status(201));

//#endregion

//#region Providers group

const listProviders = HttpApiEndpoint.get("listProviders", "/line-providers", {
  query: ListProvidersQuery,
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

//#endregion

//#region Messaging Channels group

const listMessagingChannels = HttpApiEndpoint.get(
  "listMessagingChannels",
  "/line-messaging-channels",
  {
    query: ListLineMessagingChannelsQuery,
    success: LineMessagingChannelListPage,
    error: LinePersistenceHttpError,
  },
);

const getMessagingChannel = HttpApiEndpoint.get(
  "getMessagingChannel",
  "/line-messaging-channels/:id",
  {
    params: { id: LineChannelId },
    success: LineMessagingChannelView,
    error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
  },
);

const createMessagingChannel = HttpApiEndpoint.post(
  "createMessagingChannel",
  "/line-messaging-channels",
  {
    payload: CreateLineMessagingChannelInput,
    success: CreatedLineMessagingChannelView,
    error: [ChannelDuplicateHttpError, LinePersistenceHttpError],
  },
).middleware(LineValidationMiddleware);

const updateMessagingChannel = HttpApiEndpoint.patch(
  "updateMessagingChannel",
  "/line-messaging-channels/:id",
  {
    params: { id: LineChannelId },
    payload: UpdateLineMessagingChannelInput,
    success: LineMessagingChannelView,
    error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
  },
).middleware(LineValidationMiddleware);

const deleteMessagingChannel = HttpApiEndpoint.delete(
  "deleteMessagingChannel",
  "/line-messaging-channels/:id",
  {
    params: { id: LineChannelId },
    success: HttpApiSchema.NoContent,
    error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
  },
);

const messagingChannelsGroup = HttpApiGroup.make("lineMessagingChannels").add(
  listMessagingChannels,
  getMessagingChannel,
  createMessagingChannel,
  updateMessagingChannel,
  deleteMessagingChannel,
);

//#endregion

//#region Login Channels group

const listLoginChannels = HttpApiEndpoint.get("listLoginChannels", "/line-login-channels", {
  query: ListLineLoginChannelsQuery,
  success: LineLoginChannelListPage,
  error: LinePersistenceHttpError,
});

const getLoginChannel = HttpApiEndpoint.get("getLoginChannel", "/line-login-channels/:id", {
  params: { id: LineChannelId },
  success: LineLoginChannelView,
  error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
});

const createLoginChannel = HttpApiEndpoint.post("createLoginChannel", "/line-login-channels", {
  payload: CreateLineLoginChannelInput,
  success: CreatedLineLoginChannelView,
  error: [ChannelDuplicateHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const updateLoginChannel = HttpApiEndpoint.patch("updateLoginChannel", "/line-login-channels/:id", {
  params: { id: LineChannelId },
  payload: UpdateLineLoginChannelInput,
  success: LineLoginChannelView,
  error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const deleteLoginChannel = HttpApiEndpoint.delete(
  "deleteLoginChannel",
  "/line-login-channels/:id",
  {
    params: { id: LineChannelId },
    success: HttpApiSchema.NoContent,
    error: [ChannelNotFoundHttpError, LinePersistenceHttpError],
  },
);

const loginChannelsGroup = HttpApiGroup.make("lineLoginChannels").add(
  listLoginChannels,
  getLoginChannel,
  createLoginChannel,
  updateLoginChannel,
  deleteLoginChannel,
);

//#endregion

//#region LIFF Apps group

const listLiffApps = HttpApiEndpoint.get("listLiffApps", "/line-liff-apps", {
  query: ListLiffAppsQuery,
  success: LiffAppListPage,
  error: LinePersistenceHttpError,
});

const getLiffApp = HttpApiEndpoint.get("getLiffApp", "/line-liff-apps/:id", {
  params: { id: LineLiffId },
  success: LiffAppView,
  error: [LiffAppNotFoundHttpError, LinePersistenceHttpError],
});

const createLiffApp = HttpApiEndpoint.post("createLiffApp", "/line-liff-apps", {
  payload: CreateLiffAppInput,
  success: CreatedLiffAppView,
  error: [LiffAppDuplicateHttpError, ChannelNotFoundHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const updateLiffApp = HttpApiEndpoint.patch("updateLiffApp", "/line-liff-apps/:id", {
  params: { id: LineLiffId },
  payload: UpdateLiffAppInput,
  success: LiffAppView,
  error: [LiffAppNotFoundHttpError, LinePersistenceHttpError],
}).middleware(LineValidationMiddleware);

const deleteLiffApp = HttpApiEndpoint.delete("deleteLiffApp", "/line-liff-apps/:id", {
  params: { id: LineLiffId },
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

//#endregion

//#region Top-level API

/** Top-level HTTP API definition for LINE account management endpoints. */
export const LineApi = HttpApi.make("LineApi").add(
  providersGroup,
  messagingChannelsGroup,
  loginChannelsGroup,
  liffAppsGroup,
);

//#endregion
