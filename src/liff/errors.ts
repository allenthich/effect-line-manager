import { Schema } from "effect";
import { LineLiffId } from "./domain.ts";

/** Error raised when a LIFF app is not found by LIFF ID. */
export class LiffAppNotFoundError extends Schema.TaggedErrorClass<LiffAppNotFoundError>()(
  "LiffAppNotFoundError",
  {
    liffId: LineLiffId,
  },
) {}

/** Error raised when attempting to create a LIFF app with a duplicate LIFF ID. */
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
    liffId: LineLiffId,
  },
) {}
