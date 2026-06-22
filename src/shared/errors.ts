import { Schema } from "effect";

/** Union type of all repository operation names. */
export const LineRepositoryOperation = Schema.Literals([
  // Providers
  "createProvider",
  "updateProvider",
  "findProviderById",
  "listProviders",
  "deleteProvider",
  // Messaging channels
  "createMessagingChannel",
  "updateMessagingChannel",
  "findMessagingChannelByLineChannelId",
  "findMessagingChannelByBotUserId",
  "listMessagingChannelsByProvider",
  "deleteMessagingChannel",
  // Login channels
  "createLoginChannel",
  "updateLoginChannel",
  "findLoginChannelByLineChannelId",
  "listLoginChannelsByProvider",
  "deleteLoginChannel",
  // LIFF Apps
  "createLiffApp",
  "updateLiffApp",
  "findLiffAppByLiffId",
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

/** Error raised by higher-level services when a persistence operation fails. */
export class LinePersistenceError extends Schema.TaggedErrorClass<LinePersistenceError>()(
  "LinePersistenceError",
  {
    operation: LineRepositoryOperation,
  },
) {}
