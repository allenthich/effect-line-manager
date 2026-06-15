# Integration Guide: Database Schema & Repository Mapping

Since `effect-line-manager` is a headless, storage-agnostic library, host applications must own their database schemas, manage relationships, and implement the `LineRepository` interface.

This guide covers the new **Provider → Channel → LIFF App** domain model introduced in v2. If you're upgrading from the old flat `LineAccount` model, see the [Migration Guide](#6-migrating-from-lineaccount-v1) below.

---

## 1. Domain Model Overview

The library now models LINE configuration as a three-level hierarchy:

```
LineProvider (top-level grouping)
    └─ hasMany → LineChannel (tagged union: "messaging" | "login")
           ├─ MessagingChannel: LINE Messaging API bots (has channelAccessToken)
           └─ LoginChannel: LINE Login / social OAuth (no access token)
                  └─ hasMany → LineLiffApp (LIFF web apps)
```

**Key types** (from `effect-line-manager` / `src/account/domain.ts`):

| Type               | Description                                                                        |
| ------------------ | ---------------------------------------------------------------------------------- |
| `LineProvider`     | Top-level grouping (id, name, timestamps)                                          |
| `MessagingChannel` | Bot channel: `channelId`, `channelSecret`, `channelAccessToken`, `botUserId`, etc. |
| `LoginChannel`     | Login/OAuth channel: `channelId`, `channelSecret`                                  |
| `LineLiffApp`      | LIFF app: `liffId`, `view` (type + URL), parent `loginChannelId`                   |
| `LineChannel`      | Discriminated union of `MessagingChannel \| LoginChannel`                          |

**Brand IDs**: `LineProviderId`, `LineChannelRecordId`, `LineChannelId`, `LineLoginChannelId`, `LineLiffId`, `LineLiffRecordId`

**View types** (safe for public APIs — no credentials):

- `ProviderView`, `ChannelView` (discriminated: `MessagingChannelView \| LoginChannelView`), `LiffAppView`
- `ProviderListPage`, `ChannelListPage`, `LiffAppListPage`

---

## 2. Database Schema Design (SQL & ORMs)

Your database should store the three entities in separate tables with proper foreign keys.

Below are schema examples using two popular TypeScript ORMs: **Drizzle ORM** and **Prisma**. For applications using **Sequelize ORM** with MySQL, check out the dedicated [Sequelize Integration Guide](./integration-sequelize.md).

### Option A: Drizzle ORM (Relational approach)

