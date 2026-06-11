# Effect v4 Best Practices

Concise guidelines for using Effect TypeScript v4 in this repo.

These notes distill the practical advice from `kitlangton/effect-solutions` and update the examples against the refreshed Effect v4 source:

- `~/.opensrc/repos/github.com/kitlangton/effect-solutions/main`
- `~/.opensrc/repos/github.com/Effect-TS/effect-smol/main`
- `~/.opensrc/repos/github.com/Effect-TS/effect-smol/4.0.0-beta.78/packages/effect`

The examples target `effect@4.0.0-beta.78`, matching this workspace. Prefer the patterns here over older v3 examples or older Effect Solutions snippets, and verify renamed beta APIs against the pinned source before adoption.

## Shards

- [Core Effect Code](./01-core-effect.md)
- [Services, Layers, and Runtime](./02-services-layers-runtime.md)
- [Schema, Errors, and Config](./03-schema-errors-config.md)
- [HTTP and Observability](./04-http-observability.md)
- [Testing and Adoption](./05-testing-adoption.md)

## Default Rules

- Keep domain logic inside `Effect` programs and services. Run effects only at framework, test, script, or process edges.
- Model dependencies with `Context.Service` and compose implementations with `Layer`.
- Model external input, transport payloads, config, and durable domain data with `Schema`.
- Model expected failures as typed tagged errors. Treat defects as bugs or unknown foreign failures that must be wrapped.
- Prefer Effect platform integrations such as `HttpClient`, `Config`, logging, spans, schedules, refs, and managed runtimes over direct Promise/fetch/global state usage.
