import { Schema } from "effect";
import { LineLoginChannelId } from "../channel/domain.ts";
import { NonEmptyTrimmedString, Pagination } from "../shared/domain.ts";

/** Branded type for a LINE LIFF application ID. */
export const LineLiffId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLiffId"),
);
/** {@link LineLiffId} type alias. */
export type LineLiffId = typeof LineLiffId.Type;

/** Branded type for a LINE LIFF record ID (internal identifier). */
export const LineLiffUid = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLiffUid"),
);
/** {@link LineLiffUid} type alias. */
export type LineLiffUid = typeof LineLiffUid.Type;

/** LIFF App — belongs to a Login Channel. */
export class LineLiffApp extends Schema.Class<LineLiffApp>("LineLiffApp")({
  id: LineLiffUid,
  loginChannelId: LineLoginChannelId,
  liffId: LineLiffId,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.optional(Schema.String),
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** Input for creating a LIFF app record in the repository. */
export class CreateLiffAppRecordInput extends Schema.Class<CreateLiffAppRecordInput>(
  "CreateLiffAppRecordInput",
)({
  loginChannelId: LineLoginChannelId,
  liffId: LineLiffId,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.optional(Schema.String),
}) {}

/** Input for updating a LIFF app record in the repository. */
export class UpdateLiffAppRecordInput extends Schema.Class<UpdateLiffAppRecordInput>(
  "UpdateLiffAppRecordInput",
)({
  liffId: Schema.optional(LineLiffId),
  view: Schema.optional(
    Schema.Struct({
      type: Schema.Literals(["compact", "tall", "full"]),
      url: Schema.String,
    }),
  ),
  description: Schema.optional(Schema.String),
}) {}

/** Input schema for creating a LIFF app via the management API. */
export const CreateLiffAppInput = Schema.Struct({
  loginChannelId: LineLoginChannelId,
  liffId: NonEmptyTrimmedString,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.optional(Schema.String),
});
/** {@link CreateLiffAppInput} type alias. */
export type CreateLiffAppInput = typeof CreateLiffAppInput.Type;

/** Input schema for updating a LIFF app via the management API. */
export const UpdateLiffAppInput = Schema.Struct({
  liffId: Schema.optional(NonEmptyTrimmedString),
  view: Schema.optional(
    Schema.Struct({
      type: Schema.Literals(["compact", "tall", "full"]),
      url: Schema.String,
    }),
  ),
  description: Schema.optional(Schema.String),
});
/** {@link UpdateLiffAppInput} type alias. */
export type UpdateLiffAppInput = typeof UpdateLiffAppInput.Type;

/** Public view schema for a LIFF application. */
export const LiffAppView = Schema.Struct({
  id: NonEmptyTrimmedString,
  loginChannelId: LineLoginChannelId,
  liffId: NonEmptyTrimmedString,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
/** {@link LiffAppView} type alias. */
export type LiffAppView = typeof LiffAppView.Type;

/** Paginated list page of LIFF application views. */
export const LiffAppListPage = Schema.Struct({
  data: Schema.Array(LiffAppView),
  pagination: Pagination,
});
/** {@link LiffAppListPage} type alias. */
export type LiffAppListPage = typeof LiffAppListPage.Type;
