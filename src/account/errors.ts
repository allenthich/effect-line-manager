import { Schema } from "effect";
import { LineChannelId, LineChannelRecordId, LineLiffRecordId, LineProviderId } from "./domain.ts";

// ── Repository Operations ──────────────────────────────────────────────

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

// ── Base Repository Error ──────────────────────────────────────────────

export class LineRepositoryError extends Schema.TaggedErrorClass<LineRepositoryError>()(
  "LineRepositoryError",
  {
    operation: LineRepositoryOperation,
    cause: Schema.Defect(),
  },
) {}

// ── New Entity Errors ──────────────────────────────────────────────────

export class LineProviderNotFoundError extends Schema.TaggedErrorClass<LineProviderNotFoundError>()(
  "LineProviderNotFoundError",
  {
    providerId: LineProviderId,
  },
) {}

export class LineProviderDuplicateError extends Schema.TaggedErrorClass<LineProviderDuplicateError>()(
  "LineProviderDuplicateError",
  {
    name: Schema.String,
  },
) {}

export class ChannelNotFoundError extends Schema.TaggedErrorClass<ChannelNotFoundError>()(
  "ChannelNotFoundError",
  {
    recordId: LineChannelRecordId,
  },
) {}

export class ChannelDuplicateError extends Schema.TaggedErrorClass<ChannelDuplicateError>()(
  "ChannelDuplicateError",
  {
    channelId: LineChannelId,
  },
) {}

export class LiffAppNotFoundError extends Schema.TaggedErrorClass<LiffAppNotFoundError>()(
  "LiffAppNotFoundError",
  {
    recordId: LineLiffRecordId,
  },
) {}

export class LiffAppDuplicateError extends Schema.TaggedErrorClass<LiffAppDuplicateError>()(
  "LiffAppDuplicateError",
  {
    liffId: Schema.String,
  },
) {}

// ── Persistence Error (kept) ───────────────────────────────────────────

export class LineAccountPersistenceError extends Schema.TaggedErrorClass<LineAccountPersistenceError>()(
  "LineAccountPersistenceError",
  {
    operation: LineRepositoryOperation,
  },
) {}

/** Error raised when a LIFF client is requested but no OAuth access token is provided. */
export class LiffLoginConfigMissingError extends Schema.TaggedErrorClass<LiffLoginConfigMissingError>()(
  "LiffLoginConfigMissingError",
  {
    recordId: LineLiffRecordId,
  },
) {}
