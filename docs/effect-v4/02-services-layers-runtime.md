# Services, Layers, and Runtime

## Services

Define services with `Context.Service`. Give every service a stable id that includes the package or app boundary.

```ts
import { Context, Effect, Layer, Schema } from "effect";

export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()("DatabaseError", {
  cause: Schema.Defect(),
}) {}

export class Database extends Context.Service<
  Database,
  {
    query(sql: string): Effect.Effect<ReadonlyArray<unknown>, DatabaseError>;
  }
>()("nexus/db/Database") {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const query = Effect.fn("Database.query")(function* (sql: string) {
        yield* Effect.log("executing query");
        return yield* runSql(sql);
      });

      return Database.of({ query });
    }),
  );
}
```

Use `Database["Service"]` when you need the service shape type.

## Layers

Use layers to choose implementations, acquire resources, and compose dependencies.

- `Layer.succeed(Service, Service.of(...))` for pure/in-memory implementations.
- `Layer.effect(Service, Effect.gen(...))` for effectful construction or acquired state.
- `Layer.provide` when an implementation privately consumes dependencies.
- `Layer.provideMerge` when tests or callers should still access provided dependencies.
- `Layer.mergeAll` for sibling services at a composition root.

In v4, old `Layer.scoped` examples should generally become `Layer.effect`; `Layer.effect` can acquire scoped resources inside the effect.

## Composition Roots

Domain packages should export service tags, ports, errors, schemas, and layer variants. Apps should decide which concrete layers are live.

```ts
const AppLayer = Layer.mergeAll(
  KnowledgeGraphService.layer,
  MasteryService.layer,
  GenerationService.layer,
).pipe(Layer.provide(Postgres.layer), Layer.provide(FetchHttpClient.layer));
```

Avoid importing sibling domain implementations directly from another domain package. If one domain needs another capability, define a consumer-owned port and adapt it at the app layer.

## ManagedRuntime

Use `ManagedRuntime` to bridge non-Effect frameworks into Effect. Create one runtime per app/service graph and dispose it on shutdown.

```ts
import { ManagedRuntime } from "effect";

export const runtime = ManagedRuntime.make(AppLayer);

app.get("/health", async (context) => {
  const health = await runtime.runPromise(HealthService.use((_) => _.check));
  return context.json(health);
});

process.once("SIGTERM", () => {
  void runtime.dispose();
});
```

When multiple runtimes must share layer memoization, create and pass a shared `Layer.makeMemoMapUnsafe()` as shown in the v4 integration docs.
