# Integration Guide: Database Schema & Repository Mapping

Since `effect-line-manager` is a headless, storage-agnostic library, host applications must own their database schemas, manage relationships (e.g., linking LINE channels to **Stores** or **Assignees**), and implement the `LineRepository` interface.

Here is how to design your schemas, protect sensitive credentials, and bridge your database records to the library's `Effect` schemas.

---

### 1. Database Schema Design (SQL & ORMs)

Your database should store the LINE channel configuration and link it to your domain entities (like `Store` or `Assignee`).

Below are schema examples using two popular TypeScript ORMs: **Drizzle ORM** and **Prisma**. For applications using **Sequelize ORM** with MySQL, check out the dedicated [Sequelize Integration Guide](./integration-sequelize.md).

#### **Option A: Drizzle ORM (Relational approach)**

```typescript
import { pgTable, varchar, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

// 1. Host Domain Entity
export const stores = pgTable("stores", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

// 2. LINE Channel configuration table owned by the host
export const lineChannels = pgTable("line_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: "cascade" }), // Allocation key
  name: varchar("name", { length: 255 }).notNull(),
  channelId: varchar("channel_id", { length: 255 }).notNull().unique(),

  // Credentials should be stored encrypted (see Security section below)
  channelSecretEncrypted: varchar("channel_secret_encrypted").notNull(),
  channelAccessTokenEncrypted: varchar("channel_access_token_encrypted").notNull(),

  // Optional Login and LIFF configurations
  loginChannelId: varchar("login_channel_id", { length: 255 }),
  loginChannelSecretEncrypted: varchar("login_channel_secret_encrypted"),
  liffId: varchar("liff_id", { length: 255 }),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### **Option B: Prisma Schema**

```prisma
model Store {
  id           String        @id @default(uuid())
  name         String
  lineChannels LineChannel[]
}

model LineChannel {
  id                          String   @id @default(uuid())
  storeId                     String?
  store                       Store?   @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name                        String
  channelId                   String   @unique
  channelSecretEncrypted      String
  channelAccessTokenEncrypted String
  loginChannelId              String?
  loginChannelSecretEncrypted String?
  liffId                      String?
  isActive                    Boolean  @default(true)
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
}
```

---

### 2. Security Best Practice: Encryption at Rest

Because LINE channel secrets and access tokens have administrative access, **never store them in plain text** in your database.

1. **Symmetric Encryption**: Use a fast, secure encryption algorithm like `AES-256-GCM` with an encryption key loaded from your host application's environment variables (`process.env.ENCRYPTION_KEY`).
2. **Encrypted columns**: Encrypt `channelSecret`, `channelAccessToken`, and `loginChannelSecret` before executing SQL `INSERT` or `UPDATE` statements, and decrypt them on retrieval before passing them to the library.

---

### 3. Implementing the `LineRepository`

The host application must implement the [LineRepository](../src/account/repository.ts#L15-L48) interface using `Effect` blocks and mapping database errors to [LineRepositoryError](../src/account/errors.ts#L16-L22).

Here is a template implementation using **Prisma** and **Effect**:

```typescript
import { Effect, Option, Redacted, Layer } from "effect";
import { LineRepository, LineChannel, LineRepositoryError } from "effect-line-manager";
import { prisma } from "./prisma-client.ts"; // your Prisma instance
import { encrypt, decrypt } from "./crypto-utils.ts"; // your AES-GCM utilities

