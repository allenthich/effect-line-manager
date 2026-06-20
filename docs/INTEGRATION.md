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

- internal record identifiers use `LineChannelId` (channels) and `LineLiffUid` (LIFF apps)
- external LINE identifiers use `LineMessagingChannelId`, `LineLoginChannelId`, and `LineLiffId`
- public specialized channel IDs stay domain-qualified:
  - `LineMessagingChannelId`
  - `LineLoginChannelId`

## Repository responsibilities

The host application provides concrete repository implementations for the
current repository services exported by the library:

- `LineProviderRepository`
- channel persistence used by provider/channel management and registry flows
- `LineLiffRepository`

Repository implementations should:

- return `Option.none()` for missing records on lookup methods
- raise the current duplicate/not-found domain errors for business conflicts
- wrap infrastructure failures in `LineRepositoryError`
- perform encryption at rest for secrets and access tokens before persistence

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
