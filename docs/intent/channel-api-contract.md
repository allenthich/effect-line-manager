# Channel API Contract

## Verified public surface

As of `0.0.4`, the published package export maps expose these entrypoints:

- `effect-line-manager`
- `effect-line-manager/adapter`
- `effect-line-manager/httpapi`
- `effect-line-manager/login`
- `effect-line-manager/messaging`
- `effect-line-manager/registry`
- `effect-line-manager/web`

Neither `effect-line-manager/channel` nor `effect-line-manager/channels` is a supported package subpath in `package.json` or `jsr.json`.

The supported channel-facing root API is:

- `LineMessagingChannels.Repository`
- `LineMessagingChannels.Service`
- `LineLoginChannels.Repository`
- `LineLoginChannels.Service`
- `LineClientRegistry`
- HTTP API and web entrypoints documented under their own subpaths

## Naming contract

Public APIs must encode both the domain and the identifier owner.

- Use domain-qualified types for public specializations:
  - `LineMessagingChannelId`
  - `LineLoginChannelId`
  - `LineLiffId`
- `LineChannelId` is the shared channel identifier type used internally

Avoid introducing new public names that use a bare `Id` without domain context.

## Allowed public repository and service names

Public channel lookup APIs are domain-specific:

- `LineMessagingChannels.Repository.findByLineChannelId`
- `LineMessagingChannels.Repository.findByBotUserId`
- `LineLoginChannels.Repository.findByLineChannelId`
- `LineMessagingChannels.Service.getClientByLineChannelId`
- `LineMessagingChannels.Service.getAccessTokenByLineChannelId`
- `LineMessagingChannels.Service.invalidateClientByLineChannelId`
- `LineLoginChannels.Service.getByLineChannelId`

Generic channel persistence is an internal implementation detail. `LineChannelRepository` has been removed; use `InternalLineChannelStore` as the persistence port for channels.

## Classification

This migration is a public surface cleanup with internal refactoring:

- `./channel` and `./channels` are not supported public subpaths.
- The root build output has historically leaked generic channel internals in generated typings.
- The fix is to preserve the documented domain-specific contract and remove the leaked generic persistence boundary from published entrypoints.
- `LineChannelUid` has been removed; all channel identities now use domain-specific channel IDs.
