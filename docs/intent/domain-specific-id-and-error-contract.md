# ADR: Domain-Specific ID Brands and Error Types

## Status

Accepted (June 2026)

## Context

The package has public domain-specific services (`LineMessagingChannels`, `LineLoginChannels`) but their type contracts are not internally consistent:

- `LineLoginChannelId` is a distinct branded type — `LineMessagingChannelId` is an alias of the generic `LineChannelId`.
- `MessagingChannel.channelId` uses the generic `LineChannelId`, but `LoginChannel.channelId` uses the domain-specific `LineLoginChannelId`.
- Public-domain services fail with the generic `ChannelNotFoundError` (carrying `LineChannelId`), forcing tests to use `as never` casts.

LIFF already models domain-specific errors (`LiffAppNotFoundError`, `LiffAppDuplicateError`) — channel services should follow the same pattern.

## Decision

### 1. Messaging channels get a distinct branded schema

`LineMessagingChannelId` becomes a distinct brand (`Schema.brand("effect-line-manager/LineMessagingChannelId")`), not an alias of `LineChannelId`.

- `MessagingChannel.channelId` changes from `LineChannelId` to `LineMessagingChannelId`.
- Internal conversions at repository/service boundaries use explicit `Schema.decodeUnknownSync` where generic and domain-specific IDs meet.
- `LineChannelId` remains the internal record-ID type (the `id` field on both channel models).

### 2. Domain-specific error types for channel not-found

New error types carry domain-specific ID brands:

- `MessagingChannelNotFoundError` — `channelId: LineMessagingChannelId`
- `LoginChannelNotFoundError` — `channelId: LineLoginChannelId`

The generic `ChannelNotFoundError` (with `channelId: LineChannelId`) stays for internal use (`InternalLineChannelStore`, `LineChannelManagement`). Public domain services (`LineMessagingChannelService`, `LineLoginChannelService`) raise domain-specific errors.

`ChannelDuplicateError` is only raised internally; no domain-specific duplicate error is needed.

### 3. Public export surface

| Entrypoint                      | What consumers import                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effect-line-manager`           | `LineProviders`, `LineMessagingChannels`, `LineLoginChannels`, `LineLiffApps`, `LineClientRegistry`, messaging/client types, webhook types, login/client types, LIFF types, view types |
| `effect-line-manager/messaging` | `makeLineApiClient`, `LineApiClient`, schemas, webhook parsers, `verifyLineSignature`, messaging errors                                                                                |
| `effect-line-manager/login`     | `makeLineLoginClient`, `LineLoginClient`, login errors                                                                                                                                 |
| `effect-line-manager/httpapi`   | `LineApi`, `makeLineClient`, `LineApiLayer`, handlers, HTTP errors, `lineOpenApi`                                                                                                      |
| `effect-line-manager/registry`  | `LineClientRegistry`                                                                                                                                                                   |
| `effect-line-manager/adapter`   | `LineProviderManagementAdapter`, `LineProviderManagementAdapterLayer`                                                                                                                  |
| `effect-line-manager/web`       | Web components (Lit elements, web-specific types)                                                                                                                                      |

**Not public** (no `exports` entry in `package.json`, not re-exported from root):

- `src/channel/*` — internal generic channel domain (domain models, errors, service)
- `InternalLineChannelStore` — internal persistence boundary
- `LineChannelManagement` — internal generic management service (HTTP API uses it internally)
- `LineChannelRepository` — removed; implement `InternalLineChannelStore` directly

## Consequences

- `as LineChannelId` and `as never` casts disappear from public API tests.
- Internal `decodeSharedLineChannelId` bridges remain at repository/service boundaries — explicit and minimal.
- Consumers can catch domain-specific errors without inspecting the error payload's `_tag` discriminator.
- Breaking change: `MessagingChannel.channelId` type changes — existing consumers that constructed `MessagingChannel` instances via `new MessagingChannel({ channelId: ... })` must now pass a `LineMessagingChannelId`-branded value. In practice this only affects tests and the LIFF service which validates via the generic store.
