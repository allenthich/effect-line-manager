import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LineAccountManagement } from "../account/management.ts";
import { LineAccountManagementApi } from "./api.ts";
import {
  LineAccountDuplicateChannelHttpError,
  LineAccountNotFoundHttpError,
  LineAccountPersistenceHttpError,
  LineAccountValidationMiddlewareLayer,
} from "./errors.ts";

export const LineAccountManagementHandlers = HttpApiBuilder.group(
  LineAccountManagementApi,
  "lineAccounts",
  (handlers) =>
    Effect.gen(function* () {
      const management = yield* LineAccountManagement;

      return handlers
        .handle("list", () =>
          management
            .list()
            .pipe(
              Effect.catchTag("LineAccountPersistenceError", (error) =>
                Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
              ),
            ),
        )
        .handle("create", ({ payload }) =>
          management.create(payload).pipe(
            Effect.catchTag("LineAccountDuplicateChannelError", (error) =>
              Effect.fail(new LineAccountDuplicateChannelHttpError({ channelId: error.channelId })),
            ),
            Effect.catchTag("LineAccountPersistenceError", (error) =>
              Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
            ),
          ),
        )
        .handle("update", ({ params, payload }) =>
          management.update(params.id, payload).pipe(
            Effect.catchTag("LineAccountNotFoundError", (error) =>
              Effect.fail(new LineAccountNotFoundHttpError({ recordId: error.recordId })),
            ),
            Effect.catchTag("LineAccountDuplicateChannelError", (error) =>
              Effect.fail(new LineAccountDuplicateChannelHttpError({ channelId: error.channelId })),
            ),
            Effect.catchTag("LineAccountPersistenceError", (error) =>
              Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
            ),
          ),
        )
        .handle("delete", ({ params }) =>
          management.delete(params.id).pipe(
            Effect.catchTag("LineAccountNotFoundError", (error) =>
              Effect.fail(new LineAccountNotFoundHttpError({ recordId: error.recordId })),
            ),
            Effect.catchTag("LineAccountPersistenceError", (error) =>
              Effect.fail(new LineAccountPersistenceHttpError({ operation: error.operation })),
            ),
          ),
        );
    }),
).pipe(Layer.provide(LineAccountValidationMiddlewareLayer));

export const LineAccountManagementApiLayer = HttpApiBuilder.layer(LineAccountManagementApi).pipe(
  Layer.provide(LineAccountManagementHandlers),
);
