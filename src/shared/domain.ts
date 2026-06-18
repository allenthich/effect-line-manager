import { Schema } from "effect";

/** A non-empty, trimmed string schema. */
export const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());

/** A redacted LINE API credential (e.g., channel secret, access token). */
export const LineCredential = Schema.Redacted(NonEmptyTrimmedString);

/** Standard pagination metadata. */
export const Pagination = Schema.Struct({
  page: Schema.Finite,
  pageSize: Schema.Finite,
  totalItems: Schema.Finite,
  totalPages: Schema.Finite,
});
