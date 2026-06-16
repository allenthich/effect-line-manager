import { Schema } from "effect";

export const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());

export const LineCredential = Schema.Redacted(NonEmptyTrimmedString);

export const Pagination = Schema.Struct({
  page: Schema.Finite,
  pageSize: Schema.Finite,
  totalItems: Schema.Finite,
  totalPages: Schema.Finite,
});
