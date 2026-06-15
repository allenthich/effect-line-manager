import { Schema } from "effect";

// ── Primitives ────────────────────────────────────────────────────────

const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());

// ── Brand Ids (kept from original) ────────────────────────────────────

export const LineChannelRecordId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineChannelRecordId"),
);
export type LineChannelRecordId = typeof LineChannelRecordId.Type;

export const LineChannelId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineChannelId"),
);
export type LineChannelId = typeof LineChannelId.Type;

export const LineLoginChannelId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLoginChannelId"),
);
export type LineLoginChannelId = typeof LineLoginChannelId.Type;

export const LineLiffId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLiffId"),
);
export type LineLiffId = typeof LineLiffId.Type;

// ── New Brand Ids ─────────────────────────────────────────────────────

export const LineProviderId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineProviderId"),
);
export type LineProviderId = typeof LineProviderId.Type;

export const LineLiffRecordId = NonEmptyTrimmedString.pipe(
  Schema.brand("effect-line-manager/LineLiffRecordId"),
);
export type LineLiffRecordId = typeof LineLiffRecordId.Type;

// ── Credential wrapper ────────────────────────────────────────────────

const LineCredential = Schema.Redacted(NonEmptyTrimmedString);

// ── Domain Entities ───────────────────────────────────────────────────

