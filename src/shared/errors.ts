import { Schema } from "effect";

export const LineRepositoryOperation = Schema.Literals([
  // Providers
  "createProvider",
  "updateProvider",
  "findProviderById",
  "listProviders",
  "deleteProvider",
  // Channels
  "createChannel",
  "updateChannel",
  "findChannelById",
  "findChannelByMessagingId",
  "findChannelByBotUserId",
  "listChannelsByProvider",
  "deleteChannel",
  // LIFF Apps
  "createLiffApp",
  "updateLiffApp",
  "findLiffAppById",
  "listLiffAppsByChannel",
  "deleteLiffApp",
]);

export type LineRepositoryOperation = typeof LineRepositoryOperation.Type;

export class LineRepositoryError extends Schema.TaggedErrorClass<LineRepositoryError>()(
  "LineRepositoryError",
  {
    operation: LineRepositoryOperation,
    cause: Schema.Defect(),
  },
) {}

export class LineAccountPersistenceError extends Schema.TaggedErrorClass<LineAccountPersistenceError>()(
  "LineAccountPersistenceError",
  {
    operation: LineRepositoryOperation,
  },
) {}
