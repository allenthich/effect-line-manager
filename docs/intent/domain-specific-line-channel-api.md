# Spec: Domain-Specific LINE Channel Public API

## Objective

Remove the legacy generic public channel API and publish a single clear surface built around:

- domain-specific modules: messaging channels, login channels, providers, LIFF apps
- explicit identity naming: `Uid` for library-owned identifiers and `LineChannelId` for LINE-owned identifiers

## Public API Shape

Expose these public modules:

- `LineMessagingChannels.Repository`
- `LineMessagingChannels.Service`
- `LineLoginChannels.Repository`
- `LineLoginChannels.Service`
- `LineProviders.Repository`
- `LineProviders.Service`
- `LineLiffApps.Repository`
- `LineLiffApps.Service`
- `LineClientRegistry`

Do not re-export the generic `channel` module from the package root.

## Naming Rules

- Do not expose `RecordId` in public APIs.
- Keep `Uid` only on internal or mutation-oriented surfaces that need a stable library-owned identifier.
- Use `LineChannelId` for external LINE identifiers.
- Do not expose lookup methods named `find*ById` when more than one identity domain exists.

## Repository Contracts

`LineMessagingChannels.Repository`

- `findByLineChannelId(id: LineMessagingChannelId)`
- `findByBotUserId(id: LineBotUserId)`

`LineLoginChannels.Repository`

- `findByLineChannelId(id: LineLoginChannelId)`
- `findByLineChannelId(id: LineLoginChannelId)`

## Service Contracts

`LineMessagingChannels.Service`

- `getClientByLineChannelId(id: LineMessagingChannelId)`
- `getAccessTokenByLineChannelId(id: LineMessagingChannelId)`
- `invalidateClientByLineChannelId(id: LineMessagingChannelId)`

`LineLoginChannels.Service`

- `getByLineChannelId(id: LineLoginChannelId)`

## Breaking Changes

- `LineChannelRecordId` is removed in favor of `LineChannelUid`.
- `LineLiffRecordId` is removed in favor of `LineLiffUid`.
- Error payload fields named `recordId` are removed in favor of `uid`.
- The root export `./channel/index.ts` is no longer public.

## Migration Guide

1. Replace `LineChannelRecordId` with `LineChannelUid`.
2. Replace `LineLiffRecordId` with `LineLiffUid`.
3. Replace `recordId` fields with `uid`.
4. Replace root imports from the generic `channel` module with `LineMessagingChannels` or `LineLoginChannels`.
5. Replace public channel lookups with `findByLineChannelId(...)` or `findByBotUserId(...)`, depending on the domain entry point.
6. Replace `findChannelByMessagingId(...)` with `findChannelByLineChannelId(...)`.

## Verification

- Public exports only expose the new grouped channel API.
- Focused tests cover messaging/login lookup behavior through the new repositories and services.
- Existing channel and registry tests still pass after the breaking rename.
