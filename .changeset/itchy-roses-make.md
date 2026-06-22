---
"effect-line-manager": patch
---

Removed combined channel shim surface and split web UI into messaging and login

BREAKING CHANGE: LineProviderManagementAdapter no longer exposes listChannels / getChannel /
createChannel / updateChannel / deleteChannel / syncChannel. Use the aggregate-specific
methods (listMessagingChannels, createLoginChannel, etc.) instead.

ChannelView, ChannelListPage, CreateChannelInput, UpdateChannelInput, ListChannelsQuery,
and src/adapter/compat.ts are removed.

LineAccountFormType is now a 4-variant union: "provider" | "messagingChannel" |
"loginChannel" | "liff" (was 3-variant "provider" | "channel" | "liff").

LineAccountOperation (emitted via line-account-error events) is now 20 aggregatespecific ops
(listMessagingChannels, createLoginChannel, deleteLiffApp, etc.) instead of the 14 generic
ones (listChannels, createChannel, syncChannel, etc.). External listeners branching on
operation must update.

syncMessagingChannel? remains optional on the adapter interface; UI hides the Sync button
when adapter.syncMessagingChannel === undefined and never renders Sync for login channels.

HTTP API: /line-channels routes are removed; use /line-messaging-channels and
/line-login-channels (added in the previous release).

Migration:

- Adapter callers: replace listChannels() with listMessagingChannels() + listLoginChannels().
- Web UI consumers: update any code branching on type === "channel" to dispatch on
  "messagingChannel" | "loginChannel".