```typescript
import { pgTable, varchar, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

// 1. LINE Provider table
export const lineProviders = pgTable("line_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. LINE Channel table (stores both messaging and login channels)
export const lineChannels = pgTable("line_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id")
    .references(() => lineProviders.id, { onDelete: "cascade" })
    .notNull(),
  channelType: varchar("channel_type", { length: 16 }).notNull(), // "messaging" | "login"
  name: varchar("name", { length: 255 }).notNull(),
  channelId: varchar("channel_id", { length: 255 }).notNull().unique(),

  // Encrypted credentials
  channelSecretEncrypted: text("channel_secret_encrypted").notNull(),
  channelAccessTokenEncrypted: text("channel_access_token_encrypted"), // NULL for login channels

  // Bot profile metadata (messaging channels only, auto-synced)
  botUserId: varchar("bot_user_id", { length: 255 }),
  basicId: varchar("basic_id", { length: 255 }),
  displayName: varchar("display_name", { length: 255 }),
  pictureUrl: varchar("picture_url", { length: 512 }),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. LIFF App table (belongs to a login-type channel)
export const lineLiffApps = pgTable("line_liff_apps", {
  id: uuid("id").defaultRandom().primaryKey(),
  loginChannelId: uuid("login_channel_id")
    .references(() => lineChannels.id, { onDelete: "cascade" })
    .notNull(),
  liffId: varchar("liff_id", { length: 255 }).notNull().unique(),
  viewType: varchar("view_type", { length: 16 }).notNull(), // "compact" | "tall" | "full"
  viewUrl: varchar("view_url", { length: 2048 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Option B: Prisma Schema

```prisma
model LineProvider {
  id        String        @id @default(uuid())
  name      String
  channels  LineChannel[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}

model LineChannel {
  id                          String        @id @default(uuid())
  providerId                  String
  provider                    LineProvider  @relation(fields: [providerId], references: [id], onDelete: Cascade)
  channelType                 String        // "messaging" | "login"
  name                        String
  channelId                   String        @unique
  channelSecretEncrypted      String
  channelAccessTokenEncrypted String?       // NULL for login channels
  botUserId                   String?
  basicId                     String?
  displayName                 String?
  pictureUrl                  String?
  isActive                    Boolean       @default(true)
  liffApps                    LineLiffApp[]
  createdAt                   DateTime      @default(now())
  updatedAt                   DateTime      @updatedAt
}

model LineLiffApp {
  id              String       @id @default(uuid())
  loginChannelId  String
  loginChannel    LineChannel  @relation(fields: [loginChannelId], references: [id], onDelete: Cascade)
  liffId          String       @unique
  viewType        String       // "compact" | "tall" | "full"
  viewUrl         String
  description     String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

---

## 3. Security Best Practice: Encryption at Rest

Because LINE channel secrets and access tokens have administrative access, **never store them in plain text** in your database.

1. **Symmetric Encryption**: Use a fast, secure encryption algorithm like `AES-256-GCM` with an encryption key loaded from your host application's environment variables (`process.env.ENCRYPTION_KEY`).
2. **Encrypted columns**: Encrypt `channelSecret`, `channelAccessToken` before executing SQL `INSERT` or `UPDATE` statements, and decrypt them on retrieval before passing them to the library.

---

## 4. Implementing the `LineRepository`

The host application must implement the [LineRepository](../src/account/repository.ts) interface using `Effect` blocks and mapping database errors to the appropriate error types from [errors.ts](../src/account/errors.ts).

The repository interface now has **16 entity-specific methods** organized by domain entity:

| Entity    | Methods                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Providers | `createProvider`, `updateProvider`, `findProviderById`, `listProviders`, `deleteProvider`                                                            |
| Channels  | `createChannel`, `updateChannel`, `findChannelById`, `findChannelByMessagingId`, `findChannelByBotUserId`, `listChannelsByProvider`, `deleteChannel` |
| LIFF Apps | `createLiffApp`, `updateLiffApp`, `findLiffAppById`, `listLiffAppsByChannel`, `deleteLiffApp`                                                        |

Error types: `LineProviderDuplicateError`, `LineProviderNotFoundError`, `ChannelDuplicateError`, `ChannelNotFoundError`, `LiffAppDuplicateError`, `LiffAppNotFoundError`, `LineRepositoryError`.

Here is a template implementation using **Prisma** and **Effect**:

```typescript
import { Effect, Option, Redacted, Layer } from "effect";
import {
  LineRepository,
  LineProvider,
  MessagingChannel,
  LoginChannel,
  LineLiffApp,
  LineProviderDuplicateError,
  LineProviderNotFoundError,
  ChannelDuplicateError,
  ChannelNotFoundError,
  LiffAppDuplicateError,
  LiffAppNotFoundError,
  LineRepositoryError,
  type CreateProviderRecordInput,
  type UpdateProviderRecordInput,
  type CreateChannelRecordInput,
  type UpdateChannelRecordInput,
  type CreateLiffAppRecordInput,
  type UpdateLiffAppRecordInput,
} from "effect-line-manager";
import { prisma } from "./prisma-client.ts";
import { encrypt, decrypt } from "./crypto-utils.ts";

export const PrismaLineRepositoryLive = Layer.succeed(
  LineRepository,
  LineRepository.of({
    // ── Providers ──────────────────────────────────────────────

    createProvider: (input: CreateProviderRecordInput) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineProvider.create({ data: { name: input.name } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "createProvider",
            cause: error,
          }),
      }).pipe(
        Effect.map(
          (r) =>
            new LineProvider({
              id: r.id,
              name: r.name,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            }),
        ),
      ),

    updateProvider: (id, input) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineProvider.update({
            where: { id },
            data: { ...input },
          }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "updateProvider",
            cause: error,
          }),
      }).pipe(
        Effect.map(
          (r) =>
            new LineProvider({
              id: r.id,
              name: r.name,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            }),
        ),
      ),

    findProviderById: (id) =>
      Effect.tryPromise({
        try: () => prisma.lineProvider.findUnique({ where: { id } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "findProviderById",
            cause: error,
          }),
      }).pipe(Effect.map(Option.fromNullable)),

    listProviders: Effect.tryPromise({
      try: () => prisma.lineProvider.findMany(),
      catch: (error) =>
        new LineRepositoryError({ operation: "listProviders", cause: error }),
    }),

    deleteProvider: (id) =>
      Effect.tryPromise({
        try: () => prisma.lineProvider.delete({ where: { id } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "deleteProvider",
            cause: error,
          }),
      }).pipe(Effect.as<void>(undefined)),

    // ── Channels ───────────────────────────────────────────────

    createChannel: (input) =>
      Effect.tryPromise({
        try: async () => {
          const channelSecretEncrypted = encrypt(Redacted.value(input.channelSecret!));
          const channelAccessTokenEncrypted =
            input.channelAccessToken
              ? encrypt(Redacted.value(input.channelAccessToken))
              : undefined;

          return prisma.lineChannel.create({
            data: {
              providerId: input.providerId,
              channelType: input.channelType,
              name: input.name,
              channelId: input.channelId ?? "",
              channelSecretEncrypted,
              channelAccessTokenEncrypted,
            },
          });
        },
        catch: (error) =>
          new LineRepositoryError({
            operation: "createChannel",
            cause: error,
          }),
      }).pipe(
        Effect.map((r) => {
          if (r.channelType === "messaging") {
            return new MessagingChannel({
              channelType: "messaging",
              id: r.id,
              providerId: r.providerId,
              name: r.name,
              channelId: r.channelId,
              channelSecret: input.channelSecret!,
              channelAccessToken: input.channelAccessToken!,
              isActive: r.isActive,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            });
          }
          return new LoginChannel({
            channelType: "login",
            id: r.id,
            providerId: r.providerId,
            name: r.name,
            channelId: r.channelId,
            channelSecret: input.channelSecret!,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          });
        }),
      ),

    updateChannel: (id, input) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineChannel.update({
            where: { id },
            data: {
              ...(input.name !== undefined ? { name: input.name } : {}),
              ...(input.channelId !== undefined ? { channelId: input.channelId } : {}),
              ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
              ...(input.botUserId !== undefined ? { botUserId: input.botUserId } : {}),
            },
          }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "updateChannel",
            cause: error,
          }),
      }).pipe(/* map to LineChannel entity as above */),

    findChannelById: (id) =>
      Effect.tryPromise({
        try: () => prisma.lineChannel.findUnique({ where: { id } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "findChannelById",
            cause: error,
          }),
      }).pipe(Effect.map(Option.fromNullable)),

    findChannelByMessagingId: (channelId) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineChannel.findFirst({
            where: { channelId, channelType: "messaging" },
          }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "findChannelByMessagingId",
            cause: error,
          }),
      }).pipe(Effect.map(Option.fromNullable)),

    findChannelByBotUserId: (botUserId) =>
      Effect.tryPromise({
        try: () => prisma.lineChannel.findFirst({ where: { botUserId } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "findChannelByBotUserId",
            cause: error,
          }),
      }).pipe(Effect.map(Option.fromNullable)),

    listChannelsByProvider: (providerId) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineChannel.findMany({
            where: { providerId },
          }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "listChannelsByProvider",
            cause: error,
          }),
      }),

    deleteChannel: (id) =>
      Effect.tryPromise({
        try: () => prisma.lineChannel.delete({ where: { id } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "deleteChannel",
            cause: error,
          }),
      }).pipe(Effect.as<void>(undefined)),

    // ── LIFF Apps ──────────────────────────────────────────────

    createLiffApp: (input) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineLiffApp.create({
            data: {
              loginChannelId: input.loginChannelId,
              liffId: input.liffId,
              viewType: input.view.type,
              viewUrl: input.view.url,
              description: input.description,
            },
          }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "createLiffApp",
            cause: error,
          }),
      }).pipe(
        Effect.map((r) =>
          new LineLiffApp({
            id: r.id,
            loginChannelId: r.loginChannelId,
            liffId: r.liffId,
            view: { type: r.viewType as "compact" | "tall" | "full", url: r.viewUrl },
            description: r.description ?? undefined,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          }),
        ),
      ),

    updateLiffApp: (id, input) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineLiffApp.update({
            where: { id },
            data: {
              ...(input.liffId !== undefined ? { liffId: input.liffId } : {}),
              ...(input.view !== undefined
                ? { viewType: input.view.type, viewUrl: input.view.url }
                : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
            },
          }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "updateLiffApp",
            cause: error,
          }),
      }).pipe(/* map to LineLiffApp entity */),

    findLiffAppById: (id) =>
      Effect.tryPromise({
        try: () => prisma.lineLiffApp.findUnique({ where: { id } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "findLiffAppById",
            cause: error,
          }),
      }).pipe(Effect.map(Option.fromNullable)),

    listLiffAppsByChannel: (channelId) =>
      Effect.tryPromise({
        try: () =>
          prisma.lineLiffApp.findMany({
            where: { loginChannelId: channelId },
          }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "listLiffAppsByChannel",
            cause: error,
          }),
      }),

    deleteLiffApp: (id) =>
      Effect.tryPromise({
        try: () => prisma.lineLiffApp.delete({ where: { id } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "deleteLiffApp",
            cause: error,
          }),
      }).pipe(Effect.as<void>(undefined)),

    // ── Deprecated (kept for backward compat) ──────────────────
    create: /* ... old flat LineAccount create ... */,
    update: /* ... */,
    findById: /* ... */,
    findByChannelId: /* ... */,
    findByBotUserId: /* ... */,
    listAll: /* ... */,
    deleteById: /* ... */,
  }),
);
```

> **Note**: The deprecated flat methods (`create`, `update`, `findById`, `findByChannelId`, `findByBotUserId`, `listAll`, `deleteById`) are still required by the `LineRepository` interface for backward compatibility with the old `LineAccountManagement.list/create/update/delete` methods. You can delegate them to the new entity methods where possible. They will be removed in a future major version.

---

## 5. Cache Invalidation Mechanics

The `LineClientRegistry` now maintains **two separate caches** — one for channels, one for LIFF apps — each with a configurable TTL (default: 30 minutes).

When credentials are rotated or channels/LIFF apps are modified, invalidate the specific cache entry:

```typescript
import { Effect } from "effect";
import { LineClientRegistry } from "effect-line-manager";

// Invalidate a single channel
Effect.gen(function* () {
  const registry = yield* LineClientRegistry;
  yield* updateDbCredentials(channelRecordId, newAccessToken);
  yield* registry.invalidateChannel(channelRecordId);
});

// Invalidate a single LIFF app
Effect.gen(function* () {
  const registry = yield* LineClientRegistry;
  yield* updateLiffApp(liffRecordId, newView);
  yield* registry.invalidateLiff(liffRecordId);
});

// Invalidate all caches
Effect.gen(function* () {
  const registry = yield* LineClientRegistry;
  yield* registry.invalidateAll;
});
```

> **Deprecated**: `registry.invalidate(recordId)` still works for backward compat but is equivalent to `invalidateChannel`. New code should use `invalidateChannel` / `invalidateLiff`.

The registry methods:

| Method                                       | Description                             |
| -------------------------------------------- | --------------------------------------- |
| `getMessagingClient(recordId)`               | Get cached Messaging API client         |
| `getLoginClient(recordId)`                   | Get cached LINE Login client            |
| `getLiffClient(recordId, oauthAccessToken?)` | Get LIFF client (needs OAuth token)     |
| `syncBotProfile(recordId)`                   | Sync bot profile metadata from LINE API |
| `invalidateChannel(recordId)`                | Evict a channel from cache              |
| `invalidateLiff(recordId)`                   | Evict a LIFF app from cache             |
| `invalidateAll`                              | Evict all cached entries                |

---

## 6. Migrating from `LineAccount` (v1)

If you're upgrading from the old flat `LineAccount` model, here's what changed and how to migrate.

### What Changed

| Old (v1)                                                                 | New (v2)                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `LineAccount` — one flat model with inline login/liff fields             | `LineProvider` → `LineChannel` (tagged union) → `LineLiffApp`                  |
| `LineAccountManagement` 4 methods (`list`, `create`, `update`, `delete`) | `LineAccountManagement` 19 methods (15 new entity methods + 4 deprecated)      |
| `LineAccountManagementAdapter` (4 methods)                               | `LineProviderManagementAdapter` (15 methods)                                   |
| `LineAccountManagementClient`                                            | `LineClient`                                                                   |
| Cache: single `channelCache`                                             | Separate `channelCache` + `liffCache`                                          |
| Routes: `/line-accounts` (4 endpoints)                                   | `/line-providers`, `/line-channels`, `/line-liff-apps` (15 new + 4 deprecated) |

### Database Migration Steps

1. **Create the `line_providers` table** — migrate existing data by extracting a distinct provider per channel (or create a default "Default" provider).
2. **Add columns to `line_channels`** — add `providerId` (FK to `line_providers`), `channelType` (set to `"messaging"` for existing bot channels).
3. **Create `line_liff_apps` table** — extract `liffId` and `loginChannelId` from old `line_channels` rows into the new table.
4. **Drop old columns** from `line_channels`: `loginChannelId`, `loginChannelSecretEncrypted`, `liffId`.
5. **Update your `LineRepository` implementation** — implement the 16 new entity methods. The old flat methods can delegate internally.

### Code Migration Steps

| Old import                           | New import                                                        |
| ------------------------------------ | ----------------------------------------------------------------- |
| `LineAccount`                        | `LineProvider`, `MessagingChannel`, `LoginChannel`, `LineLiffApp` |
| `CreateLineAccountInput`             | `CreateProviderInput`, `CreateChannelInput`, `CreateLiffAppInput` |
| `LineAccountView`                    | `ProviderView`, `ChannelView`, `LiffAppView`                      |
| `LineAccountManagementAdapter`       | `LineProviderManagementAdapter`                                   |
| `makeLineAccountManagementClient()`  | `makeLineClient()`                                                |
| `makeLineAccountManagementAdapter()` | `makeLineProviderManagementAdapter()`                             |
| `LineAccountManagementApiLayer`      | `LineApiLayer`                                                    |

### Backward Compatibility

The old types, methods, routes, and adapters are still exported as `@deprecated` and continue to work in v2. The old `/line-accounts` routes remain mounted alongside the new `/line-providers`, `/line-channels`, and `/line-liff-apps` routes. This gives you a migration window — switch to the new APIs at your own pace. The deprecated surface will be removed in a future major version.

---

## 7. Breaking Changes

| Change                                                                                   | Mitigation                                                                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `LineRepository` interface now requires 16 new methods                                   | Implement the new entity methods. Old flat methods still required but are `@deprecated`.   |
| `LineAccountManagement` interface now requires 15 new methods                            | The default `LineAccountManagement.layer` already provides them.                           |
| `LineAccountManagementAdapter` replaced by `LineProviderManagementAdapter`               | Update web component adapter code. Old adapter still works but is `@deprecated`.           |
| `LineAccountManagementClient` replaced by `LineClient`                                   | Update HTTP client usage. `makeLineClient()` replaces `makeLineAccountManagementClient()`. |
| `LineAccountManagementApiLayer` replaced by `LineApiLayer`                               | Update layer composition. Old layer still works but is `@deprecated`.                      |
| `LineClientRegistry.invalidate()` replaced by `invalidateChannel()` / `invalidateLiff()` | Update cache invalidation calls. Old method still works for channels.                      |
| Database schema: 1 table → 3 tables                                                      | Run migration script (see [Migration Steps](#database-migration-steps) above).             |
| `loginChannelSecret` no longer exists on channels                                        | Login channel credentials are stored in the `LoginChannel` entity's `channelSecret` field. |

---

## 8. Service Override Pattern: User-Scoped Account Listing

The library exports `LineAccountManagement` as an Effect `Context.Service`. Consumers can override individual CRUD members by composing with the exported `makeLineAccountManagement` factory.

**Use case:** A multi-tenant app assigns LINE providers to specific users. The `listProviders()` endpoint should only return providers assigned to the authenticated user.

```typescript
import { Effect, Layer, Context } from "effect";
import {
  LineAccountManagement,
  LineRepository,
  LineClientRegistry,
  makeLineAccountManagement,
} from "effect-line-manager";

// Consumer's own service for user<->provider assignments
class UserProviderAssignment extends Context.Service<
  UserProviderAssignment,
  {
    readonly listAssignedProviderIds: (userId: string) => Effect.Effect<ReadonlySet<string>>;
  }
>()("my-app/UserProviderAssignment") {}

// Create a user-scoped management layer
const userScopedManagementLayer = Layer.effect(LineAccountManagement)(
  Effect.gen(function* () {
    const base = yield* makeLineAccountManagement;
    const assignments = yield* UserProviderAssignment;

    return LineAccountManagement.of({
      ...base,
      // Override only listProviders with user-scoped filtering
      listProviders: Effect.gen(function* () {
        const userId = "current-user-id"; // from auth context
        const assignedIds = yield* assignments.listAssignedProviderIds(userId);
        const all = yield* base.listProviders;
        const data = all.data.filter((p) => assignedIds.has(p.id));
        return {
          data,
          pagination: {
            page: 1,
            pageSize: data.length,
            totalItems: data.length,
            totalPages: data.length === 0 ? 0 : 1,
          },
        };
      }),
    });
  }),
).pipe(
  Layer.provide(yourLineRepositoryLayer),
  Layer.provide(LineClientRegistry.layer()),
  Layer.provide(yourUserProviderAssignmentLayer),
);
```

**Key points:**

- `makeLineAccountManagement` is an `Effect` that returns the default service implementation. `yield*` it to get the base methods.
- Spread the base (`...base`) to passthrough methods unchanged.
- Override only the methods you need — consumers own the composition.
- The management service now exposes **19 methods** (15 new entity methods + 4 deprecated). Override at any granularity.

---

## 9. Web Components: Adapter as the Abstraction Boundary

The `effect-line-manager/web` entry provides Lit-based custom elements as a **reference implementation and starting point**. They are framework-agnostic and themable via CSS custom properties.

**The abstraction boundary is the `LineProviderManagementAdapter` interface:**

```typescript
export interface LineProviderManagementAdapter {
  // Providers
  readonly listProviders: () => Promise<ProviderListPage>;
  readonly createProvider: (input: CreateProviderInput) => Promise<ProviderView>;
  readonly updateProvider: (id: string, input: UpdateProviderInput) => Promise<ProviderView>;
  readonly deleteProvider: (id: string) => Promise<void>;

  // Channels
  readonly listChannels: (providerId?: string) => Promise<ChannelListPage>;
  readonly getChannel: (id: string) => Promise<ChannelView>;
  readonly createChannel: (input: CreateChannelInput) => Promise<ChannelView>;
  readonly updateChannel: (id: string, input: UpdateChannelInput) => Promise<ChannelView>;
  readonly deleteChannel: (id: string) => Promise<void>;

  // LIFF Apps
  readonly listLiffApps: (channelId?: string) => Promise<LiffAppListPage>;
  readonly getLiffApp: (id: string) => Promise<LiffAppView>;
  readonly createLiffApp: (input: CreateLiffAppInput) => Promise<LiffAppView>;
  readonly updateLiffApp: (id: string, input: UpdateLiffAppInput) => Promise<LiffAppView>;
  readonly deleteLiffApp: (id: string) => Promise<void>;
}
```

**What this means for consumers:**

- The web components only know about this Promise interface. They have no knowledge of Effect, LINE APIs, databases, or auth.
- **User scoping happens at the adapter level.** Your adapter's methods call your user-scoped HTTP endpoints.
- The library provides a bridge from the generated HTTP client:

  ```ts
  import { makeLineClient, makeLineProviderManagementAdapter } from "effect-line-manager/httpapi";

  const client = await Effect.runPromise(makeLineClient({ baseUrl: "/api" }));
  const adapter = makeLineProviderManagementAdapter(client);
  element.adapter = adapter;
  ```

- **Bring your own UI:** The web components are optional. You can build your own UI using only the `LineProviderManagementAdapter` interface, or directly consume the Effect services from the headless `effect-line-manager` entry.

**Headless architecture:**

```
┌─────────────────────────────────────────────────────┐
│ Consumer's UI (React / Vue / Svelte / vanilla)       │
│   │ implements LineProviderManagementAdapter          │
│   │ or uses Effect services directly                  │
├─────────────────────────────────────────────────────┤
│ Library: optional Lit web components (reference UI)   │
│   │ consumes LineProviderManagementAdapter             │
├─────────────────────────────────────────────────────┤
│ Library: LineAccountManagement (CRUD service)        │
│   ├─ listProviders, getProvider, createProvider, ...  │
│   ├─ listChannels, getChannel, createChannel, ...     │
│   ├─ listLiffApps, getLiffApp, createLiffApp, ...     │
├─────────────────────────────────────────────────────┤
│ Library: LineClientRegistry (cached API clients)      │
│   ├─ getMessagingClient / getLoginClient              │
│   ├─ getLiffClient / syncBotProfile                   │
│   └─ invalidateChannel / invalidateLiff               │
├─────────────────────────────────────────────────────┤
│ Consumer's LineRepository implementation (DB)        │
│   ├─ createProvider / updateProvider / ...            │
│   ├─ createChannel / updateChannel / ...              │
│   └─ createLiffApp / updateLiffApp / ...              │
└─────────────────────────────────────────────────────┘
```

---

## 10. Serving via the HTTP API

To expose the endpoints to your frontend web components, combine your repository layer with the built-in HTTP API layer.

### Layer Composition

```typescript
import { Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import { LineClientRegistry, LineAccountManagement } from "effect-line-manager";
import { LineApiLayer } from "effect-line-manager/httpapi";
import { PrismaLineRepositoryLive } from "./repository.ts";

// Wire everything together
const LiveManagementLayer = LineAccountManagement.layer.pipe(
  Layer.provide(LineClientRegistry.layer()),
  Layer.provide(PrismaLineRepositoryLive),
  Layer.provide(HttpClient.layer),
);
```

### Mounting with Hono (Fetch API)

```typescript
import { Hono } from "hono";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { LineApiLayer } from "effect-line-manager/httpapi";
import { LiveManagementLayer } from "./layers.ts";

const app = new Hono();

const apiLayer = LineApiLayer.pipe(
  Layer.provide(LiveManagementLayer),
  Layer.provide(HttpServer.layerServices),
);

const webHandler = HttpRouter.toWebHandler(apiLayer, { disableLogger: true });

// Exposes endpoints under /api/admin:
//   GET    /line-providers       (listProviders)
//   GET    /line-providers/:id   (getProvider)
//   POST   /line-providers       (createProvider)
//   PATCH  /line-providers/:id   (updateProvider)
//   DELETE /line-providers/:id   (deleteProvider)
//   GET    /line-channels        (listChannels)
//   GET    /line-channels/:id    (getChannel)
//   POST   /line-channels        (createChannel)
//   PATCH  /line-channels/:id    (updateChannel)
//   DELETE /line-channels/:id    (deleteChannel)
//   GET    /line-liff-apps       (listLiffApps)
//   GET    /line-liff-apps/:id   (getLiffApp)
//   POST   /line-liff-apps       (createLiffApp)
//   PATCH  /line-liff-apps/:id   (updateLiffApp)
//   DELETE /line-liff-apps/:id   (deleteLiffApp)
app.mount("/api/admin", webHandler.handler);

export default app;
```

### Mounting with Express

```typescript
import express from "express";
import { Effect } from "effect";
import { NodeHttp } from "effect/unstable/http";
import { LineApiLayer } from "effect-line-manager/httpapi";
import { LiveManagementLayer } from "./layers.ts";

const app = express();

const apiLayer = LineApiLayer.pipe(Layer.provide(LiveManagementLayer));

app.use("/api/admin", (req, res) => {
  Effect.runFork(NodeHttp.serve(apiLayer)(req, res));
});

app.listen(3000);
```
