import { Layer } from "effect";
import { type LineChannelRepositoryService } from "../../src/channel/repository.ts";
import {
  InternalLineChannelStore,
  type InternalLineChannelStoreService,
} from "../../src/internal/channel-store.ts";

export const fromLegacyLineChannelRepository = (
  repository: LineChannelRepositoryService,
): InternalLineChannelStoreService => ({
  create: repository.createChannel,
  update: repository.updateChannel,
  findByLineChannelId: repository.findChannelByLineChannelId,
  findByBotUserId: repository.findChannelByBotUserId,
  listByProvider: repository.listChannelsByProvider,
  delete: repository.deleteChannel,
});

export const provideInternalLineChannelStore = (repository: LineChannelRepositoryService) =>
  Layer.succeed(InternalLineChannelStore)(fromLegacyLineChannelRepository(repository));
