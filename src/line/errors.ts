import { Schema } from "effect";
import { LineChannelId } from "./domain.ts";

export const LineApiOperation = Schema.Literals(["pushMessage", "replyMessage"]);

export type LineApiOperation = typeof LineApiOperation.Type;

export const LineRepositoryOperation = Schema.Literals([
  "create",
  "findByChannelId",
  "listAll",
  "deleteByChannelId",
]);

export type LineRepositoryOperation = typeof LineRepositoryOperation.Type;

export class LineRepositoryError extends Schema.TaggedErrorClass<LineRepositoryError>()(
  "LineRepositoryError",
  {
    operation: LineRepositoryOperation,
    cause: Schema.Defect(),
  },
) {}

export class LineChannelNotFoundError extends Schema.TaggedErrorClass<LineChannelNotFoundError>()(
  "LineChannelNotFoundError",
  {
    channelId: LineChannelId,
  },
) {}

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
    status: Schema.Number,
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
