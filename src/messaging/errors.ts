import { Schema } from "effect";

/** Valid LINE messaging API operation identifiers. */
export const LineApiOperation = Schema.Literals([
  "pushMessage",
  "replyMessage",
  "getBotInfo",
  "multicastMessage",
  "narrowcastMessage",
]);

/** {@link LineApiOperation} type alias. */
export type LineApiOperation = typeof LineApiOperation.Type;

/** Error raised when a transport-level failure occurs during a LINE API HTTP request. */
export class LineApiTransportError extends Schema.TaggedErrorClass<LineApiTransportError>()(
  "LineApiTransportError",
  {
    operation: LineApiOperation,
    cause: Schema.Defect(),
  },
) {}

/** Error raised when a LINE API request exceeds the configured timeout. */
export class LineApiTimeoutError extends Schema.TaggedErrorClass<LineApiTimeoutError>()(
  "LineApiTimeoutError",
  {
    operation: LineApiOperation,
  },
) {}

const LineApiResponseFields = {
  operation: LineApiOperation,
  body: Schema.String,
  requestId: Schema.optional(Schema.String),
  acceptedRequestId: Schema.optional(Schema.String),
};

/** Error raised when the LINE API returns a 401 or 403 authentication failure. */
export class LineApiAuthenticationError extends Schema.TaggedErrorClass<LineApiAuthenticationError>()(
  "LineApiAuthenticationError",
  {
    ...LineApiResponseFields,
    status: Schema.Literals([401, 403]),
  },
) {}

/** Error raised when the LINE API returns a 429 rate-limit response. */
export class LineApiRateLimitError extends Schema.TaggedErrorClass<LineApiRateLimitError>()(
  "LineApiRateLimitError",
  {
    ...LineApiResponseFields,
    status: Schema.Literal(429),
    retryAfter: Schema.optional(Schema.String),
  },
) {}

/** Error raised when the LINE API returns an unexpected or unhandled HTTP status. */
export class LineApiResponseError extends Schema.TaggedErrorClass<LineApiResponseError>()(
  "LineApiResponseError",
  {
    ...LineApiResponseFields,
    status: Schema.Finite,
  },
) {}

/** Error raised when encoding a LINE API request body fails. */
export class LineRequestEncodingError extends Schema.TaggedErrorClass<LineRequestEncodingError>()(
  "LineRequestEncodingError",
  {
    operation: LineApiOperation,
    cause: Schema.Defect(),
  },
) {}

/** Error raised when the LINE webhook signature is missing, malformed, or does not match. */
export class LineSignatureError extends Schema.TaggedErrorClass<LineSignatureError>()(
  "LineSignatureError",
  {
    reason: Schema.Literals(["missing", "malformed", "mismatch"]),
  },
) {}
