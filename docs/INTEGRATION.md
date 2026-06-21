# Integration Guide

This package is storage-agnostic. Host applications own the database schema,
implement repository services, and decide how the current authenticated tenant
or user scopes those repository operations.

## Current domain model

- `LineProvider`
- `MessagingChannel` or `LoginChannel`
- `LineLiffApp`

Relationships:

- provider `1 -> many` channels
- login channel `1 -> many` LIFF apps

Identifier rules:

- internal record identifiers use `LineChannelId` (channels) and `LineLiffId` (LIFF apps)
- external LINE identifiers use `LineMessagingChannelId`, `LineLoginChannelId`, and `LineLiffId`
- public specialized channel IDs stay domain-qualified:
  - `LineMessagingChannelId`
  - `LineLoginChannelId`

## Persistence ports the host must implement

The host application provides concrete `Layer.effect` implementations for
exactly three persistence services exported by the library:

1. **`InternalLineChannelStore`** — generic channel records (messaging + login).
   Importable as a type from the package root. Carries the persistence contract
   that both the registry and the management services consume.
2. **`LineProviderRepository`** — provider records.
3. **`LineLiffRepository`** — LIFF app records.

There is no legacy `LineChannelRepository` symbol. Hosts implement
`InternalLineChannelStore` directly.

### Skeleton for `InternalLineChannelStore`

```ts
import { Effect, Layer, Option, Redacted } from "effect";
import {
  InternalLineChannelStore,
  LineChannelId,
  MessagingChannel,
  LoginChannel,
  Schema,
} from "effect-line-manager";

const channelStoreLayer = Layer.effect(InternalLineChannelStore)(
  Effect.gen(function* () {
    const db = yield* MyDb; // consumer-owned
    return InternalLineChannelStore.of({
      create: (input) =>
        Effect.tryPromise({
          try: () => db.lineChannel.create(toRow(input)),
          catch: (cause) => toLineRepositoryError("createChannel", cause),
        }),
      update: (id, input) =>
        Effect.tryPromise({
          try: () => db.lineChannel.update(id, toRow(input)),
          catch: (cause) => toLineRepositoryError("updateChannel", cause),
        }),
      findByLineChannelId: (id) =>
        Effect.tryPromise({
          try: () => db.lineChannel.findByChannelId(id),
          catch: (cause) => toLineRepositoryError("findChannelByLineChannelId", cause),
        }).pipe(Effect.map(Option.fromNullable)),
      findByBotUserId: (botUserId) =>
        Effect.tryPromise({
          try: () => db.lineChannel.findByBotUserId(botUserId),
          catch: (cause) => toLineRepositoryError("findChannelByBotUserId", cause),
        }).pipe(Effect.map(Option.fromNullable)),
      listByProvider: (providerId, query) =>
        Effect.tryPromise({
          try: () => db.lineChannel.listByProvider(providerId, query),
          catch: (cause) => toLineRepositoryError("listChannelsByProvider", cause),
        }),
      delete: (id) =>
        Effect.tryPromise({
          try: () => db.lineChannel.delete(id),
          catch: (cause) => toLineRepositoryError("deleteChannel", cause),
        }),
    });
  }),
);
```

`LineProviderRepository` and `LineLiffRepository` follow the same pattern —
implement each method as an `Effect` that wraps infrastructure failures in
`LineRepositoryError`.

### Error and secret contract

Repository implementations should:

- return `Option.none()` for missing records on lookup methods
- raise the current duplicate/not-found domain errors for business conflicts:
  - channel conflicts: `ChannelNotFoundError`, `ChannelDuplicateError` (from `effect-line-manager`)
  - provider conflicts: `LineProviderNotFoundError`, `LineProviderDuplicateError`
  - LIFF conflicts: `LiffAppNotFoundError`, `LiffAppDuplicateError`
- wrap all infrastructure failures in `new LineRepositoryError({ operation, cause })`
  using one of the literal operation names from `LineRepositoryOperation` (e.g.
  `"createChannel"`, `"findChannelByLineChannelId"`, `"listChannelsByProvider"`,
  `"deleteChannel"` — the operation enum still uses the channel-domain verb
  names, not the store method names, so the same string works for both the
  internal store and a host adapting to it)
- perform encryption at rest for secrets and access tokens before persistence;
  construct library entities with `Redacted.make(...)` after decrypting

## Registry responsibilities

`LineClientRegistry` is responsible for:

- resolving a messaging client from `LineMessagingChannelId` (via domain services)
- resolving a login client from `LineLoginChannelId` (via domain services)
- resolving a LIFF client from `LineLiffId`
- caching successful and failed lookups
- invalidating channel or LIFF cache entries after mutations

Use:

- `invalidateChannel(channelId: LineChannelId)` — accepts internal record ID
- `invalidateLiff(liffId: LineLiffId)`
- `invalidateAll`

## Public channel contract

Consumers should use the domain-specific public channel APIs:

- `LineMessagingChannels.Repository.findByLineChannelId`
- `LineMessagingChannels.Repository.findByBotUserId`
- `LineLoginChannels.Repository.findByLineChannelId`
- `LineMessagingChannels.Service.getClientByLineChannelId`
- `LineMessagingChannels.Service.getAccessTokenByLineChannelId`
- `LineMessagingChannels.Service.invalidateClientByLineChannelId`
- `LineLoginChannels.Service.getByLineChannelId`
- `LineLoginChannels.Service.getLoginClientByLineChannelId`

Generic channel persistence is internal-only and should not be treated as a
supported consumer contract.

## HTTP API

The `effect-line-manager/httpapi` entrypoint exposes the current CRUD routes:

- providers under `/line-providers`
- channels under `/line-channels`
- LIFF apps under `/line-liff-apps`

Use `LineApiLayer` on the server and `makeLineClient` on the client. If you
need a Promise-based adapter for the reference UI, use
`makeLineProviderManagementAdapter`.
