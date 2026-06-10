import { Schema } from "effect";

const LineApiOperation = Schema.Literals(["pushMessage", "replyMessage"]);

export type LineApiOperation = typeof LineApiOperation.Type;

export class LineRepositoryError extends Schema.TaggedErrorClass<LineRepositoryError>()(
  "LineRepositoryError",
  {
    operation: Schema.String,
    causeDescription: Schema.optional(Schema.String),
  },
) {}

export class LineChannelNotFoundError extends Schema.TaggedErrorClass<LineChannelNotFoundError>()(
  "LineChannelNotFoundError",
  {
    channelId: Schema.String,
  },
) {}

export class LineApiTransportError extends Schema.TaggedErrorClass<LineApiTransportError>()(
  "LineApiTransportError",
  {
    operation: LineApiOperation,
    causeDescription: Schema.optional(Schema.String),
  },
) {}

export class LineApiResponseError extends Schema.TaggedErrorClass<LineApiResponseError>()(
  "LineApiResponseError",
  {
    operation: LineApiOperation,
    status: Schema.Number,
    body: Schema.String,
    requestId: Schema.optional(Schema.String),
    acceptedRequestId: Schema.optional(Schema.String),
  },
) {}

export class LineRequestEncodingError extends Schema.TaggedErrorClass<LineRequestEncodingError>()(
  "LineRequestEncodingError",
  {
    operation: LineApiOperation,
    causeDescription: Schema.optional(Schema.String),
  },
) {}

export class LineSignatureError extends Schema.TaggedErrorClass<LineSignatureError>()(
  "LineSignatureError",
  {
    reason: Schema.Literals(["missing", "malformed", "mismatch"]),
  },
) {}
