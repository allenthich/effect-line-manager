# Integration Guide: Sequelize (MySQL)

This subpage guides you through integrating `effect-line-manager` using **Sequelize ORM** and **MySQL**.

---

### 1. Database Schema & Models Definition

In MySQL, you will store channel credentials in encrypted format. Below are the class declarations and initialization patterns using standard Sequelize.

```typescript
import { DataTypes, Model, Sequelize } from "sequelize";

export class Store extends Model {
  declare id: string;
  declare name: string;
}

export class LineChannel extends Model {
  declare id: string;
  declare storeId: string | null;
  declare name: string;
  declare channelId: string;
  declare channelSecretEncrypted: string;
  declare channelAccessTokenEncrypted: string;
  declare loginChannelId: string | null;
  declare loginChannelSecretEncrypted: string | null;
  declare liffId: string | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initModels = (sequelize: Sequelize) => {
  Store.init(
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
      tableName: "stores",
      timestamps: true,
    },
  );

  LineChannel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: Store, key: "id" },
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
        allowNull: false,
      },
      loginChannelId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      loginChannelSecretEncrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      liffId: {
        type: DataTypes.STRING(255),
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

  // Setup relationships (Store has-many LineChannels)
  Store.hasMany(LineChannel, { foreignKey: "storeId", onDelete: "CASCADE" });
  LineChannel.belongsTo(Store, { foreignKey: "storeId" });
};
```

---

### 2. Encryption Helper (MySQL compatibility)

MySQL database records containing keys should be encrypted at rest using an algorithm like `aes-256-gcm`.

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

### 3. Implementing `LineRepository` with Sequelize

Map Sequelize queries to the core library's `Effect` boundaries, ensuring all query failures or decryption issues map to [LineRepositoryError](../src/account/errors.ts#L16-L22).

```typescript
import { Effect, Option, Redacted, Layer } from "effect";
import { LineRepository, LineChannel, LineRepositoryError } from "effect-line-manager";
import { LineChannel as LineChannelModel } from "./models.ts";
import { encrypt, decrypt } from "./crypto-utils.ts";

export const SequelizeLineRepositoryLive = Layer.succeed(
  LineRepository,
  LineRepository.of({
    create: (input) =>
      Effect.tryPromise({
        try: async () => {
          const channelSecretEncrypted = encrypt(Redacted.value(input.channelSecret));
          const channelAccessTokenEncrypted = encrypt(Redacted.value(input.channelAccessToken));

          return await LineChannelModel.create({
            name: input.name,
            channelId: input.channelId,
            channelSecretEncrypted,
            channelAccessTokenEncrypted,
          });
        },
        catch: (error) =>
          new LineRepositoryError({
            operation: "create",
            causeDescription: error instanceof Error ? error.message : String(error),
          }),
      }).pipe(
        Effect.map(
          (record) =>
            new LineChannel({
              id: record.id,
              name: record.name,
              channelId: record.channelId,
              channelSecret: input.channelSecret,
              channelAccessToken: input.channelAccessToken,
              createdAt: record.createdAt,
            }),
        ),
      ),

    findByChannelId: (channelId) =>
      Effect.tryPromise({
        try: () => LineChannelModel.findOne({ where: { channelId } }),
        catch: (error) =>
          new LineRepositoryError({
            operation: "findByChannelId",
            causeDescription: error instanceof Error ? error.message : String(error),
          }),
      }).pipe(
        Effect.map(Option.fromNullable),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none()),
            onSome: (record) => {
              try {
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
        try: () => LineChannelModel.findAll({ where: { isActive: true } }),
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
          await LineChannelModel.destroy({ where: { channelId } });
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

### 4. Serving via the HTTP API

To expose the endpoints to your frontend web components, combine your `SequelizeLineRepositoryLive` with the built-in HTTP API layer and mount it inside your framework of choice.

#### **Layer Composition**

Assemble the DB repository, registry cache, and `LineAccountManagement` services into a unified layer:

```typescript
import { Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import { makeLineClientRegistryLayer, LineAccountManagement } from "effect-line-manager";
import { SequelizeLineRepositoryLive } from "./repository.ts";

// 1. Build the registry cache layer backed by your Sequelize repository
const RegistryLive = makeLineClientRegistryLayer().pipe(
  Layer.provide(SequelizeLineRepositoryLive),
  Layer.provide(HttpClient.layer),
);

// 2. Create the unified application management layer
export const LiveManagementLayer = LineAccountManagement.layer.pipe(
  Layer.provide(RegistryLive),
  Layer.provide(SequelizeLineRepositoryLive),
);
```

#### **Mounting with Hono (Fetch API)**

```typescript
import { Hono } from "hono";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { LineAccountManagementApiLayer } from "effect-line-manager/httpapi";
import { LiveManagementLayer } from "./layers.ts";

const app = new Hono();

const apiLayer = LineAccountManagementApiLayer.pipe(
  Layer.provide(LiveManagementLayer),
  Layer.provide(HttpServer.layerServices),
);

const webHandler = HttpRouter.toWebHandler(apiLayer, { disableLogger: true });

// Expose endpoints under /api/admin
app.mount("/api/admin", webHandler.handler);

export default app;
```

#### **Mounting with Express**

```typescript
import express from "express";
import { Effect } from "effect";
import { NodeHttp } from "effect/unstable/http";
import { LineAccountManagementApiLayer } from "effect-line-manager/httpapi";
import { LiveManagementLayer } from "./layers.ts";

const app = express();

const apiLayer = LineAccountManagementApiLayer.pipe(Layer.provide(LiveManagementLayer));

// Serve as standard Express middleware
app.use("/api/admin", (req, res) => {
  Effect.runFork(NodeHttp.serve(apiLayer)(req, res));
});

app.listen(3000);
```