/** Top-level grouping of LINE channels. */
export class LineProvider extends Schema.Class<LineProvider>("LineProvider")({
  id: LineProviderId,
  name: NonEmptyTrimmedString,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** Messaging API Channel (used for bot messaging). */
export class MessagingChannel extends Schema.Class<MessagingChannel>("MessagingChannel")({
  channelType: Schema.Literal("messaging"),
  id: LineChannelRecordId,
  providerId: LineProviderId,
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  // Auto-synced bot profile metadata
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  isActive: Schema.Boolean,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** LINE Login Channel (used for social login / OAuth). */
export class LoginChannel extends Schema.Class<LoginChannel>("LoginChannel")({
  channelType: Schema.Literal("login"),
  id: LineChannelRecordId,
  providerId: LineProviderId,
  name: NonEmptyTrimmedString,
  channelId: LineLoginChannelId,
  channelSecret: LineCredential,
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** Discriminated union of channel types. */
export const LineChannel = Schema.Union([MessagingChannel, LoginChannel]);
export type LineChannel = typeof LineChannel.Type;

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

// ── Repository-Level DTOs ─────────────────────────────────────────────

export class CreateProviderRecordInput extends Schema.Class<CreateProviderRecordInput>(
  "CreateProviderRecordInput",
)({
  name: NonEmptyTrimmedString,
}) {}

export class UpdateProviderRecordInput extends Schema.Class<UpdateProviderRecordInput>(
  "UpdateProviderRecordInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
}) {}

export const CreateChannelRecordInput = Schema.Union([
  Schema.Struct({
    channelType: Schema.Literal("messaging"),
    providerId: LineProviderId,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: LineCredential,
    channelAccessToken: LineCredential,
  }),
  Schema.Struct({
    channelType: Schema.Literal("login"),
    providerId: LineProviderId,
    name: NonEmptyTrimmedString,
    channelId: NonEmptyTrimmedString,
    channelSecret: LineCredential,
  }),
] as const);
export type CreateChannelRecordInput = typeof CreateChannelRecordInput.Type;

export class UpdateChannelRecordInput extends Schema.Class<UpdateChannelRecordInput>(
  "UpdateChannelRecordInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(LineCredential),
  channelAccessToken: Schema.optional(LineCredential),
  isActive: Schema.optional(Schema.Boolean),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
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

// ── API-Level DTOs (plain strings, not Redacted) ──────────────────────

export const CreateProviderInput = Schema.Struct({
  name: NonEmptyTrimmedString,
});
export type CreateProviderInput = typeof CreateProviderInput.Type;

export const UpdateProviderInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
});
export type UpdateProviderInput = typeof UpdateProviderInput.Type;

export const CreateChannelInput = Schema.Struct({
  channelType: Schema.Literals(["messaging", "login"]),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
  channelAccessToken: Schema.optional(NonEmptyTrimmedString),
});
export type CreateChannelInput = typeof CreateChannelInput.Type;

export const UpdateChannelInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
  channelAccessToken: Schema.optional(NonEmptyTrimmedString),
  isActive: Schema.optional(Schema.Boolean),
});
export type UpdateChannelInput = typeof UpdateChannelInput.Type;

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

// ── View Types (stripped of secrets, safe for public API) ─────────────

export const ProviderView = Schema.Struct({
  id: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});
export type ProviderView = typeof ProviderView.Type;

// Channel views: discriminated by channelType for both variants.
export const MessagingChannelView = Schema.Struct({
  id: NonEmptyTrimmedString,
  channelType: Schema.Literal("messaging"),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  botUserId: Schema.NullOr(NonEmptyTrimmedString),
  basicId: Schema.NullOr(NonEmptyTrimmedString),
  displayName: Schema.NullOr(Schema.String),
  pictureUrl: Schema.NullOr(Schema.String),
  isActive: Schema.Boolean,
  hasChannelSecret: Schema.Boolean,
  hasChannelAccessToken: Schema.Boolean,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});

export const LoginChannelView = Schema.Struct({
  id: NonEmptyTrimmedString,
  channelType: Schema.Literal("login"),
  providerId: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  hasChannelSecret: Schema.Boolean,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});

export const ChannelView = Schema.Union([MessagingChannelView, LoginChannelView]);
export type ChannelView = typeof ChannelView.Type;

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

// ── List Pages ────────────────────────────────────────────────────────

const Pagination = Schema.Struct({
  page: Schema.Finite,
  pageSize: Schema.Finite,
  totalItems: Schema.Finite,
  totalPages: Schema.Finite,
});

export const ProviderListPage = Schema.Struct({
  data: Schema.Array(ProviderView),
  pagination: Pagination,
});
export type ProviderListPage = typeof ProviderListPage.Type;

export const ChannelListPage = Schema.Struct({
  data: Schema.Array(ChannelView),
  pagination: Pagination,
});
export type ChannelListPage = typeof ChannelListPage.Type;

export const LiffAppListPage = Schema.Struct({
  data: Schema.Array(LiffAppView),
  pagination: Pagination,
});
export type LiffAppListPage = typeof LiffAppListPage.Type;

// ── Management Adapter (backward-compatible shim) ─────────────────────

/** @deprecated Use {@link LineProviderManagementAdapter} or the individual per-entity adapters instead. Retained for web component backward compatibility. */
export interface LineAccountManagementAdapter {
  readonly list: () => Promise<LineAccountListPage>;
  readonly create: (input: CreateLineAccountInput) => Promise<LineAccountView>;
  readonly update: (id: string, input: UpdateLineAccountInput) => Promise<LineAccountView>;
  readonly delete: (id: string) => Promise<void>;
}

/** New hierarchical management adapter — to be used by Task C/D. */
export interface LineProviderManagementAdapter {
  readonly listProviders: () => Promise<ProviderListPage>;
  readonly createProvider: (input: CreateProviderInput) => Promise<ProviderView>;
  readonly updateProvider: (id: string, input: UpdateProviderInput) => Promise<ProviderView>;
  readonly deleteProvider: (id: string) => Promise<void>;
  readonly listChannels: (providerId?: string) => Promise<ChannelListPage>;
  readonly getChannel: (id: string) => Promise<ChannelView>;
  readonly createChannel: (input: CreateChannelInput) => Promise<ChannelView>;
  readonly updateChannel: (id: string, input: UpdateChannelInput) => Promise<ChannelView>;
  readonly deleteChannel: (id: string) => Promise<void>;
  readonly listLiffApps: (channelId?: string) => Promise<LiffAppListPage>;
  readonly getLiffApp: (id: string) => Promise<LiffAppView>;
  readonly createLiffApp: (input: CreateLiffAppInput) => Promise<LiffAppView>;
  readonly updateLiffApp: (id: string, input: UpdateLiffAppInput) => Promise<LiffAppView>;
  readonly deleteLiffApp: (id: string) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════
// DEPRECATED — kept for backward compatibility until Task B/C/D update
// their imports. Remove once all consumers are migrated.
// ═══════════════════════════════════════════════════════════════════════

/** @deprecated Use {@link LineProvider}, {@link MessagingChannel}, {@link LoginChannel}, and {@link LineLiffApp} instead. */
export class LineAccount extends Schema.Class<LineAccount>("LineAccount")({
  id: LineChannelRecordId,
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
  isActive: Schema.Boolean,
  loginChannelId: Schema.NullOr(LineLoginChannelId),
  loginChannelSecret: Schema.NullOr(LineCredential),
  liffId: Schema.NullOr(LineLiffId),
  createdAt: Schema.DateValid,
  updatedAt: Schema.DateValid,
}) {}

/** @deprecated Use {@link CreateProviderRecordInput}, {@link CreateChannelRecordInput}, and {@link CreateLiffAppRecordInput} instead. */
export class CreateLineAccountRecordInput extends Schema.Class<CreateLineAccountRecordInput>(
  "CreateLineAccountRecordInput",
)({
  name: NonEmptyTrimmedString,
  channelId: LineChannelId,
  channelSecret: LineCredential,
  channelAccessToken: LineCredential,
  loginChannelId: Schema.NullOr(LineLoginChannelId),
  loginChannelSecret: Schema.NullOr(LineCredential),
  liffId: Schema.NullOr(LineLiffId),
}) {}

/** @deprecated Use {@link UpdateProviderRecordInput}, {@link UpdateChannelRecordInput}, and {@link UpdateLiffAppRecordInput} instead. */
export class UpdateLineAccountRecordInput extends Schema.Class<UpdateLineAccountRecordInput>(
  "UpdateLineAccountRecordInput",
)({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(LineChannelId),
  channelSecret: Schema.optional(LineCredential),
  channelAccessToken: Schema.optional(LineCredential),
  loginChannelId: Schema.optional(Schema.NullOr(LineLoginChannelId)),
  loginChannelSecret: Schema.optional(Schema.NullOr(LineCredential)),
  liffId: Schema.optional(Schema.NullOr(LineLiffId)),
  isActive: Schema.optional(Schema.Boolean),
  botUserId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  basicId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  pictureUrl: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

/** @deprecated Use {@link ProviderView}, {@link ChannelView}, and {@link LiffAppView} instead. */
export const LineAccountView = Schema.Struct({
  id: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  botUserId: Schema.NullOr(NonEmptyTrimmedString),
  basicId: Schema.NullOr(NonEmptyTrimmedString),
  displayName: Schema.NullOr(Schema.String),
  pictureUrl: Schema.NullOr(Schema.String),
  isActive: Schema.Boolean,
  loginChannelId: Schema.NullOr(NonEmptyTrimmedString),
  liffId: Schema.NullOr(NonEmptyTrimmedString),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
  hasChannelSecret: Schema.Boolean,
  hasChannelAccessToken: Schema.Boolean,
  hasLoginChannelSecret: Schema.Boolean,
});
export type LineAccountView = typeof LineAccountView.Type;

/** @deprecated Use {@link ProviderListPage}, {@link ChannelListPage}, and {@link LiffAppListPage} instead. */
export const LineAccountListPage = Schema.Struct({
  data: Schema.Array(LineAccountView),
  pagination: Schema.Struct({
    page: Schema.Finite,
    pageSize: Schema.Finite,
    totalItems: Schema.Finite,
    totalPages: Schema.Finite,
  }),
});
export type LineAccountListPage = typeof LineAccountListPage.Type;

/** @deprecated Use {@link CreateProviderInput}, {@link CreateChannelInput}, and {@link CreateLiffAppInput} instead. */
export const CreateLineAccountInput = Schema.Struct({
  name: NonEmptyTrimmedString,
  channelId: NonEmptyTrimmedString,
  channelSecret: NonEmptyTrimmedString,
  channelAccessToken: NonEmptyTrimmedString,
  loginChannelId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  loginChannelSecret: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  liffId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
});
export type CreateLineAccountInput = typeof CreateLineAccountInput.Type;

/** @deprecated Use {@link UpdateProviderInput}, {@link UpdateChannelInput}, and {@link UpdateLiffAppInput} instead. */
export const UpdateLineAccountInput = Schema.Struct({
  name: Schema.optional(NonEmptyTrimmedString),
  channelId: Schema.optional(NonEmptyTrimmedString),
  channelSecret: Schema.optional(NonEmptyTrimmedString),
  channelAccessToken: Schema.optional(NonEmptyTrimmedString),
  loginChannelId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  loginChannelSecret: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  liffId: Schema.optional(Schema.NullOr(NonEmptyTrimmedString)),
  isActive: Schema.optional(Schema.Boolean),
});
export type UpdateLineAccountInput = typeof UpdateLineAccountInput.Type;
