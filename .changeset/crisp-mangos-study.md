---
"effect-line-manager": patch
---

- Replaced the generic root channel surface with domain-specific messaging/login channel APIs
- Introduced domain-specific channel identifiers and not-found errors (LineMessagingChannelId, LineLoginChannelId, LineBotUserId, MessagingChannelNotFoundError, LoginChannelNotFoundError)
- Removed generic internal channel symbols from the root export and adds grouped public entry points like LineMessagingChannels, LineLoginChannels, LineProviders, and LineLiffApps
- Renamed persistence/error language from account-oriented/generic record naming toward provider/channel/liff domain naming, including LinePersistenceError
- Updated HTTP API/client/tests/docs to match the new provider/channel/liff split
