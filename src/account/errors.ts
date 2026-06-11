import { Schema } from "effect";
import { LineChannelId, LineChannelRecordId } from "./domain.ts";

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

export class LineAccountDuplicateChannelError extends Schema.TaggedErrorClass<LineAccountDuplicateChannelError>()(
  "LineAccountDuplicateChannelError",
  {
    channelId: LineChannelId,
  },
) {}

export class LineAccountNotFoundError extends Schema.TaggedErrorClass<LineAccountNotFoundError>()(
  "LineAccountNotFoundError",
  {
    recordId: LineChannelRecordId,
  },
) {}

export class LineAccountPersistenceError extends Schema.TaggedErrorClass<LineAccountPersistenceError>()(
  "LineAccountPersistenceError",
  {
    operation: LineRepositoryOperation,
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
