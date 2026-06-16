import { Context, type Effect, type Option } from "effect";
import type {
  CreateChannelRecordInput,
  CreateLineAccountRecordInput,
  CreateLiffAppRecordInput,
  CreateProviderRecordInput,
  LineAccount,
  LineChannel,
  LineChannelId,
  LineChannelRecordId,
  LineLiffApp,
  LineLiffRecordId,
  LineProvider,
  LineProviderId,
  UpdateChannelRecordInput,
  UpdateLineAccountRecordInput,
  UpdateLiffAppRecordInput,
  UpdateProviderRecordInput,
} from "./domain.ts";
import type {
  ChannelDuplicateError,
  ChannelNotFoundError,
  LineAccountDuplicateChannelError,
  LineAccountNotFoundError,
  LiffAppDuplicateError,
  LiffAppNotFoundError,
  LineProviderDuplicateError,
  LineProviderNotFoundError,
  LineRepositoryError,
} from "./errors.ts";

export class LineRepository extends Context.Service<
  LineRepository,
  {
    // ── Providers ──────────────────────────────────────────────
    readonly createProvider: (
      input: CreateProviderRecordInput,
    ) => Effect.Effect<LineProvider, LineProviderDuplicateError | LineRepositoryError>;

    readonly updateProvider: (
      id: LineProviderId,
      input: UpdateProviderRecordInput,
    ) => Effect.Effect<LineProvider, LineProviderNotFoundError | LineRepositoryError>;

    readonly findProviderById: (
      id: LineProviderId,
    ) => Effect.Effect<Option.Option<LineProvider>, LineRepositoryError>;

    readonly listProviders: Effect.Effect<ReadonlyArray<LineProvider>, LineRepositoryError>;

    readonly deleteProvider: (
      id: LineProviderId,
    ) => Effect.Effect<void, LineProviderNotFoundError | LineRepositoryError>;

    // ── Channels ───────────────────────────────────────────────
    readonly createChannel: (
      input: CreateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelDuplicateError | LineRepositoryError>;

    readonly updateChannel: (
      id: LineChannelRecordId,
      input: UpdateChannelRecordInput,
    ) => Effect.Effect<LineChannel, ChannelNotFoundError | LineRepositoryError>;

    readonly findChannelById: (
      id: LineChannelRecordId,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;

    readonly findChannelByMessagingId: (
      channelId: LineChannelId,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;

    readonly findChannelByBotUserId: (
      botUserId: string,
    ) => Effect.Effect<Option.Option<LineChannel>, LineRepositoryError>;

    readonly listChannelsByProvider: (
      providerId: LineProviderId,
    ) => Effect.Effect<ReadonlyArray<LineChannel>, LineRepositoryError>;

    readonly deleteChannel: (
      id: LineChannelRecordId,
    ) => Effect.Effect<void, ChannelNotFoundError | LineRepositoryError>;

    // ── LIFF Apps ──────────────────────────────────────────────
    readonly createLiffApp: (
      input: CreateLiffAppRecordInput,
    ) => Effect.Effect<LineLiffApp, LiffAppDuplicateError | LineRepositoryError>;

    readonly updateLiffApp: (
      id: LineLiffRecordId,
      input: UpdateLiffAppRecordInput,
    ) => Effect.Effect<LineLiffApp, LiffAppNotFoundError | LineRepositoryError>;

    readonly findLiffAppById: (
      id: LineLiffRecordId,
    ) => Effect.Effect<Option.Option<LineLiffApp>, LineRepositoryError>;

    readonly listLiffAppsByChannel: (
      channelId: LineChannelRecordId,
    ) => Effect.Effect<ReadonlyArray<LineLiffApp>, LineRepositoryError>;

    readonly deleteLiffApp: (
      id: LineLiffRecordId,
    ) => Effect.Effect<void, LiffAppNotFoundError | LineRepositoryError>;

    // ═══════════════════════════════════════════════════════════
    // DEPRECATED — flat LineAccount methods kept for backward
    // compatibility with management.ts and test files.
    // Remove once Task C (management) + Phase 2 tests are updated.
    // ═══════════════════════════════════════════════════════════

    /** @deprecated Use {@link createProvider}, {@link createChannel}, or {@link createLiffApp} instead. */
    readonly create: (
      input: CreateLineAccountRecordInput,
    ) => Effect.Effect<LineAccount, LineAccountDuplicateChannelError | LineRepositoryError>;

    /** @deprecated Use {@link updateProvider}, {@link updateChannel}, or {@link updateLiffApp} instead. */
    readonly update: (
      id: LineChannelRecordId,
      input: UpdateLineAccountRecordInput,
    ) => Effect.Effect<
      LineAccount,
      LineAccountNotFoundError | LineAccountDuplicateChannelError | LineRepositoryError
    >;

    /** @deprecated Use {@link findChannelById} instead. */
    readonly findById: (
      id: LineChannelRecordId,
    ) => Effect.Effect<Option.Option<LineAccount>, LineRepositoryError>;

    /** @deprecated Use {@link findChannelByMessagingId} instead. */
    readonly findByChannelId: (
      channelId: LineChannelId,
    ) => Effect.Effect<Option.Option<LineAccount>, LineRepositoryError>;

    /** @deprecated Use {@link findChannelByBotUserId} instead. */
    readonly findByBotUserId: (
      botUserId: string,
    ) => Effect.Effect<Option.Option<LineAccount>, LineRepositoryError>;

    /** @deprecated Use {@link listProviders}, {@link listChannelsByProvider}, or {@link listLiffAppsByChannel} instead. */
    readonly listAll: Effect.Effect<ReadonlyArray<LineAccount>, LineRepositoryError>;

    /** @deprecated Use {@link deleteChannel} instead. */
    readonly deleteById: (
      id: LineChannelRecordId,
    ) => Effect.Effect<void, LineAccountNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineRepository") {}

export type LineRepositoryService = LineRepository["Service"];