export const PrismaLineRepositoryLive = Layer.succeed(
  LineRepository,
  LineRepository.of({
    create: (input) =>
      Effect.tryPromise({
        try: async () => {
          // 1. Encrypt secrets before write
          const channelSecretEncrypted = encrypt(Redacted.value(input.channelSecret));
          const channelAccessTokenEncrypted = encrypt(Redacted.value(input.channelAccessToken));

          return await prisma.lineChannel.create({
            data: {
              name: input.name,
              channelId: input.channelId,
              channelSecretEncrypted,
              channelAccessTokenEncrypted,
            },
          });
        },
        catch: (error) =>
          new LineRepositoryError({
            operation: "create",
            causeDescription: error instanceof Error ? error.message : String(error),
          }),
      }).pipe(
        // 2. Decode db record into core LineChannel model
        Effect.map(
          (record) =>
            new LineChannel({
              id: record.id,
              name: record.name,
              channelId: record.channelId,
              channelSecret: input.channelSecret, // reuse redacted secrets
              channelAccessToken: input.channelAccessToken,
              createdAt: record.createdAt,
            }),
        ),
      ),

    findByChannelId: (channelId) =>
      Effect.tryPromise({
        try: () => prisma.lineChannel.findUnique({ where: { channelId } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "findByChannelId",
            causeDescription: error instanceof Error ? error.message : String(error),
          }),
      }).pipe(
        // Convert null db rows to Option (composability in Effect)
        Effect.map(Option.fromNullable),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none()),
            onSome: (record) => {
              try {
                // 3. Decrypt secrets on read and wrap in Redacted
                const channelSecret = Redacted.make(decrypt(record.channelSecretEncrypted));
                const channelAccessToken = Redacted.make(
                  decrypt(record.channelAccessTokenEncrypted),
                );

                return Effect.succeed(
                  Option.some(
                    new LineChannel({
                      id: record.id,
                      name: record.name,
                      channelId: record.channelId,
                      channelSecret,
                      channelAccessToken,
                      createdAt: record.createdAt,
                    }),
                  ),
                );
              } catch (decryptError) {
                return Effect.fail(
                  new LineRepositoryError({
                    operation: "findByChannelId",
                    causeDescription: "Failed to decrypt channel credentials.",
                  }),
                );
              }
            },
          }),
        ),
      ),

    listAll: () =>
      Effect.tryPromise({
        try: () => prisma.lineChannel.findMany({ where: { isActive: true } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "listAll",
            causeDescription: String(error),
          }),
      }).pipe(
        Effect.flatMap((records) =>
          Effect.all(
            records.map((r) =>
              Effect.try({
                try: () =>
                  new LineChannel({
                    id: r.id,
                    name: r.name,
                    channelId: r.channelId,
                    channelSecret: Redacted.make(decrypt(r.channelSecretEncrypted)),
                    channelAccessToken: Redacted.make(decrypt(r.channelAccessTokenEncrypted)),
                    createdAt: r.createdAt,
                  }),
                catch: () =>
                  new LineRepositoryError({
                    operation: "listAll",
                    causeDescription: "Decryption failed.",
                  }),
              }),
            ),
          ),
        ),
      ),

    deleteByChannelId: (channelId) =>
      Effect.tryPromise({
        try: async () => {
          await prisma.lineChannel.delete({ where: { channelId } });
        },
        catch: (error) =>
          new LineRepositoryError({
            operation: "deleteByChannelId",
            causeDescription: String(error),
          }),
      }),
  }),
);
```

---

### 4. Cache Invalidation Mechanics

Because the library caches `LineApiClient` instances inside the `LineClientRegistry` memory cache for up to 30 minutes, credential rotation requires explicit invalidation:

- **Trigger Invalidation**: Whenever a channel is updated or deleted in the host database, your service layer must invoke `invalidate(recordId)` on the [LineClientRegistry](../src/account/registry.ts#L36-L72) to purge the cached client.

```typescript
Effect.gen(function* () {
  const registry = yield* LineClientRegistry;

  // 1. Host performs credentials rotation
  yield* updateDbCredentials(recordId, newAccessToken);

  // 2. Invalidate registry cache to force reload on the next run
  yield* registry.invalidate(recordId);
});
```

---

### 5. Service Override Pattern: User-Scoped Account Listing

The library exports `LineAccountManagement` as an Effect `Context.Service`. Consumers can override individual CRUD members (e.g., `list` for user-scoped filtering) by composing with the exported `makeLineAccountManagement` factory.

**Use case:** A store assigns LINE channels to specific managers. The `list()` endpoint should only return channels assigned to the authenticated user.

```typescript
import { Effect, Layer, Context } from "effect";
import {
  LineAccountManagement,
  LineRepository,
  LineClientRegistry,
  makeLineAccountManagement,
} from "effect-line-manager";

