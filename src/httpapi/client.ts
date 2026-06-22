import { Effect, Schema } from "effect";
import { HttpApi, HttpApiClient, OpenApi } from "effect/unstable/httpapi";
import type { HttpClient } from "effect/unstable/http";
import { LineProviderId } from "../provider/domain.ts";
import { LineChannelId } from "../shared/domain.ts";
import { LineLiffId } from "../liff/domain.ts";
import { type LineProviderManagementAdapter } from "../adapter/types.ts";
import type { ChannelListPage, ChannelView } from "../channels/management-domain.ts";
import type { UpdateChannelInput } from "../adapter/compat.ts";
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
 * Aggregate-specific channel methods (`listMessagingChannels`,
 * `createLoginChannel`, etc.) are the preferred surface.
 * `listChannels`/`getChannel`/`createChannel`/`updateChannel`/`deleteChannel`
 * remain as compatibility shims that combine messaging + login aggregates
 * for UIs that present a unified channel list.
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

  // Combined channel compatibility shims (deprecated).
  listChannels: async (query) => {
    const [messagingPage, loginPage] = await Promise.all([
      Effect.runPromise(client.lineMessagingChannels.listMessagingChannels({ query: query ?? {} })),
      Effect.runPromise(client.lineLoginChannels.listLoginChannels({ query: query ?? {} })),
    ]);
    const data: ChannelView[] = [...messagingPage.data, ...loginPage.data];
    return {
      data,
      pagination: messagingPage.pagination,
    } satisfies ChannelListPage;
  },
  getChannel: async (id) => {
    const channelId = Effect.runSync(decodeChannelId(id));
    try {
      return await Effect.runPromise(
        client.lineMessagingChannels.getMessagingChannel({ params: { id: channelId } }),
      );
    } catch {
      return await Effect.runPromise(
        client.lineLoginChannels.getLoginChannel({ params: { id: channelId } }),
      );
    }
  },
  createChannel: (input) =>
    input.channelType === "messaging"
      ? Effect.runPromise(
          client.lineMessagingChannels.createMessagingChannel({
            payload: {
              providerId: input.providerId,
              name: input.name,
              channelId: input.channelId,
              channelSecret: input.channelSecret,
              channelAccessToken: input.channelAccessToken,
              ...(input.botDisplayName === undefined
                ? {}
                : { botDisplayName: input.botDisplayName }),
              ...(input.botUserId === undefined ? {} : { botUserId: input.botUserId }),
              ...(input.botBasicId === undefined ? {} : { botBasicId: input.botBasicId }),
              ...(input.botPictureUrl === undefined ? {} : { botPictureUrl: input.botPictureUrl }),
              ...(input.addFriendUrl === undefined ? {} : { addFriendUrl: input.addFriendUrl }),
              ...(input.addFriendQrCodeUrl === undefined
                ? {}
                : { addFriendQrCodeUrl: input.addFriendQrCodeUrl }),
            },
          }),
        )
      : Effect.runPromise(
          client.lineLoginChannels.createLoginChannel({
            payload: {
              providerId: input.providerId,
              name: input.name,
              channelId: input.channelId,
              channelSecret: input.channelSecret,
            },
          }),
        ),
  updateChannel: async (id, input) => {
    const channelId = Effect.runSync(decodeChannelId(id));
    const payload: UpdateChannelInput = input;
    try {
      return await Effect.runPromise(
        client.lineMessagingChannels.updateMessagingChannel({
          params: { id: channelId },
          payload: payload as unknown as Parameters<
            typeof client.lineMessagingChannels.updateMessagingChannel
          >[0]["payload"],
        }),
      );
    } catch {
      return await Effect.runPromise(
        client.lineLoginChannels.updateLoginChannel({
          params: { id: channelId },
          payload: payload as unknown as Parameters<
            typeof client.lineLoginChannels.updateLoginChannel
          >[0]["payload"],
        }),
      );
    }
  },
  deleteChannel: async (id) => {
    const channelId = Effect.runSync(decodeChannelId(id));
    try {
      await Effect.runPromise(
        client.lineMessagingChannels.deleteMessagingChannel({ params: { id: channelId } }),
      );
    } catch {
      await Effect.runPromise(
        client.lineLoginChannels.deleteLoginChannel({ params: { id: channelId } }),
      );
    }
  },

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
