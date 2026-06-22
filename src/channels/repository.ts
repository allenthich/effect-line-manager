import { Context, type Effect, type Option } from "effect";
import type { LineProviderId } from "../provider/domain.ts";
import type { NormalizedPageQuery, PageResult } from "../shared/domain.ts";
import type {
  CreateMessagingChannelInput,
  CreateLoginChannelInput,
  LineMessagingChannelId,
  LineLoginChannelId,
  LoginChannel,
  MessagingChannel,
  UpdateMessagingChannelInput,
  UpdateLoginChannelInput,
} from "../channel/domain.ts";
import type { ChannelDuplicateError } from "../channel/errors.ts";
import type { LoginChannelNotFoundError, MessagingChannelNotFoundError } from "./errors.ts";
import type { LineRepositoryError } from "../shared/errors.ts";
import type { LineBotUserId } from "./domain.ts";

export interface LineMessagingChannelRepositoryService {
  readonly create: (
    input: CreateMessagingChannelInput,
  ) => Effect.Effect<MessagingChannel, ChannelDuplicateError | LineRepositoryError>;
  readonly update: (
    id: LineMessagingChannelId,
    input: UpdateMessagingChannelInput,
  ) => Effect.Effect<MessagingChannel, MessagingChannelNotFoundError | LineRepositoryError>;
  readonly findByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<Option.Option<MessagingChannel>, LineRepositoryError>;
  readonly findByBotUserId: (
    id: LineBotUserId,
  ) => Effect.Effect<Option.Option<MessagingChannel>, LineRepositoryError>;
  readonly listByProvider: (
    providerId: LineProviderId,
    query: NormalizedPageQuery,
  ) => Effect.Effect<PageResult<MessagingChannel>, LineRepositoryError>;
  readonly delete: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<void, MessagingChannelNotFoundError | LineRepositoryError>;
}

/**
 * Persistence boundary for LINE Messaging API channels (full CRUD).
 *
 * Consumers implement this repository to back the messaging channel service
 * and the registry/management services in the library.
 */
export class LineMessagingChannelRepository extends Context.Service<
  LineMessagingChannelRepository,
  LineMessagingChannelRepositoryService
>()("effect-line-manager/LineMessagingChannelRepository") {}

export interface LineLoginChannelRepositoryService {
  readonly create: (
    input: CreateLoginChannelInput,
  ) => Effect.Effect<LoginChannel, ChannelDuplicateError | LineRepositoryError>;
  readonly update: (
    id: LineLoginChannelId,
    input: UpdateLoginChannelInput,
  ) => Effect.Effect<LoginChannel, LoginChannelNotFoundError | LineRepositoryError>;
  readonly findByLineChannelId: (
    id: LineLoginChannelId,
  ) => Effect.Effect<Option.Option<LoginChannel>, LineRepositoryError>;
  readonly listByProvider: (
    providerId: LineProviderId,
    query: NormalizedPageQuery,
  ) => Effect.Effect<PageResult<LoginChannel>, LineRepositoryError>;
  readonly delete: (
    id: LineLoginChannelId,
  ) => Effect.Effect<void, LoginChannelNotFoundError | LineRepositoryError>;
}

/**
 * Persistence boundary for LINE Login channels (full CRUD).
 *
 * Consumers implement this repository to back the login channel service
 * (LIFF management resolves parent login channels through this port).
 */
export class LineLoginChannelRepository extends Context.Service<
  LineLoginChannelRepository,
  LineLoginChannelRepositoryService
>()("effect-line-manager/LineLoginChannelRepository") {}
