import { Schema } from "effect";
import { NonEmptyTrimmedString, Pagination } from "../shared/domain.ts";

/** Branded type for the LINE provider ID. */
export const LineProviderId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineProviderId"),
);
/** {@link LineProviderId} type alias. */
export type LineProviderId = typeof LineProviderId.Type;

/** Top-level grouping of LINE channels. */
export class LineProvider extends Schema.Class<LineProvider>("LineProvider")({
  id: LineProviderId,
  name: NonEmptyTrimmedString,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** Input type for creating a provider record in the repository layer. */
export class CreateProviderRecordInput extends Schema.Class<CreateProviderRecordInput>(
  "CreateProviderRecordInput",
)({
  name: NonEmptyTrimmedString,
}) {}

/** Input type for updating a provider record in the repository layer. */
export class UpdateProviderRecordInput extends Schema.Class<UpdateProviderRecordInput>(
  "UpdateProviderRecordInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
}) {}

/** Input type for creating a provider through the management service. */
export const CreateProviderInput = Schema.Struct({
  name: NonEmptyTrimmedString,
});
/** {@link CreateProviderInput} type alias. */
export type CreateProviderInput = typeof CreateProviderInput.Type;

/** Input type for updating a provider through the management service. */
export const UpdateProviderInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
});
/** {@link UpdateProviderInput} type alias. */
export type UpdateProviderInput = typeof UpdateProviderInput.Type;

/** Public-facing view of a LINE provider. */
export const ProviderView = Schema.Struct({
  id: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
/** {@link ProviderView} type alias. */
export type ProviderView = typeof ProviderView.Type;

/** Paginated list of provider views. */
export const ProviderListPage = Schema.Struct({
  data: Schema.Array(ProviderView),
  pagination: Pagination,
});
/** {@link ProviderListPage} type alias. */
export type ProviderListPage = typeof ProviderListPage.Type;
