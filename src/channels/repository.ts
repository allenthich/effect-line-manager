import { Context, Effect, Layer, Option, Schema } from "effect";
import { LineChannelId, type LoginChannel, type MessagingChannel } from "../channel/domain.ts";
import { LineChannelRepository } from "../channel/repository.ts";
import type { LineRepositoryError } from "../shared/errors.ts";
import {
  LineBotUserId,
  LineLoginChannelId,
  LineMessagingChannelId,
  isLineLoginChannel,
  isLineMessagingChannel,
} from "./domain.ts";

export interface LineMessagingChannelRepositoryService {
  readonly findByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<Option.Option<MessagingChannel>, LineRepositoryError>;
  readonly findByBotUserId: (
    id: LineBotUserId,
  ) => Effect.Effect<Option.Option<MessagingChannel>, LineRepositoryError>;
}

export class LineMessagingChannelRepository extends Context.Service<
  LineMessagingChannelRepository,
  LineMessagingChannelRepositoryService
>()("effect-line-manager/LineMessagingChannelRepository") {
  static get layer() {
    return Layer.effect(LineMessagingChannelRepository)(makeLineMessagingChannelRepository);
  }
}

export interface LineLoginChannelRepositoryService {
  readonly findByLineChannelId: (
    id: LineLoginChannelId,
  ) => Effect.Effect<Option.Option<LoginChannel>, LineRepositoryError>;
}

export class LineLoginChannelRepository extends Context.Service<
  LineLoginChannelRepository,
  LineLoginChannelRepositoryService
>()("effect-line-manager/LineLoginChannelRepository") {
  static get layer() {
    return Layer.effect(LineLoginChannelRepository)(makeLineLoginChannelRepository);
  }
}

const narrowMessagingChannel = (
  channel: MessagingChannel | LoginChannel,
): Option.Option<MessagingChannel> =>
  isLineMessagingChannel(channel) ? Option.some(channel) : Option.none();

const narrowLoginChannel = (
  channel: MessagingChannel | LoginChannel,
): Option.Option<LoginChannel> =>
  isLineLoginChannel(channel) ? Option.some(channel) : Option.none();

const decodeSharedLineChannelId = Schema.decodeUnknownSync(LineChannelId);

export const makeLineMessagingChannelRepository = Effect.gen(function* () {
  const repository = yield* LineChannelRepository;

  return LineMessagingChannelRepository.of({
    findByLineChannelId: Effect.fn("LineMessagingChannelRepository.findByLineChannelId")(
      (id: LineMessagingChannelId) =>
        repository
          .findByLineChannelId(decodeSharedLineChannelId(id))
          .pipe(Effect.map(Option.flatMap(narrowMessagingChannel))),
    ),
    findByBotUserId: Effect.fn("LineMessagingChannelRepository.findByBotUserId")(
      (id: LineBotUserId) =>
        repository.findByBotUserId(id).pipe(Effect.map(Option.flatMap(narrowMessagingChannel))),
    ),
  });
});

export const makeLineLoginChannelRepository = Effect.gen(function* () {
  const repository = yield* LineChannelRepository;

  return LineLoginChannelRepository.of({
    findByLineChannelId: Effect.fn("LineLoginChannelRepository.findByLineChannelId")(
      (id: LineLoginChannelId) =>
        repository
          .findByLineChannelId(decodeSharedLineChannelId(id))
          .pipe(Effect.map(Option.flatMap(narrowLoginChannel))),
    ),
  });
});
