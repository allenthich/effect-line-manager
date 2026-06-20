# Sequelize Integration Notes

This guide outlines the current Sequelize integration points for the
provider/channel/LIFF domain model.

## Tables

Recommended tables:

- `line_providers`
- `line_channels`
- `line_liff_apps`

Recommended channel columns:

- `id`
- `providerId`
- `channelType`
- `name`
- `channelId`
- `channelSecretEncrypted`
- `channelAccessTokenEncrypted` for messaging channels
- optional bot-profile columns such as `botUserId`, `basicId`, `displayName`,
  and `pictureUrl`

Recommended LIFF columns:

- `id`
- `loginChannelId`
- `liffId`
- `viewType`
- `viewUrl`
- optional `description`

## Repository mapping

Your Sequelize repository layer should map rows into the current library
entities and errors:

- provider operations use `LineProviderRepository`
- channel lookups are keyed by `LineChannelId`
- public external id lookups use `LineMessagingChannelId` or
  `LineLoginChannelId`
- LIFF lookups are keyed by `LineLiffId`

Infrastructure failures should become `LineRepositoryError`. Business conflicts
should become the current duplicate or not-found domain errors.

## Secrets

Do not persist `channelSecret` or `channelAccessToken` in plain text. Encrypt
before writes and decrypt before constructing library entities.

## Layer assembly

Compose your Sequelize-backed repositories with:

- `LineClientRegistry.layer()`
- `FetchHttpClient.layer` or another `HttpClient.HttpClient`
- `LineApiLayer` when mounting the HTTP API

Current HTTP CRUD routes are:

- `/line-providers`
- `/line-channels`
- `/line-liff-apps`

No deprecated account-era routes are part of the supported surface.
