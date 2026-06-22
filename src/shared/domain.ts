import { Schema } from "effect";

/** A non-empty, trimmed string schema. */
export const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());

/** A redacted LINE API credential (e.g., channel secret, access token). */
export const LineCredential = Schema.Redacted(NonEmptyTrimmedString);

/** Standard pagination metadata returned by list endpoints. */
export const Pagination = Schema.Struct({
  page: Schema.Int,
  pageSize: Schema.Int,
  totalItems: Schema.Int,
  totalPages: Schema.Int,
});
/** {@link Pagination} type alias. */
export type Pagination = typeof Pagination.Type;

/** Default page number when the caller omits `page` from a {@link PageQuery}. */
export const defaultPage = 1;

/** Default page size when the caller omits `pageSize` from a {@link PageQuery}. */
export const defaultPageSize = 20;

/**
 * Query parameters accepted by every list endpoint.
 *
 * Both fields are optional — the management service applies
 * {@link defaultPage} and {@link defaultPageSize} before forwarding
 * to the repository.
 */
export const PageQuery = Schema.Struct({
  page: Schema.optional(Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))),
  pageSize: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))),
});
/** {@link PageQuery} type alias. */
export type PageQuery = typeof PageQuery.Type;

/**
 * Page query with defaults resolved — every field is a non-optional integer.
 *
 * Repository contracts use this type so consumer implementations never
 * have to handle `undefined`.
 */
export const NormalizedPageQuery = Schema.Struct({
  page: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  pageSize: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 })),
});
/** {@link NormalizedPageQuery} type alias. */
export type NormalizedPageQuery = typeof NormalizedPageQuery.Type;

/**
 * Applies {@link defaultPage} and {@link defaultPageSize} to any
 * missing fields in a {@link PageQuery}.
 *
 * Called by management services before forwarding to repositories.
 */
export const normalizePageQuery = (query: PageQuery): NormalizedPageQuery => ({
  page: query.page ?? defaultPage,
  pageSize: query.pageSize ?? defaultPageSize,
});

/**
 * Plain paginated result envelope.
 *
 * Used as the return type of list repository methods.
 * The shape matches {@link Pagination} for `pagination` and a
 * readonly array for `data`.
 */
export interface PageResult<A> {
  readonly data: ReadonlyArray<A>;
  readonly pagination: Pagination;
}

/**
 * Slices an in-memory array into a {@link PageResult} according to
 * the given {@link NormalizedPageQuery}.
 *
 * Intended for test fakes, demo adapters, and in-memory repository
 * implementations. Production repositories should compute pagination
 * at the data source (e.g. SQL `LIMIT`/`OFFSET`).
 */
export const paginate = <A>(items: ReadonlyArray<A>, query: NormalizedPageQuery): PageResult<A> => {
  const { page, pageSize } = query;
  const totalItems = items.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    pagination: { page, pageSize, totalItems, totalPages },
  };
};
