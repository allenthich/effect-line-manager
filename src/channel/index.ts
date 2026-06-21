// Explicit re-exports keep management-service API shapes (CreateChannelInput,
// ChannelView, etc.) and the internal makeLineChannelManagement generator
// private to the library. Consumers only need the persistence boundary,
// management service tag, brands, record-input types, and errors.
export {
  LineChannelId,
  LineMessagingChannelId,
  LineLoginChannelId,
  MessagingChannel,
  LoginChannel,
  LineChannel,
  CreateChannelRecordInput,
  UpdateChannelRecordInput,
} from "./domain.ts";

export { ChannelNotFoundError, ChannelDuplicateError } from "./errors.ts";

export { LineChannelRepository, type LineChannelRepositoryService } from "./repository.ts";

export { LineChannelManagement, type LineChannelManagementService } from "./service.ts";
