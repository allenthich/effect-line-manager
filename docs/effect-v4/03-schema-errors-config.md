# Schema, Errors, and Config

## Schema Classes

Use `Schema.Class` for transport and domain records that cross trust boundaries.

```ts
import { Effect, Schema } from "effect";

export const PlayerId = Schema.String.pipe(Schema.brand("PlayerId"));
export type PlayerId = typeof PlayerId.Type;

const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty());

export class Player extends Schema.Class<Player>("Player")({
  id: PlayerId,
  name: NonEmptyTrimmedString,
  createdAt: Schema.DateTimeUtcFromString,
}) {}

const decodePlayer = Schema.decodeUnknownEffect(Player);

const loadPlayer = (input: unknown) =>
  decodePlayer(input).pipe(Effect.mapError((cause) => new InvalidPayload({ cause })));
```

Use `Schema.Struct` for local anonymous shapes and `Schema.Class` when the model should be named, exported, instantiated, or used in public APIs.

## Variants and Brands

Use `Schema.Literals([...])` for string/number alternatives. Use `Schema.TaggedClass` plus `Schema.Union([...])` for structured variants.

```ts
export class StaticStrategy extends Schema.TaggedClass<StaticStrategy>()("StaticStrategy", {
  fixture: Schema.String,
}) {}

export class AiStrategy extends Schema.TaggedClass<AiStrategy>()("AiStrategy", {
  providerId: Schema.String,
  modelId: Schema.String,
}) {}

export const Strategy = Schema.Union([StaticStrategy, AiStrategy]);
```

Brand ids and constrained primitives at module boundaries. Do not pass raw strings for domain ids once a schema exists.

`Schema.NonEmptyTrimmedString` is not exported by `effect@4.0.0-beta.78`. Compose the constraint with `Schema.Trimmed.check(Schema.isNonEmpty())` instead of copying examples from another beta.

## Errors

Use `Schema.TaggedErrorClass` for expected, serializable domain/application failures.

```ts
export class NotFound extends Schema.TaggedErrorClass<NotFound>()("NotFound", {
  resource: Schema.String,
  id: Schema.String,
}) {}

export class InvalidPayload extends Schema.TaggedErrorClass<InvalidPayload>()("InvalidPayload", {
  cause: Schema.Defect(),
}) {}
```

Tagged errors are yieldable in v4:

```ts
const getZone = Effect.fn("KnowledgeGraph.getZone")(function* (id: string) {
  const zone = yield* findZone(id);
  if (zone === undefined) {
    return yield* new NotFound({ resource: "Zone", id });
  }
  return zone;
});
```

Use `Effect.catchTag` / `Effect.catchTags` for local recovery. Do not collapse distinct failures into one broad `GenerationError` or `UnknownError` until an outer boundary maps them to transport responses.

## Defects

Use `Schema.Defect()` to carry unknown foreign causes inside typed errors. Use it at integration boundaries such as database drivers, provider SDKs, JSON parsing, and `tryPromise` catches.

```ts
const callDb = Effect.tryPromise({
  try: () => client.query(sql),
  catch: (cause) => new DatabaseError({ cause }),
});
```

Before a cause crosses a public interface, remove secrets and unnecessary payload data. For example, an HTTP client error may retain the full request, including authorization headers; wrap a safe reason or sanitized error instead of exposing that object unchanged.

Use `Effect.orDie` only when the failure is truly unrecoverable for the current program.

## Config

Use `Config` for environment and runtime configuration. Keep secrets redacted.

```ts
import { Config } from "effect";

export const ServerConfig = Config.all({
  hostname: Config.string("HOSTNAME"),
  port: Config.port("PORT"),
  adminKey: Config.option(Config.redacted("ADMIN_API_KEY")),
}).pipe(Config.nested("SERVER"));
```

Use `Config.schema(schema, name)` for structured values and `Config.withDefault` only for development-safe defaults.
