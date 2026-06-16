import { Schema } from "effect";
import { LineChannelRecordId } from "../channel/domain.ts";
import { NonEmptyTrimmedString, Pagination } from "../shared/domain.ts";

export const LineLiffId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLiffId"),
);
export type LineLiffId = typeof LineLiffId.Type;

export const LineLiffRecordId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLiffRecordId"),
);
export type LineLiffRecordId = typeof LineLiffRecordId.Type;

/** LIFF App — belongs to a Login Channel. */
export class LineLiffApp extends Schema.Class<LineLiffApp>("LineLiffApp")({
  id: LineLiffRecordId,
  loginChannelId: LineChannelRecordId,
  liffId: LineLiffId,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.optional(Schema.String),
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

export class CreateLiffAppRecordInput extends Schema.Class<CreateLiffAppRecordInput>(
  "CreateLiffAppRecordInput",
)({
  loginChannelId: LineChannelRecordId,
  liffId: LineLiffId,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.optional(Schema.String),
}) {}

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

export const CreateLiffAppInput = Schema.Struct({
  loginChannelId: NonEmptyTrimmedString,
  liffId: NonEmptyTrimmedString,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.optional(Schema.String),
});
export type CreateLiffAppInput = typeof CreateLiffAppInput.Type;

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
export type UpdateLiffAppInput = typeof UpdateLiffAppInput.Type;

export const LiffAppView = Schema.Struct({
  id: NonEmptyTrimmedString,
  loginChannelId: NonEmptyTrimmedString,
  liffId: NonEmptyTrimmedString,
  view: Schema.Struct({
    type: Schema.Literals(["compact", "tall", "full"]),
    url: Schema.String,
  }),
  description: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
export type LiffAppView = typeof LiffAppView.Type;

export const LiffAppListPage = Schema.Struct({
  data: Schema.Array(LiffAppView),
  pagination: Pagination,
});
export type LiffAppListPage = typeof LiffAppListPage.Type;
