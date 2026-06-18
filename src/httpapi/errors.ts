import { Effect, Schema } from "effect";
import { HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi";
import { LineRepositoryOperation } from "../shared/errors.ts";

//#region Validation Middleware

/** Error raised when request validation fails against the expected schema. */
export class LineValidationError extends Schema.TaggedErrorClass<LineValidationError>()(
  "LineValidationError",
  {
    message: Schema.String,
  },
  { httpApiStatus: 400 },
) {}

/** HTTP API middleware for LINE request schema validation. */
export class LineValidationMiddleware extends HttpApiMiddleware.Service<LineValidationMiddleware>()(
  "effect-line-manager/httpapi/LineValidationMiddleware",
  {
    error: LineValidationError.pipe(HttpApiSchema.status(400)),
  },
) {}

/** Layer that provides schema error transformation for the LINE validation middleware. */
export const LineValidationMiddlewareLayer = HttpApiMiddleware.layerSchemaErrorTransform(
  LineValidationMiddleware,
  () =>
    Effect.fail(
      new LineValidationError({
        message: "The request did not match the expected schema.",
      }),
    ),
);

//#endregion

//#region HTTP Error Classes

// Provider errors
/** HTTP 404 error raised when a provider is not found. */
export class ProviderNotFoundHttpError extends Schema.TaggedErrorClass<ProviderNotFoundHttpError>()(
  "ProviderNotFoundHttpError",
  {
    providerId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

/** HTTP 409 error raised when a provider with the same name already exists. */
export class ProviderDuplicateHttpError extends Schema.TaggedErrorClass<ProviderDuplicateHttpError>()(
  "ProviderDuplicateHttpError",
  {
    name: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

// Channel errors
/** HTTP 404 error raised when a channel is not found. */
export class ChannelNotFoundHttpError extends Schema.TaggedErrorClass<ChannelNotFoundHttpError>()(
  "ChannelNotFoundHttpError",
  {
    recordId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

/** HTTP 409 error raised when a channel with the same channel ID already exists. */
export class ChannelDuplicateHttpError extends Schema.TaggedErrorClass<ChannelDuplicateHttpError>()(
  "ChannelDuplicateHttpError",
  {
    channelId: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

// LIFF errors
/** HTTP 404 error raised when a LIFF app is not found. */
export class LiffAppNotFoundHttpError extends Schema.TaggedErrorClass<LiffAppNotFoundHttpError>()(
  "LiffAppNotFoundHttpError",
  {
    recordId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

/** HTTP 409 error raised when a LIFF app with the same LIFF ID already exists. */
export class LiffAppDuplicateHttpError extends Schema.TaggedErrorClass<LiffAppDuplicateHttpError>()(
  "LiffAppDuplicateHttpError",
  {
    liffId: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

// Persistence error (generic)
/** HTTP 500 error raised when a persistence operation fails. */
export class LinePersistenceHttpError extends Schema.TaggedErrorClass<LinePersistenceHttpError>()(
  "LinePersistenceHttpError",
  {
    operation: LineRepositoryOperation,
  },
  { httpApiStatus: 500 },
) {}

//#endregion
