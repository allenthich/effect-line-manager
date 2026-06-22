# effect-line-manager

## 0.1.2

### Patch Changes

- ba14140: Added changeset tag to trigger github release
- ba14140: Moved GitHub release handling to changeset action

## 0.1.1

### Patch Changes

- 184720e: Renamed and extended messaging channel bot-profile fields to align with LINE's `GET /v2/bot/info` response shape and separate auto-synced profile metadata from user-supplied friend-discovery URLs.

  **Renamed** on `MessagingChannel`, `CreateMessagingChannelInput`, `UpdateMessagingChannelInput`, `CreateChannelInput`, `UpdateChannelInput`, and `MessagingChannelView`:

  - `basicId` → `botBasicId`
  - `displayName` → `botDisplayName`
  - `pictureUrl` → `botPictureUrl`

  `botUserId` is unchanged (already correctly named; sourced from LINE's `userId`).

  **Added** two new user-supplied fields (not from LINE API):

  - `addFriendUrl` — e.g. `https://lin.ee/your-line-id`
  - `addFriendQrCodeUrl` — e.g. `https://qr-official.line.me/gs/your-qr-code.png`

  These were previously overloaded onto `botUserId` and `pictureUrl` in the web UI only; the rename makes the storage layer match the labels.

  **What does NOT change:**

  - `LineApiClient.getBotInfo` still returns the canonical LINE API shape (`userId`, `basicId`, `displayName`, `pictureUrl`). The rename happens only at the `MessagingChannel` domain boundary.
  - `syncBotProfile` still writes the four bot-profile fields from `getBotInfo`; it does not touch `addFriendUrl` / `addFriendQrCodeUrl`.
  - `LineBotUserId` brand and the `findByBotUserId` repository port are unchanged.

  **Migration for hosts:**

  1. Rename DB columns `basicId` → `botBasicId`, `displayName` → `botDisplayName`, `pictureUrl` → `botPictureUrl` (Sequelize/raw SQL).
  2. Add nullable columns `addFriendUrl`, `addFriendQrCodeUrl`.
  3. Update your `LineMessagingChannelRepository` implementation to map the new field names.
  4. Migrate any persisted `botUserId` / `pictureUrl` values that were actually storing Add-Friend URLs into the new `addFriendUrl` / `addFriendQrCodeUrl` columns (data migration is host-specific — inspect stored values to decide which records held overloaded URLs).

## 0.1.0

### Minor Changes

- 8c51b53: Real offset-based pagination for list endpoints.

  - New shared schemas: `PageQuery`, `NormalizedPageQuery`, `PageResult<A>`, `Pagination` (now Int-based), plus `normalizePageQuery` and `paginate` helpers.
  - Repositories now accept `NormalizedPageQuery` and return `PageResult<T>` instead of `ReadonlyArray<T>`. Consumers implementing repositories own the counts and slicing (SQL `LIMIT`/`OFFSET`, etc.).
  - Management services and HTTP API accept an optional `PageQuery` (`{ page?, pageSize? }`) on list operations and pass pagination metadata through unchanged.
  - List query schemas extended additively: `ListProvidersQuery` = `PageQuery`, `ListChannelsQuery` = `PageQuery + providerId?`, `ListLiffAppsQuery` = `PageQuery + channelId?`.
  - `LineProviderManagementAdapter.listProviders/listChannels/listLiffApps` now accept an optional query argument.
  - Demo in-memory adapter uses the shared `paginate` helper with the standard defaults (page=1, pageSize=20, max=100).
  - Removed fabricated pagination metadata (always `page: 1, pageSize: totalItems`). The `Pagination` contract now reflects actual server-side pagination.

### Patch Changes

- 679c4df: - Replaced the generic root channel surface with domain-specific messaging/login channel APIs
  - Introduced domain-specific channel identifiers and not-found errors (LineMessagingChannelId, LineLoginChannelId, LineBotUserId, MessagingChannelNotFoundError, LoginChannelNotFoundError)
  - Removed generic internal channel symbols from the root export and adds grouped public entry points like LineMessagingChannels, LineLoginChannels, LineProviders, and LineLiffApps
  - Renamed persistence/error language from account-oriented/generic record naming toward provider/channel/liff domain naming, including LinePersistenceError
  - Updated HTTP API/client/tests/docs to match the new provider/channel/liff split
- b9190c4: - Removed the legacy `LineChannelRepository` symbol and `LineChannelRepositoryService` type. The persistence port for channels is `InternalLineChannelStore`; hosts implement its methods (`create`, `update`, `findByLineChannelId`, `findByBotUserId`, `listByProvider`, `delete`) directly via `Layer.effect(InternalLineChannelStore)(...)`.
  - Added `LineLoginChannelService.getLoginClientByLineChannelId(id: LineLoginChannelId)` mirroring the messaging service's `getClientByLineChannelId`. Login consumers no longer need to drop down to `LineClientRegistry.getLoginClient` and bridge the brand conversion themselves.
  - Documented the three persistence ports hosts must implement (`InternalLineChannelStore`, `LineProviderRepository`, `LineLiffRepository`) in `docs/INTEGRATION.md` with a skeleton `Layer.effect` block.
  - Updated intent docs to record the removal of `LineChannelRepository` and point consumers at `InternalLineChannelStore`.

## 0.0.5

### Patch Changes

- 5c4da44: Added consistent messaging info for messaging channels
- 73a34fc: Added changeset presence check to ci
- 73a34fc: Fixed unfocused modal mouse release closing modal
- 73a34fc: Added inline jsdocs

## 0.0.4

### Patch Changes

- 64dc1e2: Resolved gh release tags

## 0.0.3

### Patch Changes

- ec58dd8: Fixed syncing version bumping from package.json to jsr.json (hopefully)

## 0.0.2

### Patch Changes

- 0bb6727: Dummy — trigger 0.0.1 release

## 0.0.1

### Patch Changes

- 203b9b3: Initial release
