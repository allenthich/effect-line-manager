import { LineLiffRepository } from "./liff/repository.ts";
import { LineLiffManagement } from "./liff/service.ts";
import { LineProviderRepository } from "./provider/repository.ts";
import { LineProviderManagement } from "./provider/service.ts";
import {
  LineLoginChannelRepository,
  LineMessagingChannelRepository,
} from "./channels/repository.ts";
import { LineLoginChannelService, LineMessagingChannelService } from "./channels/service.ts";

export const LineMessagingChannels = {
  Repository: LineMessagingChannelRepository,
  Service: LineMessagingChannelService,
} as const;

export const LineLoginChannels = {
  Repository: LineLoginChannelRepository,
  Service: LineLoginChannelService,
} as const;

export const LineProviders = {
  Repository: LineProviderRepository,
  Service: LineProviderManagement,
} as const;

export const LineLiffApps = {
  Repository: LineLiffRepository,
  Service: LineLiffManagement,
} as const;
