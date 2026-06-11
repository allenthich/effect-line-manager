# Testing and Adoption

## Tests

Use `@effect/vitest` for Effect tests when available.

```ts
import { assert, describe, it, layer } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";

layer(TodoRepo.layerTest)("TodoRepo", (it) => {
  it.effect("creates todos", () =>
    Effect.gen(function* () {
      const repo = yield* TodoRepo;
      const todo = yield* repo.create("Write docs");
      assert.strictEqual(todo.title, "Write docs");
    }),
  );
});
```

Use test layers instead of mocks hidden behind globals. For stateful tests, put shared state in an explicit service such as a `Ref` layer so the test can inspect or reset it.

## Test Layer Rules

- Export live and test layer variants next to the service when the fake is reusable.
- Keep fakes faithful to the service contract, including typed failures.
- Use `Layer.provideMerge` when tests need access to both the service and its test dependencies.
- Prefer `Effect.provide(program, TestLayer)` or `program.pipe(Effect.provide(TestLayer))` over manual service construction in test bodies.

## Incremental Adoption

Start with boundaries that already have effects:

- HTTP handlers, provider clients, and database repositories.
- Config loading and secret handling.
- Cross-domain orchestration services.
- Test seams that currently require ad hoc mocks.

Keep pure functions pure. Do not wrap deterministic data transformations in `Effect` unless they need dependency injection, typed failures, tracing, interruption, scheduling, or resource safety.

## Migration Checks

When updating older Effect examples:

- Replace v3 package imports with v4 imports from `effect` or `effect/unstable/*`.
- Replace old `@effect/platform/*` HTTP imports with `effect/unstable/http`.
- Prefer `Context.Service` over hand-written `Context.Tag` service tags.
- Use `Layer.effect` for effectful service construction; old `Layer.scoped` examples are stale for v4.
- Use `Schema.Defect()` with parentheses in v4 examples.
- Prefer `Schema.decodeUnknownEffect` / `schemaBodyJson` over manual `JSON.parse`.
- Ensure all runnable examples compile against the workspace Effect version before copying them into production docs or source.

## Repo Checklist

Before finishing Effect changes in this repo:

- Run `vp check`.
- Run `vp test`.
- Run package-specific scripts from `package.json` or `vite.config.ts` when the touched package defines relevant validation.
- If declaration files are emitted beside source during raw packaging, run the cleanup script described in `AGENTS.md`.
