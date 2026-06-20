import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LineProviderManagement } from "../provider/service.ts";
import { LineChannelManagement } from "../channel/service.ts";
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

//#region Error Mapping Helpers

const mapPersistenceError = (error: { operation: string }) =>
  Effect.fail(new LinePersistenceHttpError({ operation: error.operation as any }));

//#endregion

//#region Provider Handlers

/** HTTP API handler implementations for the LINE providers group. */
export const providerHandlers = HttpApiBuilder.group(LineApi, "lineProviders", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineProviderManagement;

    return handlers
      .handle("listProviders", () =>
        management.listProviders.pipe(
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

//#region Channel Handlers

/** HTTP API handler implementations for the LINE channels group. */
export const channelHandlers = HttpApiBuilder.group(LineApi, "lineChannels", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineChannelManagement;

    return handlers
      .handle("listChannels", ({ query }) => {
        return management.listChannels(query.providerId).pipe(
          Effect.catchTags({
            LinePersistenceError: mapPersistenceError,
          }),
        );
      })
      .handle("getChannel", ({ params }) =>
        management.getChannel(params.id).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ uid: error.uid })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("createChannel", ({ payload }) =>
        management.createChannel(payload).pipe(
          Effect.catchTags({
            ChannelDuplicateError: (error) =>
              Effect.fail(new ChannelDuplicateHttpError({ channelId: error.channelId })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateChannel", ({ params, payload }) =>
        management.updateChannel(params.id, payload).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ uid: error.uid })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteChannel", ({ params }) =>
        management.deleteChannel(params.id).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ uid: error.uid })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      );
  }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

//#endregion

//#region LIFF App Handlers

/** HTTP API handler implementations for the LINE LIFF apps group. */
export const liffAppHandlers = HttpApiBuilder.group(LineApi, "lineLiffApps", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineLiffManagement;

    return handlers
      .handle("listLiffApps", ({ query }) => {
        return management.listLiffApps(query.channelId).pipe(
          Effect.catchTags({
            LinePersistenceError: mapPersistenceError,
          }),
        );
      })
      .handle("getLiffApp", ({ params }) =>
        management.getLiffApp(params.id).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ uid: error.uid })),
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
              Effect.fail(new ChannelNotFoundHttpError({ uid: error.uid })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateLiffApp", ({ params, payload }) =>
        management.updateLiffApp(params.id, payload).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ uid: error.uid })),
            LinePersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteLiffApp", ({ params }) =>
        management.deleteLiffApp(params.id).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ uid: error.uid })),
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
  Layer.provide(channelHandlers),
  Layer.provide(liffAppHandlers),
);

//#endregion
