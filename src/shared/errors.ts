import { Schema } from "effect";

/** Union type of all repository operation names. */
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

/** {@link LineRepositoryOperation} type alias. */
export type LineRepositoryOperation = typeof LineRepositoryOperation.Type;

/** Error raised when a repository operation fails, carrying the original cause. */
export class LineRepositoryError extends Schema.TaggedErrorClass<LineRepositoryError>()(
  "LineRepositoryError",
  {
    operation: LineRepositoryOperation,
    cause: Schema.Defect(),
  },
) {}

/** Error raised by the management layer when a persistence operation fails. */
export class LineAccountPersistenceError extends Schema.TaggedErrorClass<LineAccountPersistenceError>()(
  "LineAccountPersistenceError",
  {
    operation: LineRepositoryOperation,
  },
) {}
