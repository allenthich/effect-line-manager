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
  // Deprecated — kept for backward compatibility
  "create",
  "update",
  "findById",
  "findByChannelId",
  "findByBotUserId",
  "listAll",
  "deleteById",
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

// ═══════════════════════════════════════════════════════════════════════
// DEPRECATED — kept for backward compatibility until Task B/C/D update.
// Remove once all consumers are migrated.
// ═══════════════════════════════════════════════════════════════════════

/** @deprecated Use {@link ChannelDuplicateError} instead. */
export class LineAccountDuplicateChannelError extends Schema.TaggedErrorClass<LineAccountDuplicateChannelError>()(
  "LineAccountDuplicateChannelError",
  {
    channelId: LineChannelId,
  },
) {}

/** @deprecated Use {@link ChannelNotFoundError} instead. */
export class LineAccountNotFoundError extends Schema.TaggedErrorClass<LineAccountNotFoundError>()(
  "LineAccountNotFoundError",
  {
    recordId: LineChannelRecordId,
  },
) {}

/** @deprecated No direct replacement — Login Channel credentials are now managed within the LoginChannel entity. */
export class LineLoginConfigMissingError extends Schema.TaggedErrorClass<LineLoginConfigMissingError>()(
  "LineLoginConfigMissingError",
  {
    recordId: LineChannelRecordId,
  },
) {}

/** Error raised when a LIFF client is requested but no OAuth access token is provided. */
export class LiffLoginConfigMissingError extends Schema.TaggedErrorClass<LiffLoginConfigMissingError>()(
  "LiffLoginConfigMissingError",
  {
    recordId: LineLiffRecordId,
  },
) {}

/** @deprecated Use {@link LiffLoginConfigMissingError} instead. */
export class LineLiffConfigMissingError extends Schema.TaggedErrorClass<LineLiffConfigMissingError>()(
  "LineLiffConfigMissingError",
  {
    recordId: LineChannelRecordId,
  },
) {}

/** @deprecated Use {@link ChannelNotFoundError} instead. */
export class LineChannelNotFoundError extends Schema.TaggedErrorClass<LineChannelNotFoundError>()(
  "LineChannelNotFoundError",
  {
    recordId: LineChannelRecordId,
  },
) {}
