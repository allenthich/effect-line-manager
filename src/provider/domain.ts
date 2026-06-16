import { Schema } from "effect";
import { NonEmptyTrimmedString, Pagination } from "../shared/domain.ts";

export const LineProviderId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineProviderId"),
);
export type LineProviderId = typeof LineProviderId.Type;

/** Top-level grouping of LINE channels. */
export class LineProvider extends Schema.Class<LineProvider>("LineProvider")({
  id: LineProviderId,
  name: NonEmptyTrimmedString,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

export class CreateProviderRecordInput extends Schema.Class<CreateProviderRecordInput>(
  "CreateProviderRecordInput",
)({
  name: NonEmptyTrimmedString,
}) {}

export class UpdateProviderRecordInput extends Schema.Class<UpdateProviderRecordInput>(
  "UpdateProviderRecordInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
}) {}

export const CreateProviderInput = Schema.Struct({
  name: NonEmptyTrimmedString,
});
export type CreateProviderInput = typeof CreateProviderInput.Type;

export const UpdateProviderInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
});
export type UpdateProviderInput = typeof UpdateProviderInput.Type;

export const ProviderView = Schema.Struct({
  id: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
export type ProviderView = typeof ProviderView.Type;

export const ProviderListPage = Schema.Struct({
  data: Schema.Array(ProviderView),
  pagination: Pagination,
});
export type ProviderListPage = typeof ProviderListPage.Type;
