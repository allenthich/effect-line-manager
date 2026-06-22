import { Effect, Schema } from "effect";
import { HttpApi, HttpApiClient, OpenApi } from "effect/unstable/httpapi";
import type { HttpClient } from "effect/unstable/http";
import { LineProviderId } from "../provider/domain.ts";
import { LineChannelId } from "../channel/domain.ts";
import { LineLiffId } from "../liff/domain.ts";
import { type LineProviderManagementAdapter } from "../adapter/types.ts";
import { LineApi } from "./api.ts";

//#region New API Client

type LineApiGroups = typeof LineApi extends HttpApi.HttpApi<string, infer Groups> ? Groups : never;

/** Client type for the LINE account management HTTP API. */
export type LineClient = HttpApiClient.Client<LineApiGroups>;

/** Options for configuring the LINE API HTTP client. */
export interface LineClientOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined;
  readonly transformResponse?:
    | ((
        effect: Effect.Effect<unknown, unknown, unknown>,
      ) => Effect.Effect<unknown, unknown, unknown>)
    | undefined;
}

/** Creates an HTTP API client for LINE account management endpoints. */
export const makeLineClient = (options?: LineClientOptions) => HttpApiClient.make(LineApi, options);

//#endregion

//#region New Adapter
const decodeChannelId = Schema.decodeEffect(LineChannelId);
const decodeProviderId = Schema.decodeEffect(LineProviderId);
const decodeLiffId = Schema.decodeEffect(LineLiffId);

/** Creates a provider management adapter backed by a LINE API client. */
export const makeLineProviderManagementAdapter = (
  client: LineClient,
): LineProviderManagementAdapter => ({
  listProviders: (query) =>
    Effect.runPromise(client.lineProviders.listProviders({ query: query ?? {} })),
  createProvider: (input) =>
    Effect.runPromise(client.lineProviders.createProvider({ payload: input })),
  updateProvider: (id, input) =>
    Effect.runPromise(
      decodeProviderId(id).pipe(
        Effect.flatMap((uid) =>
          client.lineProviders.updateProvider({ params: { id: uid }, payload: input }),
        ),
      ),
    ),
  deleteProvider: (id) =>
    Effect.runPromise(
      decodeProviderId(id).pipe(
        Effect.flatMap((uid) => client.lineProviders.deleteProvider({ params: { id: uid } })),
      ),
    ),

  listChannels: (query) =>
    Effect.runPromise(client.lineChannels.listChannels({ query: query ?? {} })),
  getChannel: (id) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineChannels.getChannel({ params: { id: channelId } }),
        ),
      ),
    ),
  createChannel: (input) =>
    Effect.runPromise(
      input.channelType === "messaging"
        ? client.lineChannels.createChannel({ payload: input })
        : client.lineChannels.createChannel({ payload: input }),
    ),
  updateChannel: (id, input) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineChannels.updateChannel({ params: { id: channelId }, payload: input }),
        ),
      ),
    ),
  deleteChannel: (id) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineChannels.deleteChannel({ params: { id: channelId } }),
        ),
      ),
    ),

  listLiffApps: (query) =>
    Effect.runPromise(client.lineLiffApps.listLiffApps({ query: query ?? {} })),
  getLiffApp: (id) =>
    Effect.runPromise(
      decodeLiffId(id).pipe(
        Effect.flatMap((liffId) => client.lineLiffApps.getLiffApp({ params: { id: liffId } })),
      ),
    ),
  createLiffApp: (input) =>
    Effect.runPromise(client.lineLiffApps.createLiffApp({ payload: input })),
  updateLiffApp: (id, input) =>
    Effect.runPromise(
      decodeLiffId(id).pipe(
        Effect.flatMap((liffId) =>
          client.lineLiffApps.updateLiffApp({ params: { id: liffId }, payload: input }),
        ),
      ),
    ),
  deleteLiffApp: (id) =>
    Effect.runPromise(
      decodeLiffId(id).pipe(
        Effect.flatMap((liffId) => client.lineLiffApps.deleteLiffApp({ params: { id: liffId } })),
      ),
    ),
});

//#endregion

//#region OpenAPI spec

/** OpenAPI specification generated from the LINE API definition. */
export const lineOpenApi = OpenApi.fromApi(LineApi);

//#endregion
