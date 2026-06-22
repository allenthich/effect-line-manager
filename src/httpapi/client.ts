import { Effect, Schema } from "effect";
import { HttpApi, HttpApiClient, OpenApi } from "effect/unstable/httpapi";
import type { HttpClient } from "effect/unstable/http";
import { LineProviderId } from "../provider/domain.ts";
import { LineChannelId } from "../shared/domain.ts";
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

/**
 * Creates a provider management adapter backed by a LINE API client.
 *
 * The adapter exposes only aggregate-specific channel methods
 * (`listMessagingChannels`, `createLoginChannel`, etc.). There is no
 * combined "channel" facade; UIs that need both channel kinds should
 * call the per-aggregate methods explicitly.
 */
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

  // Aggregate-specific messaging channels (preferred surface).
  listMessagingChannels: (query) =>
    Effect.runPromise(client.lineMessagingChannels.listMessagingChannels({ query: query ?? {} })),
  getMessagingChannel: (id) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineMessagingChannels.getMessagingChannel({ params: { id: channelId } }),
        ),
      ),
    ),
  createMessagingChannel: (input) =>
    Effect.runPromise(client.lineMessagingChannels.createMessagingChannel({ payload: input })),
  updateMessagingChannel: (id, input) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineMessagingChannels.updateMessagingChannel({
            params: { id: channelId },
            payload: input,
          }),
        ),
      ),
    ),
  deleteMessagingChannel: (id) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineMessagingChannels.deleteMessagingChannel({ params: { id: channelId } }),
        ),
      ),
    ),

  // Aggregate-specific login channels (preferred surface).
  listLoginChannels: (query) =>
    Effect.runPromise(client.lineLoginChannels.listLoginChannels({ query: query ?? {} })),
  getLoginChannel: (id) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineLoginChannels.getLoginChannel({ params: { id: channelId } }),
        ),
      ),
    ),
  createLoginChannel: (input) =>
    Effect.runPromise(client.lineLoginChannels.createLoginChannel({ payload: input })),
  updateLoginChannel: (id, input) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineLoginChannels.updateLoginChannel({
            params: { id: channelId },
            payload: input,
          }),
        ),
      ),
    ),
  deleteLoginChannel: (id) =>
    Effect.runPromise(
      decodeChannelId(id).pipe(
        Effect.flatMap((channelId) =>
          client.lineLoginChannels.deleteLoginChannel({ params: { id: channelId } }),
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
