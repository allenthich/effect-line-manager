import { Schema } from "effect";
import { LineLiffRecordId } from "./domain.ts";

export class LiffAppNotFoundError extends Schema.TaggedErrorClass<LiffAppNotFoundError>()(
  "LiffAppNotFoundError",
  {
    recordId: LineLiffRecordId,
  },
) {}

export class LiffAppDuplicateError extends Schema.TaggedErrorClass<LiffAppDuplicateError>()(
  "LiffAppDuplicateError",
  {
    liffId: Schema.String,
  },
) {}

/** Error raised when a LIFF client is requested but no OAuth access token is provided. */
export class LiffLoginConfigMissingError extends Schema.TaggedErrorClass<LiffLoginConfigMissingError>()(
  "LiffLoginConfigMissingError",
  {
    recordId: LineLiffRecordId,
  },
) {}
