# Core Effect Code

## Effect.gen

Use `Effect.gen(function*() { ... })` for sequential effectful logic. `yield*` effect values, return plain values, and keep `async` callbacks at the outer integration edge only.

```ts
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const user = yield* loadUser("user-1");
  const account = yield* loadAccount(user.accountId);
  return { user, account };
});
```

Prefer a small number of readable generator blocks over deeply nested `pipe(Effect.flatMap(...))` chains. Keep `pipe` for local transformations and instrumentation.

## Effect.fn

Use `Effect.fn("Namespace.method")` for named service methods and reusable operations. Names become useful in traces and diagnostics.

```ts
import { Effect } from "effect";

const refreshProfile = Effect.fn("LearnerProfile.refreshProfile")(function* (playerId: string) {
  const player = yield* loadPlayer(playerId);
  yield* recalculateMastery(player.id);
  return player;
});
```

Use the optional transform argument for cross-cutting behavior that belongs to every call.

```ts
const fetchWithPolicy = Effect.fn("Provider.fetch")(function* (id: string) {
  return yield* fetchPayload(id);
}, Effect.timeout("30 seconds"));
```

## Running Effects

Run effects at process or framework edges:

- CLI/script entrypoints: `Effect.runPromise`, `Effect.runSync`, or `Effect.runPromiseExit`.
- HTTP/Svelte/Hono/Express handlers: a shared `ManagedRuntime`.
- Tests: `it.effect` or explicit `Effect.provide`.

Avoid calling `Effect.runPromise` from domain services. It hides dependencies, breaks composition, and makes tests harder to control.

## Retry, Timeout, and Concurrency

Timeouts and retries should be explicit near the boundary that can hang or fail transiently.

```ts
import { Duration, Effect, Schedule } from "effect";

const policy = Schedule.exponential(Duration.millis(100)).pipe(
  Schedule.both(Schedule.recurs(3)),
);

const callProvider = request.pipe(Effect.timeout("30 seconds"), Effect.retry(policy));
```

Use bounded concurrency for external calls. Reserve `concurrency: "unbounded"` for proven in-memory work.

```ts
const results = yield* Effect.forEach(items, processItem, { concurrency: 8 });
```
