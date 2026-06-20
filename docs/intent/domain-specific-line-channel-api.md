# Spec: Domain-Specific LINE Channel Public API

## Objective

Remove the legacy generic public channel API and publish a single clear surface built around:

- domain-specific modules: messaging channels, login channels, providers, LIFF apps
- explicit identity naming: domain-specific channel IDs for LINE-owned identifiers

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

- Use `LineChannelId` for shared internal channel identifiers.
- Use `LineMessagingChannelId` for messaging domain channel identifiers.
- Use `LineLoginChannelId` for login domain channel identifiers.
- Do not expose lookup methods named `find*ById` when more than one identity domain exists.
- `LineChannelUid` has been removed; channel identities are now domain-specific.

## Repository Contracts

`LineMessagingChannels.Repository`

- `findByLineChannelId(id: LineMessagingChannelId)`
- `findByBotUserId(id: LineBotUserId)`

`LineLoginChannels.Repository`

- `findByLineChannelId(id: LineLoginChannelId)`

## Service Contracts

`LineMessagingChannels.Service`

- `getClientByLineChannelId(id: LineMessagingChannelId)`
- `getAccessTokenByLineChannelId(id: LineMessagingChannelId)`
- `invalidateClientByLineChannelId(id: LineMessagingChannelId)`

`LineLoginChannels.Service`

- `getByLineChannelId(id: LineLoginChannelId)`

## Breaking Changes

- `LineChannelUid` is removed; all channel identities use `LineChannelId` or domain-specific variants.
- Error payload field `uid` on `ChannelNotFoundError` is replaced with `channelId`.
- The root export `./channel/index.ts` is no longer public.
- `LineLiffId` is the LIFF app identifier; `LineLiffUid` is the internal record ID.

## Migration Guide

1. Replace `LineChannelUid` with `LineChannelId` or the appropriate domain-specific variant.
2. Replace `ChannelNotFoundError({ uid: ... })` with `ChannelNotFoundError({ channelId: ... })`.
3. Replace root imports from the generic `channel` module with `LineMessagingChannels` or `LineLoginChannels`.
4. Replace public channel lookups with `findByLineChannelId(...)` or `findByBotUserId(...)`, depending on the domain entry point.

## Verification

- Public exports only expose the new grouped channel API.
- Focused tests cover messaging/login lookup behavior through the new repositories and services.
- Existing channel and registry tests still pass after the breaking rename.
