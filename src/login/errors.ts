import { Schema } from "effect";

/** Valid LINE Login API operation identifiers. */
export const LineLoginOperation = Schema.Literals([
  "getAccessToken",
  "getProfile",
  "refreshAccessToken",
  "verifyIdToken",
]);

/** {@link LineLoginOperation} type alias. */
export type LineLoginOperation = typeof LineLoginOperation.Type;

/** Error raised when a transport-level failure occurs during a LINE Login API HTTP request. */
export class LineLoginApiTransportError extends Schema.TaggedErrorClass<LineLoginApiTransportError>()(
  "LineLoginApiTransportError",
  {
    operation: LineLoginOperation,
    cause: Schema.Defect(),
  },
) {}

/** Error raised when a LINE Login API request exceeds the configured timeout. */
export class LineLoginApiTimeoutError extends Schema.TaggedErrorClass<LineLoginApiTimeoutError>()(
  "LineLoginApiTimeoutError",
  {
    operation: LineLoginOperation,
  },
) {}

const LineLoginApiResponseFields = {
  operation: LineLoginOperation,
  body: Schema.String,
  requestId: Schema.optional(Schema.String),
};

/** Error raised when the LINE Login API returns a 401 or 403 authentication failure. */
export class LineLoginApiAuthenticationError extends Schema.TaggedErrorClass<LineLoginApiAuthenticationError>()(
  "LineLoginApiAuthenticationError",
  {
    ...LineLoginApiResponseFields,
    status: Schema.Literals([401, 403]),
  },
) {}

/** Error raised when the LINE Login API returns a 429 rate-limit response. */
export class LineLoginApiRateLimitError extends Schema.TaggedErrorClass<LineLoginApiRateLimitError>()(
  "LineLoginApiRateLimitError",
  {
    ...LineLoginApiResponseFields,
    status: Schema.Literal(429),
    retryAfter: Schema.optional(Schema.String),
  },
) {}

/** Error raised when the LINE Login API returns an unexpected or unhandled HTTP status. */
export class LineLoginApiResponseError extends Schema.TaggedErrorClass<LineLoginApiResponseError>()(
  "LineLoginApiResponseError",
  {
    ...LineLoginApiResponseFields,
    status: Schema.Finite,
  },
) {}

/** Error raised when encoding a LINE Login API request fails. */
export class LineLoginRequestEncodingError extends Schema.TaggedErrorClass<LineLoginRequestEncodingError>()(
  "LineLoginRequestEncodingError",
  {
    operation: LineLoginOperation,
    cause: Schema.Defect(),
  },
) {}
