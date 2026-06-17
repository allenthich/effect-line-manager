import { Effect, Schema } from "effect";
import { HttpApi, HttpApiClient, OpenApi } from "effect/unstable/httpapi";
import type { HttpClient } from "effect/unstable/http";
import { LineProviderId } from "../provider/domain.ts";
import { LineChannelRecordId } from "../channel/domain.ts";
import { LineLiffRecordId } from "../liff/domain.ts";
import { type LineProviderManagementAdapter } from "../adapter/types.ts";
import { LineApi } from "./api.ts";

// ── New API Client ────────────────────────────────────────────────────

type LineApiGroups = typeof LineApi extends HttpApi.HttpApi<string, infer Groups> ? Groups : never;

export type LineClient = HttpApiClient.Client<LineApiGroups>;

export interface LineClientOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined;
  readonly transformResponse?:
    | ((
        effect: Effect.Effect<unknown, unknown, unknown>,
      ) => Effect.Effect<unknown, unknown, unknown>)
    | undefined;
}

export const makeLineClient = (options?: LineClientOptions) => HttpApiClient.make(LineApi, options);

// ── New Adapter ───────────────────────────────────────────────────────

const decodeRecordId = Schema.decodeEffect(LineChannelRecordId);
const decodeProviderId = Schema.decodeEffect(LineProviderId);
const decodeLiffRecordId = Schema.decodeEffect(LineLiffRecordId);

export const makeLineProviderManagementAdapter = (
  client: LineClient,
): LineProviderManagementAdapter => ({
  listProviders: () => Effect.runPromise(client.lineProviders.listProviders()),
  createProvider: (input) =>
    Effect.runPromise(client.lineProviders.createProvider({ payload: input })),
  updateProvider: (id, input) =>
    Effect.runPromise(
      decodeProviderId(id).pipe(
        Effect.flatMap((recordId) =>
          client.lineProviders.updateProvider({ params: { id: recordId }, payload: input }),
        ),
      ),
    ),
  deleteProvider: (id) =>
    Effect.runPromise(
      decodeProviderId(id).pipe(
        Effect.flatMap((recordId) =>
          client.lineProviders.deleteProvider({ params: { id: recordId } }),
        ),
      ),
    ),

  listChannels: (providerId?) =>
    Effect.runPromise(
      providerId === undefined
        ? client.lineChannels.listChannels({ query: {} })
        : decodeProviderId(providerId).pipe(
            Effect.flatMap((decodedProviderId) =>
              client.lineChannels.listChannels({
                query: { providerId: decodedProviderId },
              }),
            ),
          ),
    ),
  getChannel: (id) =>
    Effect.runPromise(
      decodeRecordId(id).pipe(
        Effect.flatMap((recordId) => client.lineChannels.getChannel({ params: { id: recordId } })),
      ),
    ),
  createChannel: (input) =>
    Effect.runPromise(
      input.channelType === "messaging"
        ? client.lineChannels.createChannel({
            payload: {
              channelType: "messaging",
              providerId: input.providerId,
              name: input.name,
              channelId: input.channelId,
              channelSecret: input.channelSecret,
              channelAccessToken: input.channelAccessToken,
            },
          })
        : client.lineChannels.createChannel({
            payload: {
              channelType: "login",
              providerId: input.providerId,
              name: input.name,
              channelId: input.channelId,
              channelSecret: input.channelSecret,
            },
          }),
    ),
  updateChannel: (id, input) =>
    Effect.runPromise(
      decodeRecordId(id).pipe(
        Effect.flatMap((recordId) =>
          client.lineChannels.updateChannel({ params: { id: recordId }, payload: input }),
        ),
      ),
    ),
  deleteChannel: (id) =>
    Effect.runPromise(
      decodeRecordId(id).pipe(
        Effect.flatMap((recordId) =>
          client.lineChannels.deleteChannel({ params: { id: recordId } }),
        ),
      ),
    ),

  listLiffApps: (channelId?) =>
    Effect.runPromise(
      channelId === undefined
        ? client.lineLiffApps.listLiffApps({ query: {} })
        : decodeRecordId(channelId).pipe(
            Effect.flatMap((decodedChannelId) =>
              client.lineLiffApps.listLiffApps({
                query: { channelId: decodedChannelId },
              }),
            ),
          ),
    ),
  getLiffApp: (id) =>
    Effect.runPromise(
      decodeLiffRecordId(id).pipe(
        Effect.flatMap((recordId) => client.lineLiffApps.getLiffApp({ params: { id: recordId } })),
      ),
    ),
  createLiffApp: (input) =>
    Effect.runPromise(client.lineLiffApps.createLiffApp({ payload: input })),
  updateLiffApp: (id, input) =>
    Effect.runPromise(
      decodeLiffRecordId(id).pipe(
        Effect.flatMap((recordId) =>
          client.lineLiffApps.updateLiffApp({ params: { id: recordId }, payload: input }),
        ),
      ),
    ),
  deleteLiffApp: (id) =>
    Effect.runPromise(
      decodeLiffRecordId(id).pipe(
        Effect.flatMap((recordId) =>
          client.lineLiffApps.deleteLiffApp({ params: { id: recordId } }),
        ),
      ),
    ),
});

// ── OpenAPI spec ──────────────────────────────────────────────────────

export const lineOpenApi = OpenApi.fromApi(LineApi);
