import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi";
import {
  LineProviderId,
  ProviderView,
  ProviderListPage,
  CreateProviderInput,
  UpdateProviderInput,
} from "../provider/domain.ts";
import {
  LineChannelRecordId,
  ChannelView,
  ChannelListPage,
  CreateChannelInput,
  UpdateChannelInput,
} from "../channel/domain.ts";
import {
  LineLiffRecordId,
  LiffAppView,
  LiffAppListPage,
  CreateLiffAppInput,
  UpdateLiffAppInput,
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
const CreatedChannelView = ChannelView.pipe(HttpApiSchema.status(201));
const CreatedLiffAppView = LiffAppView.pipe(HttpApiSchema.status(201));

//#endregion

//#region Query parameter schemas

const ProviderIdQuery = Schema.Struct({
  providerId: Schema.optional(LineProviderId),
});
const ChannelIdQuery = Schema.Struct({
  channelId: Schema.optional(LineChannelRecordId),
});

//#endregion

//#region Providers group

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

//#endregion

//#region Channels group

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

//#endregion

//#region LIFF Apps group

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

//#endregion

//#region Top-level API

/** Top-level HTTP API definition for LINE account management endpoints. */
export const LineApi = HttpApi.make("LineApi").add(providersGroup, channelsGroup, liffAppsGroup);

//#endregion
