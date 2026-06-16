# Integration Guide: Sequelize (MySQL)

This subpage guides you through integrating `effect-line-manager` using **Sequelize ORM** and **MySQL** with the new **Provider → Channel → LIFF App** domain model.

---

## 1. Database Schema & Models Definition

Define three Sequelize models with proper foreign keys and relations.

```typescript
import { DataTypes, Model, Sequelize } from "sequelize";

// ── LineProvider ───────────────────────────────────────────────────

export class LineProvider extends Model {
  declare id: string;
  declare name: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// ── LineChannel ────────────────────────────────────────────────────

export class LineChannel extends Model {
  declare id: string;
  declare providerId: string;
  declare channelType: "messaging" | "login";
  declare name: string;
  declare channelId: string;
  declare channelSecretEncrypted: string;
  declare channelAccessTokenEncrypted: string | null;
  declare botUserId: string | null;
  declare basicId: string | null;
  declare displayName: string | null;
  declare pictureUrl: string | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// ── LineLiffApp ────────────────────────────────────────────────────

export class LineLiffApp extends Model {
  declare id: string;
  declare loginChannelId: string;
  declare liffId: string;
  declare viewType: "compact" | "tall" | "full";
  declare viewUrl: string;
  declare description: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// ── Init ───────────────────────────────────────────────────────────

export const initModels = (sequelize: Sequelize) => {
  // 1. LineProvider
  LineProvider.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "line_providers",
      timestamps: true,
    },
  );

  // 2. LineChannel
  LineChannel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: LineProvider, key: "id" },
      },
      channelType: {
        type: DataTypes.ENUM("messaging", "login"),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      channelId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      channelSecretEncrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      channelAccessTokenEncrypted: {
        type: DataTypes.TEXT,
        allowNull: true, // NULL for login channels
      },
      botUserId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      basicId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      pictureUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "line_channels",
      timestamps: true,
    },
  );

  // 3. LineLiffApp
  LineLiffApp.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      loginChannelId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: LineChannel, key: "id" },
      },
      liffId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      viewType: {
        type: DataTypes.ENUM("compact", "tall", "full"),
        allowNull: false,
      },
      viewUrl: {
        type: DataTypes.STRING(2048),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: "line_liff_apps",
      timestamps: true,
    },
  );

  // ── Relations ──────────────────────────────────────────────────

  // Provider hasMany Channels
  LineProvider.hasMany(LineChannel, {
    foreignKey: "providerId",
    onDelete: "CASCADE",
    as: "channels",
  });
  LineChannel.belongsTo(LineProvider, {
    foreignKey: "providerId",
    as: "provider",
  });

  // Channel hasMany LIFF Apps (login channels only)
  LineChannel.hasMany(LineLiffApp, {
    foreignKey: "loginChannelId",
    onDelete: "CASCADE",
    as: "liffApps",
  });
  LineLiffApp.belongsTo(LineChannel, {
    foreignKey: "loginChannelId",
    as: "loginChannel",
  });
};
```

---

## 2. Index Recommendations

For production workloads, add these indexes on top of the default primary keys and `unique` constraints:

```sql
-- line_channels: filter by provider + channel type (common list query)
CREATE INDEX idx_line_channels_provider_type
  ON line_channels (providerId, channelType);

-- line_channels: look up by bot user ID (webhook verification)
CREATE INDEX idx_line_channels_bot_user_id
  ON line_channels (botUserId);

-- line_liff_apps: filter by parent login channel (common list query)
CREATE INDEX idx_line_liff_apps_login_channel
  ON line_liff_apps (loginChannelId);

-- line_liff_apps: look up by LIFF ID
CREATE UNIQUE INDEX idx_line_liff_apps_liff_id
  ON line_liff_apps (liffId);
```

Or with Sequelize, add these to the `init()` options:

```typescript
// In LineChannel.init():
indexes: [
  { fields: ["providerId", "channelType"] },
  { fields: ["botUserId"] },
],

// In LineLiffApp.init():
indexes: [
  { fields: ["loginChannelId"] },
  { unique: true, fields: ["liffId"] },
],
```

---

## 3. Encryption Helper (MySQL compatibility)

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex"); // Must be 32 bytes

