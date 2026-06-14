# HTTP and Observability

## HTTP Client

Prefer Effect's `HttpClient` over raw `fetch` in Effect code. Import v4 HTTP APIs from the unstable HTTP barrel unless an existing local file deliberately uses subpath imports.

```ts
import { Context, Effect, flow, Layer, Schedule, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";

class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.Number,
  title: Schema.String,
}) {}

export class TodoApi extends Context.Service<
  TodoApi,
  {
    getTodo(id: number): Effect.Effect<Todo, TodoApiError>;
  }
>()("nexus/TodoApi") {
  static readonly layer = Layer.effect(
    TodoApi,
    Effect.gen(function* () {
      const client = (yield* HttpClient).pipe(
        HttpClient.mapRequest(
          flow(HttpClientRequest.prependUrl("https://example.com"), HttpClientRequest.acceptJson),
        ),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({
          schedule: Schedule.exponential(100),
          times: 3,
        }),
      );

      const getTodo = Effect.fn("TodoApi.getTodo")(function* (id: number) {
        return yield* client.get(`/todos/${id}`).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
          Effect.mapError((cause) => new TodoApiError({ cause })),
        );
      });

      return TodoApi.of({ getTodo });
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
}

export class TodoApiError extends Schema.TaggedErrorClass<TodoApiError>()("TodoApiError", {
  cause: Schema.Defect(),
}) {}
```

Use `HttpClientRequest` helpers for headers, bearer tokens, URL params, and JSON bodies. Use schema response decoders instead of `JSON.parse` for untrusted response bodies.

## Provider Calls

For LLMs or third-party APIs:

- Require a timeout at the provider boundary.
- Retry only transient/network/server failures.
- Keep auth, rate-limit, validation, and bad-response errors distinct.
- Decode provider responses with `Schema`.
- Use `Redacted` for API keys and never put secrets in logs or error messages.
- Bound concurrency when calling external services from `Effect.forEach`.

## Observability

Use `Effect.fn` names, `Effect.withSpan`, `Effect.annotateCurrentSpan`, and `Effect.log*` consistently around service boundaries.

```ts
const generateChallenge = Effect.fn("GenerationService.generateChallenge")(function* (
  input: Input,
) {
  yield* Effect.annotateCurrentSpan({
    zoneId: input.zoneId,
    rank: input.rank,
  });
  yield* Effect.logInfo("generating challenge");
  return yield* strategy.generateChallenge(input);
});
```

Prefer structured logs and span annotations over interpolating large objects into messages. Redact or omit payloads that can contain prompts, secrets, personal data, or provider output.
