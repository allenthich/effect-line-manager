---
"effect-line-manager": patch
---

Renamed and extended messaging channel bot-profile fields to align with LINE's `GET /v2/bot/info` response shape and separate auto-synced profile metadata from user-supplied friend-discovery URLs.

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
