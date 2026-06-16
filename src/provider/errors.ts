import { Schema } from "effect";
import { LineProviderId } from "./domain.ts";

export class LineProviderNotFoundError extends Schema.TaggedErrorClass<LineProviderNotFoundError>()(
  "LineProviderNotFoundError",
  {
    providerId: LineProviderId,
  },
) {}

export class LineProviderDuplicateError extends Schema.TaggedErrorClass<LineProviderDuplicateError>()(
  "LineProviderDuplicateError",
  {
    name: Schema.String,
  },
) {}
