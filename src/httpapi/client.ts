import { Effect, Schema } from "effect";
import { HttpApi, HttpApiClient, OpenApi } from "effect/unstable/httpapi";
import type { HttpClient } from "effect/unstable/http";
import { LineChannelRecordId, type LineAccountManagementAdapter } from "../account/domain.ts";
import { LineAccountManagementApi } from "./api.ts";

type LineAccountManagementApiGroups =
  typeof LineAccountManagementApi extends HttpApi.HttpApi<string, infer Groups> ? Groups : never;

export type LineAccountManagementClient = HttpApiClient.Client<LineAccountManagementApiGroups>;

export interface LineAccountManagementClientOptions {
  readonly baseUrl?: URL | string | undefined;
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined;
  readonly transformResponse?:
    | ((
        effect: Effect.Effect<unknown, unknown, unknown>,
      ) => Effect.Effect<unknown, unknown, unknown>)
    | undefined;
}

export const makeLineAccountManagementClient = (options?: LineAccountManagementClientOptions) =>
  HttpApiClient.make(LineAccountManagementApi, options);

const decodeRecordId = Schema.decodeEffect(LineChannelRecordId);

export const makeLineAccountManagementAdapter = (
  client: LineAccountManagementClient,
): LineAccountManagementAdapter => ({
  list: () => Effect.runPromise(client.lineAccounts.list()),
  create: (input) => Effect.runPromise(client.lineAccounts.create({ payload: input })),
  update: (id, input) =>
    Effect.runPromise(
      decodeRecordId(id).pipe(
        Effect.flatMap((recordId) =>
          client.lineAccounts.update({ params: { id: recordId }, payload: input }),
        ),
      ),
    ),
  delete: (id) =>
    Effect.runPromise(
      decodeRecordId(id).pipe(
        Effect.flatMap((recordId) => client.lineAccounts.delete({ params: { id: recordId } })),
      ),
    ),
});

export const lineAccountManagementOpenApi = OpenApi.fromApi(LineAccountManagementApi);
