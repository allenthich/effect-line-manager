import { Schema } from "effect";

export const LineLiffOperation = Schema.Literals([
  "getLiffApps",
  "createLiffApp",
  "updateLiffApp",
  "deleteLiffApp",
]);

export type LineLiffOperation = typeof LineLiffOperation.Type;

export class LineLiffApiTransportError extends Schema.TaggedErrorClass<LineLiffApiTransportError>()(
  "LineLiffApiTransportError",
  {
    operation: LineLiffOperation,
    cause: Schema.Defect(),
  },
) {}

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

export class LineLiffApiAuthenticationError extends Schema.TaggedErrorClass<LineLiffApiAuthenticationError>()(
  "LineLiffApiAuthenticationError",
  {
    ...LineLiffApiResponseFields,
    status: Schema.Literals([401, 403]),
  },
) {}

export class LineLiffApiRateLimitError extends Schema.TaggedErrorClass<LineLiffApiRateLimitError>()(
  "LineLiffApiRateLimitError",
  {
    ...LineLiffApiResponseFields,
    status: Schema.Literal(429),
    retryAfter: Schema.optional(Schema.String),
  },
) {}

export class LineLiffApiResponseError extends Schema.TaggedErrorClass<LineLiffApiResponseError>()(
  "LineLiffApiResponseError",
  {
    ...LineLiffApiResponseFields,
    status: Schema.Finite,
  },
) {}

export class LineLiffRequestEncodingError extends Schema.TaggedErrorClass<LineLiffRequestEncodingError>()(
  "LineLiffRequestEncodingError",
  {
    operation: LineLiffOperation,
    cause: Schema.Defect(),
  },
) {}