// Consumer's own service for user<->channel assignments
class UserChannelStore extends Context.Service<
  UserChannelStore,
  {
    readonly listAssignedChannelIds: (userId: string) => Effect.Effect<ReadonlySet<string>>;
  }
>()("my-app/UserChannelStore") {}

// Create a user-scoped management layer
const userScopedManagementLayer = Layer.effect(LineAccountManagement)(
  Effect.gen(function* () {
    // Get the default implementation
    const base = yield* makeLineAccountManagement;
    // Get user-channel assignments
    const userChannels = yield* UserChannelStore;

    return LineAccountManagement.of({
      // Spread the base: create, update, and delete passthrough unchanged
      ...base,
      // Override only list with user-scoped filtering
      list: Effect.gen(function* () {
        const userId = "current-user-id"; // from auth context
        const assignedIds = yield* userChannels.listAssignedChannelIds(userId);
        const all = yield* base.list;
        const data = all.data.filter((a) => assignedIds.has(a.channelId));
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
  Layer.provide(yourUserChannelStoreLayer),
);
```

**Key points:**

- `makeLineAccountManagement` is an `Effect` that returns the default service implementation. `yield*` it to get the base methods.
- Spread the base (`...base`) to passthrough `create`, `update`, and `delete` unchanged.
- Override only the methods you need — consumers own the composition.
- Provide the scoped layer in your Effect app instead of the default `LineAccountManagement.layer`.

---

### 6. Web Components: Adapter as the Abstraction Boundary

The `effect-line-manager/web` entry provides Lit-based custom elements (`<line-account-management>`, `<line-account-card>`, `<line-account-form>`, etc.) as a **reference implementation and starting point**. They are framework-agnostic (any JS framework or vanilla HTML) and themable via CSS custom properties.

**The abstraction boundary is the `LineAccountManagementAdapter` interface:**

```typescript
export interface LineAccountManagementAdapter {
  readonly list: () => Promise<ReadonlyArray<LineAccountView>>;
  readonly create: (input: CreateLineAccountInput) => Promise<LineAccountView>;
  readonly update: (id: string, input: UpdateLineAccountInput) => Promise<LineAccountView>;
  readonly delete: (id: string) => Promise<void>;
}
```

**What this means for consumers:**

- The web components only know about this Promise interface. They have no knowledge of Effect, LINE APIs, databases, or auth.
- **User scoping happens at the adapter level.** Your adapter's `list()` calls your user-scoped HTTP endpoint.
- The library provides a bridge from the generated HTTP client:
  ```ts
  import {
    makeLineAccountManagementClient,
    makeLineAccountManagementAdapter,
  } from "effect-line-manager/httpapi";
  const client = await Effect.runPromise(makeLineAccountManagementClient({ baseUrl: "/api" }));
  const adapter = makeLineAccountManagementAdapter(client);
  element.adapter = adapter;
  ```
- **Bring your own UI:** The web components are optional. You can build your own UI using only the `LineAccountManagementAdapter` interface, or directly consume the Effect services `LineAccountManagement` / `LineRepository` / `LineClientRegistry` from the headless `effect-line-manager` entry.

**Headless architecture:**

```
┌─────────────────────────────────────────────────────┐
│ Consumer's UI (React / Vue / Svelte / vanilla)       │
│   │ implements LineAccountManagementAdapter           │
│   │ or uses Effect services directly                  │
├─────────────────────────────────────────────────────┤
│ Library: optional Lit web components (reference UI)   │
│   │ consumes LineAccountManagementAdapter             │
├─────────────────────────────────────────────────────┤
│ Library: LineAccountManagement (CRUD service)        │
│ Library: LineClientRegistry (cached API clients)     │
│ Library: LineApiClient / LineLoginClient / etc.       │
├─────────────────────────────────────────────────────┤
│ Consumer's LineRepository implementation (DB)        │
└─────────────────────────────────────────────────────┘
```
