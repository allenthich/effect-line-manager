import { Schema } from "effect";

export const LineApiOperation = Schema.Literals([
  "pushMessage",
  "replyMessage",
  "getBotInfo",
  "multicastMessage",
  "narrowcastMessage",
]);

export type LineApiOperation = typeof LineApiOperation.Type;

export class LineApiTransportError extends Schema.TaggedErrorClass<LineApiTransportError>()(
  "LineApiTransportError",
  {
    operation: LineApiOperation,
    cause: Schema.Defect(),
  },
) {}

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

export class LineApiAuthenticationError extends Schema.TaggedErrorClass<LineApiAuthenticationError>()(
  "LineApiAuthenticationError",
  {
    ...LineApiResponseFields,
    status: Schema.Literals([401, 403]),
  },
) {}

export class LineApiRateLimitError extends Schema.TaggedErrorClass<LineApiRateLimitError>()(
  "LineApiRateLimitError",
  {
    ...LineApiResponseFields,
    status: Schema.Literal(429),
    retryAfter: Schema.optional(Schema.String),
  },
) {}

export class LineApiResponseError extends Schema.TaggedErrorClass<LineApiResponseError>()(
  "LineApiResponseError",
  {
    ...LineApiResponseFields,
    status: Schema.Finite,
  },
) {}

export class LineRequestEncodingError extends Schema.TaggedErrorClass<LineRequestEncodingError>()(
  "LineRequestEncodingError",
  {
    operation: LineApiOperation,
    cause: Schema.Defect(),
  },
) {}

export class LineSignatureError extends Schema.TaggedErrorClass<LineSignatureError>()(
  "LineSignatureError",
  {
    reason: Schema.Literals(["missing", "malformed", "mismatch"]),
  },
) {}
