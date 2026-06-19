# Spec: Domain-Specific LINE Channel Public API

## Objective

Split the public LINE channel API by domain so consumers can distinguish:

- messaging channels vs login channels
- internal library-owned identifiers (`Uid`) vs external LINE identifiers (`LineChannelId`)

The existing generic `LineChannelRepository` remains available for internal storage reuse and backwards compatibility, but new public entry points should be intention-revealing.

## Public API Shape

Expose grouped public modules:

- `LineMessagingChannels.Repository`
- `LineMessagingChannels.Service`
- `LineLoginChannels.Repository`
- `LineLoginChannels.Service`
- `LineProviders.Repository`
- `LineProviders.Service`
- `LineLiffApps.Repository`
- `LineLiffApps.Service`
- `LineClientRegistry`

## Repository Contracts

`LineMessagingChannels.Repository`

- `findByUid(uid: LineMessagingChannelUid)`
- `findByLineChannelId(id: LineMessagingChannelId)`
- `findByBotUserId(id: LineBotUserId)`

`LineLoginChannels.Repository`

- `findByUid(uid: LineLoginChannelUid)`
- `findByLineChannelId(id: LineLoginChannelId)`

## Service Contracts

`LineMessagingChannels.Service`

- `getClientByLineChannelId(id: LineMessagingChannelId)`
- `getAccessTokenByLineChannelId(id: LineMessagingChannelId)`
- `invalidateClientByLineChannelId(id: LineMessagingChannelId)`

`LineLoginChannels.Service`

- `getByLineChannelId(id: LineLoginChannelId)`

## Design Rules

- Public method names must encode the domain at the service or repository boundary.
- Public lookup methods must encode the identity type via `Uid` or `LineChannelId`.
- Bare `Id` must not be used for channel lookups where multiple identity domains exist.

## Migration Constraints

- Keep the current generic channel repository and channel management implementation intact.
- Implement the new API as a compatibility layer on top of the existing repository and registry.
- Add deprecation guidance to ambiguous generic channel lookup methods.

## Verification

- Focused tests prove the new repositories narrow messaging vs login channels correctly.
- Focused tests prove the new services look up by external LINE channel ID, return the expected client or token, and invalidate by internal UID.
