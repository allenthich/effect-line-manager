import { Schema } from "effect";
import { LineChannelRecordId } from "./domain.ts";

export const LineRepositoryOperation = Schema.Literals([
  "create",
  "update",
  "findById",
  "findByChannelId",
  "findByBotUserId",
  "listAll",
  "deleteById",
]);

export type LineRepositoryOperation = typeof LineRepositoryOperation.Type;

export class LineRepositoryError extends Schema.TaggedErrorClass<LineRepositoryError>()(
  "LineRepositoryError",
  {
    operation: LineRepositoryOperation,
    cause: Schema.Defect(),
  },
) {}

export class LineChannelNotFoundError extends Schema.TaggedErrorClass<LineChannelNotFoundError>()(
  "LineChannelNotFoundError",
  {
    recordId: LineChannelRecordId,
  },
) {}

export class LineLoginConfigMissingError extends Schema.TaggedErrorClass<LineLoginConfigMissingError>()(
  "LineLoginConfigMissingError",
  {
    recordId: LineChannelRecordId,
  },
) {}

export class LineLiffConfigMissingError extends Schema.TaggedErrorClass<LineLiffConfigMissingError>()(
  "LineLiffConfigMissingError",
  {
    recordId: LineChannelRecordId,
  },
) {}
