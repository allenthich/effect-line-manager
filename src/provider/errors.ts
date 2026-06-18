import { Schema } from "effect";
import { LineProviderId } from "./domain.ts";

/** Error raised when a LINE provider is not found by its ID. */
export class LineProviderNotFoundError extends Schema.TaggedErrorClass<LineProviderNotFoundError>()(
  "LineProviderNotFoundError",
  {
    providerId: LineProviderId,
  },
) {}

/** Error raised when attempting to create a LINE provider with a duplicate name. */
export class LineProviderDuplicateError extends Schema.TaggedErrorClass<LineProviderDuplicateError>()(
  "LineProviderDuplicateError",
  {
    name: Schema.String,
  },
) {}
