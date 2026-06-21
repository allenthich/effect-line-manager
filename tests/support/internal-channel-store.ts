import { Layer } from "effect";
import {
  InternalLineChannelStore,
  type InternalLineChannelStoreService,
} from "../../src/internal/channel-store.ts";

export const provideInternalLineChannelStore = (store: InternalLineChannelStoreService) =>
  Layer.succeed(InternalLineChannelStore)(store);
