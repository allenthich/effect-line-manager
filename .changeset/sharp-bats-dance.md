---
"effect-line-manager": patch
---

- Removed the legacy `LineChannelRepository` symbol and `LineChannelRepositoryService` type. The persistence port for channels is `InternalLineChannelStore`; hosts implement its methods (`create`, `update`, `findByLineChannelId`, `findByBotUserId`, `listByProvider`, `delete`) directly via `Layer.effect(InternalLineChannelStore)(...)`.
- Added `LineLoginChannelService.getLoginClientByLineChannelId(id: LineLoginChannelId)` mirroring the messaging service's `getClientByLineChannelId`. Login consumers no longer need to drop down to `LineClientRegistry.getLoginClient` and bridge the brand conversion themselves.
- Documented the three persistence ports hosts must implement (`InternalLineChannelStore`, `LineProviderRepository`, `LineLiffRepository`) in `docs/INTEGRATION.md` with a skeleton `Layer.effect` block.
- Updated intent docs to record the removal of `LineChannelRepository` and point consumers at `InternalLineChannelStore`.
