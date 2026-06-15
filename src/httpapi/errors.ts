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

// ═══════════════════════════════════════════════════════════════════════
// DEPRECATED — kept for backward compatibility until Task D complete.
// ═══════════════════════════════════════════════════════════════════════

/** @deprecated Use {@link LineValidationError} instead. */
export class LineAccountValidationError extends Schema.TaggedErrorClass<LineAccountValidationError>()(
  "LineAccountValidationError",
  {
    message: Schema.String,
  },
  { httpApiStatus: 400 },
) {}

/** @deprecated Use {@link ChannelNotFoundHttpError} instead. */
export class LineAccountNotFoundHttpError extends Schema.TaggedErrorClass<LineAccountNotFoundHttpError>()(
  "LineAccountNotFoundHttpError",
  {
    recordId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

/** @deprecated Use {@link ChannelDuplicateHttpError} instead. */
export class LineAccountDuplicateChannelHttpError extends Schema.TaggedErrorClass<LineAccountDuplicateChannelHttpError>()(
  "LineAccountDuplicateChannelHttpError",
  {
    channelId: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

/** @deprecated Use {@link LinePersistenceHttpError} instead. */
export class LineAccountPersistenceHttpError extends Schema.TaggedErrorClass<LineAccountPersistenceHttpError>()(
  "LineAccountPersistenceHttpError",
  {
    operation: LineRepositoryOperation,
  },
  { httpApiStatus: 500 },
) {}

/** @deprecated Use {@link LineValidationMiddleware} instead. */
export class LineAccountValidationMiddleware extends HttpApiMiddleware.Service<LineAccountValidationMiddleware>()(
  "effect-line-manager/httpapi/LineAccountValidationMiddleware",
  {
    error: LineAccountValidationError.pipe(HttpApiSchema.status(400)),
  },
) {}

/** @deprecated Use {@link LineValidationMiddlewareLayer} instead. */
export const LineAccountValidationMiddlewareLayer = HttpApiMiddleware.layerSchemaErrorTransform(
  LineAccountValidationMiddleware,
  () =>
    Effect.fail(
      new LineAccountValidationError({
        message: "The request did not match the expected schema.",
      }),
    ),
);
