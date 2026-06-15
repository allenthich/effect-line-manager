import { Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LineAccountManagement } from "../account/management.ts";
import { LineChannelRecordId, LineProviderId } from "../account/domain.ts";
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

// ── Error Mapping Helpers ──────────────────────────────────────────────

const mapPersistenceError = (error: { operation: string }) =>
  Effect.fail(new LinePersistenceHttpError({ operation: error.operation as any }));

// ── Provider Handlers ──────────────────────────────────────────────────

const providerHandlers = HttpApiBuilder.group(LineApi, "lineProviders", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineAccountManagement;

    return handlers
      .handle("listProviders", () =>
        management.listProviders.pipe(
          Effect.catchTags({
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("getProvider", ({ params }) =>
        management.getProvider(params.id).pipe(
          Effect.catchTags({
            LineProviderNotFoundError: (error) =>
              Effect.fail(new ProviderNotFoundHttpError({ providerId: error.providerId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("createProvider", ({ payload }) =>
        management.createProvider(payload).pipe(
          Effect.catchTags({
            LineProviderDuplicateError: (error) =>
              Effect.fail(new ProviderDuplicateHttpError({ name: error.name })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateProvider", ({ params, payload }) =>
        management.updateProvider(params.id, payload).pipe(
          Effect.catchTags({
            LineProviderNotFoundError: (error) =>
              Effect.fail(new ProviderNotFoundHttpError({ providerId: error.providerId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteProvider", ({ params }) =>
        management.deleteProvider(params.id).pipe(
          Effect.catchTags({
            LineProviderNotFoundError: (error) =>
              Effect.fail(new ProviderNotFoundHttpError({ providerId: error.providerId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      );
  }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

// ── Channel Handlers ───────────────────────────────────────────────────

const channelHandlers = HttpApiBuilder.group(LineApi, "lineChannels", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineAccountManagement;

    return handlers
      .handle("listChannels", ({ query }) => {
        const providerId = query.providerId
          ? Schema.decodeUnknownSync(LineProviderId)(query.providerId)
          : undefined;
        return management.listChannels(providerId).pipe(
          Effect.catchTags({
            LineAccountPersistenceError: mapPersistenceError,
          }),
        );
      })
      .handle("getChannel", ({ params }) =>
        management.getChannel(params.id).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ recordId: error.recordId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("createChannel", ({ payload }) =>
        management.createChannel(payload).pipe(
          Effect.catchTags({
            ChannelDuplicateError: (error) =>
              Effect.fail(new ChannelDuplicateHttpError({ channelId: error.channelId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateChannel", ({ params, payload }) =>
        management.updateChannel(params.id, payload).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ recordId: error.recordId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteChannel", ({ params }) =>
        management.deleteChannel(params.id).pipe(
          Effect.catchTags({
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ recordId: error.recordId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      );
  }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

// ── LIFF App Handlers ──────────────────────────────────────────────────

const liffAppHandlers = HttpApiBuilder.group(LineApi, "lineLiffApps", (handlers) =>
  Effect.gen(function* () {
    const management = yield* LineAccountManagement;

    return handlers
      .handle("listLiffApps", ({ query }) => {
        const channelId = query.channelId
          ? Schema.decodeUnknownSync(LineChannelRecordId)(query.channelId)
          : undefined;
        return management.listLiffApps(channelId).pipe(
          Effect.catchTags({
            LineAccountPersistenceError: mapPersistenceError,
          }),
        );
      })
      .handle("getLiffApp", ({ params }) =>
        management.getLiffApp(params.id).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ recordId: error.recordId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("createLiffApp", ({ payload }) =>
        management.createLiffApp(payload).pipe(
          Effect.catchTags({
            LiffAppDuplicateError: (error) =>
              Effect.fail(new LiffAppDuplicateHttpError({ liffId: error.liffId })),
            ChannelNotFoundError: (error) =>
              Effect.fail(new ChannelNotFoundHttpError({ recordId: error.recordId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("updateLiffApp", ({ params, payload }) =>
        management.updateLiffApp(params.id, payload).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ recordId: error.recordId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      )
      .handle("deleteLiffApp", ({ params }) =>
        management.deleteLiffApp(params.id).pipe(
          Effect.catchTags({
            LiffAppNotFoundError: (error) =>
              Effect.fail(new LiffAppNotFoundHttpError({ recordId: error.recordId })),
            LineAccountPersistenceError: mapPersistenceError,
          }),
        ),
      );
  }),
).pipe(Layer.provide(LineValidationMiddlewareLayer));

// ── Top-level API layer ────────────────────────────────────────────────

export const LineApiLayer = HttpApiBuilder.layer(LineApi).pipe(
  Layer.provide(providerHandlers),
  Layer.provide(channelHandlers),
  Layer.provide(liffAppHandlers),
);

// ═══════════════════════════════════════════════════════════════════════
// DEPRECATED — old LineAccount handlers kept for backward compatibility
// ═══════════════════════════════════════════════════════════════════════

import {
  LineAccountDuplicateChannelHttpError,
  LineAccountNotFoundHttpError,
  LineAccountPersistenceHttpError,
  LineAccountValidationMiddlewareLayer,
} from "./errors.ts";
import { LineAccountManagementApi } from "./api.ts";

/** @deprecated Use {@link LineApiLayer} instead. */
export const LineAccountManagementHandlers = HttpApiBuilder.group(
  LineAccountManagementApi,
  "lineAccounts",
  (handlers) =>
    Effect.gen(function* () {
      const management = yield* LineAccountManagement;

      return handlers
        .handle("list", () =>
          management.list.pipe(
            Effect.catchTags({
              LineAccountPersistenceError: (error) =>
                Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
            }),
          ),
        )
        .handle("create", ({ payload }) =>
          management.create(payload).pipe(
            Effect.catchTags({
              LineAccountDuplicateChannelError: (error) =>
                Effect.fail(
                  new LineAccountDuplicateChannelHttpError({ channelId: error.channelId }),
                ),
              LineAccountPersistenceError: (error) =>
                Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
            }),
          ),
        )
        .handle("update", ({ params, payload }) =>
          management.update(params.id, payload).pipe(
            Effect.catchTags({
              LineAccountNotFoundError: (error) =>
                Effect.fail(new LineAccountNotFoundHttpError({ recordId: error.recordId })),
              LineAccountDuplicateChannelError: (error) =>
                Effect.fail(
                  new LineAccountDuplicateChannelHttpError({ channelId: error.channelId }),
                ),
              LineAccountPersistenceError: (error) =>
                Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
            }),
          ),
        )
        .handle("delete", ({ params }) =>
          management.delete(params.id).pipe(
            Effect.catchTags({
              LineAccountNotFoundError: (error) =>
                Effect.fail(new LineAccountNotFoundHttpError({ recordId: error.recordId })),
              LineAccountPersistenceError: (error) =>
                Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
            }),
          ),
        );
    }),
).pipe(Layer.provide(LineAccountValidationMiddlewareLayer));

/** @deprecated Use {@link LineApiLayer} instead. */
export const LineAccountManagementApiLayer = HttpApiBuilder.layer(LineAccountManagementApi).pipe(
  Layer.provide(LineAccountManagementHandlers),
);
