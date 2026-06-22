import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LineProviderManagement } from "../provider/service.ts";
import {
  LineMessagingChannelManagement,
  LineLoginChannelManagement,
} from "../channels/management-service.ts";
import { LineLiffManagement } from "../liff/service.ts";
import { LineApi } from "./api.ts";
import {
  ChannelDuplicateHttpError,
  ChannelNotFoundHttpError,
  LiffAppDuplicateHttpError,
  LiffAppNotFoundHttpError,
  LinePersistenceHttpError,
  LineValidationMiddlewareLayer,
  ProviderDuplicateHttpError,
  ProviderNotFoundHttpError,
} from "./errors.ts";
import { LineRepositoryOperation } from "../shared/errors.ts";

//#region Error Mapping Helpers

const mapPersistenceError = (error: { operation: LineRepositoryOperation }) =>
  Effect.fail(new LinePersistenceHttpError({ operation: error.operation }));

//#endregion

//#region Provider Handlers

/** HTTP API handler implementations for the LINE providers group. */
export const providerHandlers = HttpApiBuilder.group(LineApi, "lineProviders", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineProviderManagement;

    return handlers
      .handle("listProviders", ({ query }) =>
        management.listProviders(query).pipe(
          Effect.catchTags({
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("getProvider", ({ params }) =>
        management.getProvider(params.id).pipe(
          Effect.catchTags({
            LineProviderNotFoundError: (error) =>
              Effect.fail(new ProviderNotFoundHttpError({ providerId: error.providerId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("createProvider", ({ payload }) =>
        management.createProvider(payload).pipe(
          Effect.catchTags({
            LineProviderDuplicateError: (error) =>
              Effect.fail(new ProviderDuplicateHttpError({ name: error.name })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateProvider", ({ params, payload }) =>
        management.updateProvider(params.id, payload).pipe(
          Effect.catchTags({
            LineProviderNotFoundError: (error) =>
              Effect.fail(new ProviderNotFoundHttpError({ providerId: error.providerId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteProvider", ({ params }) =>
        management.deleteProvider(params.id).pipe(
          Effect.catchTags({
            LineProviderNotFoundError: (error) =>
              Effect.fail(new ProviderNotFoundHttpError({ providerId: error.providerId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      );
  }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

//#endregion

//#region Messaging Channel Handlers

/** HTTP API handler implementations for the LINE messaging channels group. */
export const messagingChannelHandlers = HttpApiBuilder.group(
  LineApi,
  "lineMessagingChannels",
  (handlers) =>
    Effect.gen(function* () {
      const management = yield* LineMessagingChannelManagement;

      return handlers
        .handle("listMessagingChannels", ({ query }) =>
          management.listChannels(query).pipe(
            Effect.catchTags({
              LinePersistenceError: mapPersistenceError,
            }),
          ),
        )
        .handle("getMessagingChannel", ({ params }) =>
          management.getChannel(params.id).pipe(
            Effect.catchTags({
              ChannelNotFoundError: (error) =>
                Effect.fail(new ChannelNotFoundHttpError({ channelId: error.channelId })),
              LinePersistenceError: mapPersistenceError,
            }),
          ),
        )
        .handle("createMessagingChannel", ({ payload }) =>
          management.createChannel(payload).pipe(
            Effect.catchTags({
              ChannelDuplicateError: (error) =>
                Effect.fail(new ChannelDuplicateHttpError({ channelId: error.channelId })),
              LinePersistenceError: mapPersistenceError,
            }),
          ),
        )
        .handle("updateMessagingChannel", ({ params, payload }) =>
          management.updateChannel(params.id, payload).pipe(
            Effect.catchTags({
              ChannelNotFoundError: (error) =>
                Effect.fail(new ChannelNotFoundHttpError({ channelId: error.channelId })),
              LinePersistenceError: mapPersistenceError,
            }),
          ),
        )
        .handle("deleteMessagingChannel", ({ params }) =>
          management.deleteChannel(params.id).pipe(
            Effect.catchTags({
              ChannelNotFoundError: (error) =>
                Effect.fail(new ChannelNotFoundHttpError({ channelId: error.channelId })),
              LinePersistenceError: mapPersistenceError,
            }),
          ),
        );
    }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

//#endregion

//#region Login Channel Handlers

/** HTTP API handler implementations for the LINE login channels group. */
export const loginChannelHandlers = HttpApiBuilder.group(LineApi, "lineLoginChannels", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineLoginChannelManagement;

    return handlers
      .handle("listLoginChannels", ({ query }) =>
        management.listChannels(query).pipe(
          Effect.catchTags({
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("getLoginChannel", ({ params }) =>
        management.getChannel(params.id).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ channelId: error.channelId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("createLoginChannel", ({ payload }) =>
        management.createChannel(payload).pipe(
          Effect.catchTags({
            ChannelDuplicateError: (error) =>
              Effect.fail(new ChannelDuplicateHttpError({ channelId: error.channelId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateLoginChannel", ({ params, payload }) =>
        management.updateChannel(params.id, payload).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ channelId: error.channelId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteLoginChannel", ({ params }) =>
        management.deleteChannel(params.id).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ channelId: error.channelId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      );
  }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

//#endregion

/** HTTP API handler implementations for the LINE LIFF apps group. */
export const liffAppHandlers = HttpApiBuilder.group(LineApi, "lineLiffApps", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineLiffManagement;

    return handlers
      .handle("listLiffApps", ({ query }) =>
        management.listLiffApps(query).pipe(
          Effect.catchTags({
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("getLiffApp", ({ params }) =>
        management.getLiffApp(params.id).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ liffId: error.liffId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("createLiffApp", ({ payload }) =>
        management.createLiffApp(payload).pipe(
          Effect.catchTags({
            LiffAppDuplicateError: (error) =>
              Effect.fail(new LiffAppDuplicateHttpError({ liffId: error.liffId })),
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ channelId: error.channelId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateLiffApp", ({ params, payload }) =>
        management.updateLiffApp(params.id, payload).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ liffId: error.liffId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteLiffApp", ({ params }) =>
        management.deleteLiffApp(params.id).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ liffId: error.liffId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      );
  }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

//#endregion

//#region Top-level API layer

/** Top-level HTTP API layer aggregating all handler groups. */
export const LineApiLayer = HttpApiBuilder.layer(LineApi).pipe(
  Layer.provide(providerHandlers),
  Layer.provide(messagingChannelHandlers),
  Layer.provide(loginChannelHandlers),
  Layer.provide(liffAppHandlers),
);

//#endregion
