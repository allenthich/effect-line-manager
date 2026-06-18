import { Schema } from "effect";

/** Valid LINE LIFF API operation identifiers. */
export const LineLiffOperation = Schema.Literals([
  "getLiffApps",
  "createLiffApp",
  "updateLiffApp",
  "deleteLiffApp",
]);

/** {@link LineLiffOperation} type alias. */
export type LineLiffOperation = typeof LineLiffOperation.Type;

/** Error raised when a transport-level failure occurs during a LINE LIFF API HTTP request. */
export class LineLiffApiTransportError extends Schema.TaggedErrorClass<LineLiffApiTransportError>()(
  "LineLiffApiTransportError",
  {
    operation: LineLiffOperation,
    cause: Schema.Defect(),
  },
) {}

/** Error raised when a LINE LIFF API request exceeds the configured timeout. */
export class LineLiffApiTimeoutError extends Schema.TaggedErrorClass<LineLiffApiTimeoutError>()(
  "LineLiffApiTimeoutError",
  {
    operation: LineLiffOperation,
  },
) {}

const LineLiffApiResponseFields = {
  operation: LineLiffOperation,
  body: Schema.String,
  requestId: Schema.optional(Schema.String),
};

/** Error raised when the LINE LIFF API returns a 401 or 403 authentication failure. */
export class LineLiffApiAuthenticationError extends Schema.TaggedErrorClass<LineLiffApiAuthenticationError>()(
  "LineLiffApiAuthenticationError",
  {
    ...LineLiffApiResponseFields,
    status: Schema.Literals([401, 403]),
  },
) {}

/** Error raised when the LINE LIFF API returns a 429 rate-limit response. */
export class LineLiffApiRateLimitError extends Schema.TaggedErrorClass<LineLiffApiRateLimitError>()(
  "LineLiffApiRateLimitError",
  {
    ...LineLiffApiResponseFields,
    status: Schema.Literal(429),
    retryAfter: Schema.optional(Schema.String),
  },
) {}

/** Error raised when the LINE LIFF API returns an unexpected or unhandled HTTP status. */
export class LineLiffApiResponseError extends Schema.TaggedErrorClass<LineLiffApiResponseError>()(
  "LineLiffApiResponseError",
  {
    ...LineLiffApiResponseFields,
    status: Schema.Finite,
  },
) {}

/** Error raised when encoding a LINE LIFF API request fails. */
export class LineLiffRequestEncodingError extends Schema.TaggedErrorClass<LineLiffRequestEncodingError>()(
  "LineLiffRequestEncodingError",
  {
    operation: LineLiffOperation,
    cause: Schema.Defect(),
  },
) {}
