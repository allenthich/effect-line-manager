import { Schema } from "effect";

export const LineLoginOperation = Schema.Literals(["getAccessToken", "getProfile"]);

export type LineLoginOperation = typeof LineLoginOperation.Type;

export class LineLoginApiTransportError extends Schema.TaggedErrorClass<LineLoginApiTransportError>()(
  "LineLoginApiTransportError",
  {
    operation: LineLoginOperation,
    cause: Schema.Defect(),
  },
) {}

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

export class LineLoginApiAuthenticationError extends Schema.TaggedErrorClass<LineLoginApiAuthenticationError>()(
  "LineLoginApiAuthenticationError",
  {
    ...LineLoginApiResponseFields,
    status: Schema.Literals([401, 403]),
  },
) {}

export class LineLoginApiRateLimitError extends Schema.TaggedErrorClass<LineLoginApiRateLimitError>()(
  "LineLoginApiRateLimitError",
  {
    ...LineLoginApiResponseFields,
    status: Schema.Literal(429),
    retryAfter: Schema.optional(Schema.String),
  },
) {}

export class LineLoginApiResponseError extends Schema.TaggedErrorClass<LineLoginApiResponseError>()(
  "LineLoginApiResponseError",
  {
    ...LineLoginApiResponseFields,
    status: Schema.Number,
  },
) {}

export class LineLoginRequestEncodingError extends Schema.TaggedErrorClass<LineLoginRequestEncodingError>()(
  "LineLoginRequestEncodingError",
  {
    operation: LineLoginOperation,
    cause: Schema.Defect(),
  },
) {}
