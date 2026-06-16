import { Effect, Schema } from "effect";
import { HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi";
import { LineRepositoryOperation } from "../account/errors.ts";

// ── Validation Middleware ──────────────────────────────────────────────

export class LineValidationError extends Schema.TaggedErrorClass<LineValidationError>()(
  "LineValidationError",
  {
    message: Schema.String,
  },
  { httpApiStatus: 400 },
) {}

export class LineValidationMiddleware extends HttpApiMiddleware.Service<LineValidationMiddleware>()(
  "effect-line-manager/httpapi/LineValidationMiddleware",
  {
    error: LineValidationError.pipe(HttpApiSchema.status(400)),
  },
) {}

export const LineValidationMiddlewareLayer = HttpApiMiddleware.layerSchemaErrorTransform(
  LineValidationMiddleware,
  () =>
    Effect.fail(
      new LineValidationError({
        message: "The request did not match the expected schema.",
      }),
    ),
);

// ── HTTP Error Classes ─────────────────────────────────────────────────

// Provider errors
export class ProviderNotFoundHttpError extends Schema.TaggedErrorClass<ProviderNotFoundHttpError>()(
  "ProviderNotFoundHttpError",
  {
    providerId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

export class ProviderDuplicateHttpError extends Schema.TaggedErrorClass<ProviderDuplicateHttpError>()(
  "ProviderDuplicateHttpError",
  {
    name: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

// Channel errors
export class ChannelNotFoundHttpError extends Schema.TaggedErrorClass<ChannelNotFoundHttpError>()(
  "ChannelNotFoundHttpError",
  {
    recordId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

export class ChannelDuplicateHttpError extends Schema.TaggedErrorClass<ChannelDuplicateHttpError>()(
  "ChannelDuplicateHttpError",
  {
    channelId: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

// LIFF errors
export class LiffAppNotFoundHttpError extends Schema.TaggedErrorClass<LiffAppNotFoundHttpError>()(
  "LiffAppNotFoundHttpError",
  {
    recordId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

export class LiffAppDuplicateHttpError extends Schema.TaggedErrorClass<LiffAppDuplicateHttpError>()(
  "LiffAppDuplicateHttpError",
  {
    liffId: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

// Persistence error (generic)
export class LinePersistenceHttpError extends Schema.TaggedErrorClass<LinePersistenceHttpError>()(
  "LinePersistenceHttpError",
  {
    operation: LineRepositoryOperation,
  },
  { httpApiStatus: 500 },
) {}