export const encrypt = (text: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

export const decrypt = (hash: string): string => {
  const [ivHex, authTagHex, encryptedHex] = hash.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
```

---

## 4. Implementing `LineRepository` with Sequelize

Map Sequelize queries to the core library's `Effect` boundaries. The `LineRepository` interface now has 16 entity-specific methods (plus 7 deprecated flat methods).

```typescript
import { Effect, Option, Redacted, Layer } from "effect";
import {
  LineRepository,
  LineProvider,
  MessagingChannel,
  LoginChannel,
  LineLiffApp,
  LineRepositoryError,
  type CreateProviderRecordInput,
  type UpdateProviderRecordInput,
  type CreateChannelRecordInput,
  type UpdateChannelRecordInput,
  type CreateLiffAppRecordInput,
  type UpdateLiffAppRecordInput,
} from "effect-line-manager";
import {
  LineProvider as LineProviderModel,
  LineChannel as LineChannelModel,
  LineLiffApp as LineLiffAppModel,
} from "./models.ts";
import { encrypt, decrypt } from "./crypto-utils.ts";

const toDomainProvider = (r: LineProviderModel): LineProvider =>
  new LineProvider({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

const toDomainChannel = (r: LineChannelModel): LineChannel => {
  const channelSecret = Redacted.make(decrypt(r.channelSecretEncrypted));
  if (r.channelType === "messaging") {
    const channelAccessToken = Redacted.make(decrypt(r.channelAccessTokenEncrypted!));
    return new MessagingChannel({
      channelType: "messaging",
      id: r.id,
      providerId: r.providerId,
      name: r.name,
      channelId: r.channelId,
      channelSecret,
      channelAccessToken,
      botUserId: r.botUserId ?? undefined,
      basicId: r.basicId ?? undefined,
      displayName: r.displayName ?? undefined,
      pictureUrl: r.pictureUrl ?? undefined,
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
    channelSecret,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
};

const toDomainLiffApp = (r: LineLiffAppModel): LineLiffApp =>
  new LineLiffApp({
    id: r.id,
    loginChannelId: r.loginChannelId,
    liffId: r.liffId,
    view: { type: r.viewType, url: r.viewUrl },
    description: r.description ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

const repoError = (operation: string, cause: unknown) =>
  new LineRepositoryError({
    operation: operation as any,
    cause: cause instanceof Error ? cause : new Error(String(cause)),
  });

export const SequelizeLineRepositoryLive = Layer.succeed(
  LineRepository,
  LineRepository.of({
    // ── Providers ──────────────────────────────────────────────

    createProvider: (input: CreateProviderRecordInput) =>
      Effect.tryPromise({
        try: () => LineProviderModel.create({ name: input.name }),
        catch: (error) => repoError("createProvider", error),
      }).pipe(Effect.map(toDomainProvider)),

    updateProvider: (id, input) =>
      Effect.tryPromise({
        try: () =>
          LineProviderModel.update(input, { where: { id }, returning: true }).then(
            ([, rows]) => rows[0],
          ),
        catch: (error) => repoError("updateProvider", error),
      }).pipe(Effect.map(toDomainProvider)),

    findProviderById: (id) =>
      Effect.tryPromise({
        try: () => LineProviderModel.findByPk(id),
        catch: (error) => repoError("findProviderById", error),
      }).pipe(Effect.map(Option.fromNullable)),

    listProviders: Effect.tryPromise({
      try: () => LineProviderModel.findAll(),
      catch: (error) => repoError("listProviders", error),
    }),

    deleteProvider: (id) =>
      Effect.tryPromise({
        try: async () => {
          await LineProviderModel.destroy({ where: { id } });
        },
        catch: (error) => repoError("deleteProvider", error),
      }),

    // ── Channels ───────────────────────────────────────────────

    createChannel: (input) =>
      Effect.tryPromise({
        try: async () => {
          const channelSecretEncrypted = encrypt(Redacted.value(input.channelSecret!));
          const channelAccessTokenEncrypted = input.channelAccessToken
            ? encrypt(Redacted.value(input.channelAccessToken))
            : null;

          return LineChannelModel.create({
            providerId: input.providerId,
            channelType: input.channelType,
            name: input.name,
            channelId: input.channelId ?? "",
            channelSecretEncrypted,
            channelAccessTokenEncrypted,
          });
        },
        catch: (error) => repoError("createChannel", error),
      }).pipe(Effect.map(toDomainChannel)),

    updateChannel: (id, input) =>
      Effect.tryPromise({
        try: async () => {
          const data: Record<string, unknown> = {};
          if (input.name !== undefined) data.name = input.name;
          if (input.channelId !== undefined) data.channelId = input.channelId;
          if (input.isActive !== undefined) data.isActive = input.isActive;
          if (input.botUserId !== undefined) data.botUserId = input.botUserId;
          if (input.basicId !== undefined) data.basicId = input.basicId;
          if (input.displayName !== undefined) data.displayName = input.displayName;
          if (input.pictureUrl !== undefined) data.pictureUrl = input.pictureUrl;

          const [affected] = await LineChannelModel.update(data, {
            where: { id },
          });
          if (affected === 0) throw new Error("Channel not found");
          return (await LineChannelModel.findByPk(id))!;
        },
        catch: (error) => repoError("updateChannel", error),
      }).pipe(Effect.map(toDomainChannel)),

    findChannelById: (id) =>
      Effect.tryPromise({
        try: () => LineChannelModel.findByPk(id),
        catch: (error) => repoError("findChannelById", error),
      }).pipe(Effect.map(Option.fromNullable)),

    findChannelByMessagingId: (channelId) =>
      Effect.tryPromise({
        try: () =>
          LineChannelModel.findOne({
            where: { channelId, channelType: "messaging" },
          }),
        catch: (error) => repoError("findChannelByMessagingId", error),
      }).pipe(Effect.map(Option.fromNullable)),

    findChannelByBotUserId: (botUserId) =>
      Effect.tryPromise({
        try: () => LineChannelModel.findOne({ where: { botUserId } }),
        catch: (error) => repoError("findChannelByBotUserId", error),
      }).pipe(Effect.map(Option.fromNullable)),

    listChannelsByProvider: (providerId) =>
      Effect.tryPromise({
        try: () => LineChannelModel.findAll({ where: { providerId } }),
        catch: (error) => repoError("listChannelsByProvider", error),
      }),

    deleteChannel: (id) =>
      Effect.tryPromise({
        try: async () => {
          await LineChannelModel.destroy({ where: { id } });
        },
        catch: (error) => repoError("deleteChannel", error),
      }),

    // ── LIFF Apps ──────────────────────────────────────────────

    createLiffApp: (input) =>
      Effect.tryPromise({
        try: () =>
          LineLiffAppModel.create({
            loginChannelId: input.loginChannelId,
            liffId: input.liffId,
            viewType: input.view.type,
            viewUrl: input.view.url,
            description: input.description ?? null,
          }),
        catch: (error) => repoError("createLiffApp", error),
      }).pipe(Effect.map(toDomainLiffApp)),

    updateLiffApp: (id, input) =>
      Effect.tryPromise({
        try: async () => {
          const data: Record<string, unknown> = {};
          if (input.liffId !== undefined) data.liffId = input.liffId;
          if (input.view !== undefined) {
            data.viewType = input.view.type;
            data.viewUrl = input.view.url;
          }
          if (input.description !== undefined) data.description = input.description;

          const [affected] = await LineLiffAppModel.update(data, {
            where: { id },
          });
          if (affected === 0) throw new Error("LIFF app not found");
          return (await LineLiffAppModel.findByPk(id))!;
        },
        catch: (error) => repoError("updateLiffApp", error),
      }).pipe(Effect.map(toDomainLiffApp)),

    findLiffAppById: (id) =>
      Effect.tryPromise({
        try: () => LineLiffAppModel.findByPk(id),
        catch: (error) => repoError("findLiffAppById", error),
      }).pipe(Effect.map(Option.fromNullable)),

    listLiffAppsByChannel: (channelId) =>
      Effect.tryPromise({
        try: () => LineLiffAppModel.findAll({ where: { loginChannelId: channelId } }),
        catch: (error) => repoError("listLiffAppsByChannel", error),
      }),

    deleteLiffApp: (id) =>
      Effect.tryPromise({
        try: async () => {
          await LineLiffAppModel.destroy({ where: { id } });
        },
        catch: (error) => repoError("deleteLiffApp", error),
      }),

    // ── Deprecated flat methods ─────────────────────────────────
    // These are required by the LineRepository interface for backward
    // compat with LineAccountManagement.list/create/update/delete.
    // Delegate each to the appropriate new entity method.

    create: (input) =>
      Effect.tryPromise({
        try: async () => {
          const channelSecretEncrypted = encrypt(Redacted.value(input.channelSecret));
          const channelAccessTokenEncrypted = encrypt(Redacted.value(input.channelAccessToken));
          return await LineChannelModel.create({
            providerId: "default" as any, // from your default provider
            channelType: "messaging",
            name: input.name,
            channelId: input.channelId,
            channelSecretEncrypted,
            channelAccessTokenEncrypted,
            isActive: input.isActive ?? true,
            botUserId: input.botUserId ?? null,
          });
        },
        catch: (error) => repoError("create", error),
      }).pipe(Effect.map(toDomainChannel)),

    update: (id, input) =>
      Effect.tryPromise({
        try: async () => {
          const data: Record<string, unknown> = {};
          if (input.name !== undefined) data.name = input.name;
          if (input.channelId !== undefined) data.channelId = input.channelId;
          if (input.channelSecret !== undefined) {
            data.channelSecretEncrypted = encrypt(Redacted.value(input.channelSecret));
          }
          if (input.channelAccessToken !== undefined) {
            data.channelAccessTokenEncrypted = encrypt(Redacted.value(input.channelAccessToken));
          }
          if (input.isActive !== undefined) data.isActive = input.isActive;
          if (input.botUserId !== undefined) data.botUserId = input.botUserId ?? null;

          const [affected] = await LineChannelModel.update(data, {
            where: { id, channelType: "messaging" },
          });
          if (affected === 0) throw new Error("Channel not found");
          return (await LineChannelModel.findByPk(id))!;
        },
        catch: (error) => repoError("update", error),
      }).pipe(Effect.map(toDomainChannel)),

    findById: (id) =>
      Effect.tryPromise({
        try: () => LineChannelModel.findOne({ where: { id, channelType: "messaging" } }),
        catch: (error) => repoError("findById", error),
      }).pipe(Effect.map(Option.fromNullable), Effect.map(Option.map(toDomainChannel))),
    findByChannelId: (channelId) =>
      Effect.tryPromise({
        try: () =>
          LineChannelModel.findOne({
            where: { channelId, channelType: "messaging" },
          }),
        catch: (error) => repoError("findByChannelId", error),
      }).pipe(Effect.map(Option.fromNullable), Effect.map(Option.map(toDomainChannel))),
    findByBotUserId: (botUserId) =>
      Effect.tryPromise({
        try: () =>
          LineChannelModel.findOne({
            where: { botUserId, channelType: "messaging" },
          }),
        catch: (error) => repoError("findByBotUserId", error),
      }).pipe(Effect.map(Option.fromNullable), Effect.map(Option.map(toDomainChannel))),

    listAll: Effect.gen(function* () {
      const channels = yield* Effect.tryPromise({
        try: () => LineChannelModel.findAll({ where: { channelType: "messaging" } }),
        catch: (error) => repoError("listAll", error),
      });
      return channels.map(toDomainChannel);
    }),

    deleteById: (id) =>
      Effect.tryPromise({
        try: async () => {
          await LineChannelModel.destroy({ where: { id } });
        },
        catch: (error) => repoError("deleteById", error),
      }),
  }),
);
```

---

## 5. Migration File Example (from old `LineAccount` flat model)

Below is a Sequelize migration that transforms the old single-table `line_channels` schema into the new three-table hierarchy.

```typescript
import { QueryInterface, DataTypes } from "sequelize";

export const up = async (queryInterface: QueryInterface) => {
  // 1. Create line_providers table
  await queryInterface.createTable("line_providers", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // 2. Create a default provider and insert it
  const [defaultProvider] = await queryInterface.sequelize.query(
    `INSERT INTO line_providers (id, name, createdAt, updatedAt)
     VALUES (UUID(), 'Default', NOW(), NOW())
     RETURNING id`,
    { type: "INSERT" },
  );
  const defaultProviderId = (defaultProvider as any)[0].id;

  // 3. Add new columns to existing line_channels table
  await queryInterface.addColumn("line_channels", "providerId", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "line_providers", key: "id" },
  });
  await queryInterface.addColumn("line_channels", "channelType", {
    type: DataTypes.ENUM("messaging", "login"),
    allowNull: true,
  });

  // 4. Populate providerId and channelType on existing rows
  await queryInterface.sequelize.query(`
    UPDATE line_channels
    SET "providerId" = '${defaultProviderId}',
        "channelType" = 'messaging'
    WHERE "providerId" IS NULL
  `);

  // 5. Make columns NOT NULL after data migration
  await queryInterface.changeColumn("line_channels", "providerId", {
    type: DataTypes.UUID,
    allowNull: false,
  });
  await queryInterface.changeColumn("line_channels", "channelType", {
    type: DataTypes.ENUM("messaging", "login"),
    allowNull: false,
  });

  // 6. Create line_liff_apps table from old inline LIFF data
  await queryInterface.createTable("line_liff_apps", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    loginChannelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "line_channels", key: "id" },
    },
    liffId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    viewType: {
      type: DataTypes.ENUM("compact", "tall", "full"),
      allowNull: false,
    },
    viewUrl: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // 7. Migrate existing LIFF data: if old rows had liffId set, insert into line_liff_apps
  await queryInterface.sequelize.query(`
    INSERT INTO line_liff_apps (id, "loginChannelId", "liffId", "viewType", "viewUrl", description, "createdAt", "updatedAt")
    SELECT
      UUID(),
      id AS "loginChannelId",
      "liffId",
      'full' AS "viewType",
      '' AS "viewUrl",
      NULL AS description,
      NOW() AS "createdAt",
      NOW() AS "updatedAt"
    FROM line_channels
    WHERE "liffId" IS NOT NULL AND "liffId" != ''
  `);

  // 8. Drop old columns from line_channels
  await queryInterface.removeColumn("line_channels", "loginChannelId");
  await queryInterface.removeColumn("line_channels", "loginChannelSecretEncrypted");
  await queryInterface.removeColumn("line_channels", "liffId");

  // 9. Add indexes
  await queryInterface.addIndex("line_channels", ["providerId", "channelType"], {
    name: "idx_line_channels_provider_type",
  });
  await queryInterface.addIndex("line_channels", ["botUserId"], {
    name: "idx_line_channels_bot_user_id",
  });
  await queryInterface.addIndex("line_liff_apps", ["loginChannelId"], {
    name: "idx_line_liff_apps_login_channel",
  });
};

export const down = async (queryInterface: QueryInterface) => {
  // Re-add old columns
  await queryInterface.addColumn("line_channels", "loginChannelId", {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
  await queryInterface.addColumn("line_channels", "loginChannelSecretEncrypted", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await queryInterface.addColumn("line_channels", "liffId", {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  // Repopulate from line_liff_apps (best-effort — viewUrl in LIFF app may differ)
  await queryInterface.sequelize.query(`
    UPDATE line_channels c
    SET "liffId" = la."liffId",
        "loginChannelId" = la."loginChannelId"
    FROM line_liff_apps la
    WHERE c.id = la."loginChannelId"
  `);

  // Drop new tables and columns
  await queryInterface.dropTable("line_liff_apps");
  await queryInterface.removeColumn("line_channels", "channelType");
  await queryInterface.removeColumn("line_channels", "providerId");
  await queryInterface.dropTable("line_providers");
};
```

**Important notes about this migration:**

- It creates a single "Default" provider and assigns all existing channels to it. **You'll likely want to customize this** to create the correct provider structure for your app before running in production.
- The `viewUrl` for migrated LIFF apps defaults to empty string — you'll need to backfill this from the LINE API.
- The `down` migration is best-effort and may not perfectly reconstruct the original data.
- **Always back up your database before running schema migrations.**

---

## 6. Serving via the HTTP API

To expose the endpoints to your frontend, combine your `SequelizeLineRepositoryLive` with the built-in HTTP API layer and mount it inside your framework of choice.

### Layer Composition

Assemble the DB repository, registry cache, and `LineAccountManagement` services:

```typescript
import { Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import { LineClientRegistry, LineAccountManagement } from "effect-line-manager";
import { SequelizeLineRepositoryLive } from "./repository.ts";

// 1. Build the registry cache layer backed by your Sequelize repository
const RegistryLive = LineClientRegistry.layer().pipe(
  Layer.provide(SequelizeLineRepositoryLive),
  Layer.provide(HttpClient.layer),
);

// 2. Create the unified application management layer
export const LiveManagementLayer = LineAccountManagement.layer.pipe(
  Layer.provide(RegistryLive),
  Layer.provide(SequelizeLineRepositoryLive),
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

// Exposes 15 new endpoints + 4 deprecated under /api/admin
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

### Endpoint Reference

| Method   | Path                         | Handler          |
| -------- | ---------------------------- | ---------------- |
| `GET`    | `/line-providers`            | `listProviders`  |
| `GET`    | `/line-providers/:id`        | `getProvider`    |
| `POST`   | `/line-providers`            | `createProvider` |
| `PATCH`  | `/line-providers/:id`        | `updateProvider` |
| `DELETE` | `/line-providers/:id`        | `deleteProvider` |
| `GET`    | `/line-channels?providerId=` | `listChannels`   |
| `GET`    | `/line-channels/:id`         | `getChannel`     |
| `POST`   | `/line-channels`             | `createChannel`  |
| `PATCH`  | `/line-channels/:id`         | `updateChannel`  |
| `DELETE` | `/line-channels/:id`         | `deleteChannel`  |
| `GET`    | `/line-liff-apps?channelId=` | `listLiffApps`   |
| `GET`    | `/line-liff-apps/:id`        | `getLiffApp`     |
| `POST`   | `/line-liff-apps`            | `createLiffApp`  |
| `PATCH`  | `/line-liff-apps/:id`        | `updateLiffApp`  |
| `DELETE` | `/line-liff-apps/:id`        | `deleteLiffApp`  |

The deprecated `/line-accounts` routes (GET/POST/PATCH/DELETE) remain mounted for backward compatibility.
