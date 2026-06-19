import { Context, Effect, Layer, Option, Schema } from "effect";
import { LineChannelId, type LoginChannel, type MessagingChannel } from "../channel/domain.ts";
import { LineChannelRepository } from "../channel/repository.ts";
import type { LineRepositoryError } from "../shared/errors.ts";
import {
  LineBotUserId,
  LineLoginChannelId,
  LineLoginChannelUid,
  LineMessagingChannelId,
  LineMessagingChannelUid,
  isLineLoginChannel,
  isLineMessagingChannel,
} from "./domain.ts";

export interface LineMessagingChannelRepositoryService {
  readonly findByUid: (
    uid: LineMessagingChannelUid,
  ) => Effect.Effect<Option.Option<MessagingChannel>, LineRepositoryError>;
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
  readonly findByUid: (
    uid: LineLoginChannelUid,
  ) => Effect.Effect<Option.Option<LoginChannel>, LineRepositoryError>;
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

const narrowMessagingChannel = (channel: MessagingChannel | LoginChannel) =>
  isLineMessagingChannel(channel) ? Option.some(channel) : Option.none();

const narrowLoginChannel = (channel: MessagingChannel | LoginChannel) =>
  isLineLoginChannel(channel) ? Option.some(channel) : Option.none();

export const makeLineMessagingChannelRepository = Effect.gen(function* () {
  const repository = yield* LineChannelRepository;

  return LineMessagingChannelRepository.of({
    findByUid: Effect.fn("LineMessagingChannelRepository.findByUid")(
      (uid: LineMessagingChannelUid) =>
        repository.findChannelById(uid).pipe(Effect.map(Option.flatMap(narrowMessagingChannel))),
    ),
    findByLineChannelId: Effect.fn("LineMessagingChannelRepository.findByLineChannelId")(
      (id: LineMessagingChannelId) =>
        repository
          .findChannelByMessagingId(id)
          .pipe(Effect.map(Option.flatMap(narrowMessagingChannel))),
    ),
    findByBotUserId: Effect.fn("LineMessagingChannelRepository.findByBotUserId")(
      (id: LineBotUserId) =>
        repository
          .findChannelByBotUserId(id)
          .pipe(Effect.map(Option.flatMap(narrowMessagingChannel))),
    ),
  });
});

export const makeLineLoginChannelRepository = Effect.gen(function* () {
  const repository = yield* LineChannelRepository;
  const decodeSharedLineChannelId = Schema.decodeUnknownSync(LineChannelId);

  return LineLoginChannelRepository.of({
    findByUid: Effect.fn("LineLoginChannelRepository.findByUid")((uid: LineLoginChannelUid) =>
      repository.findChannelById(uid).pipe(Effect.map(Option.flatMap(narrowLoginChannel))),
    ),
    findByLineChannelId: Effect.fn("LineLoginChannelRepository.findByLineChannelId")(
      (id: LineLoginChannelId) =>
        repository
          .findChannelByMessagingId(decodeSharedLineChannelId(id))
          .pipe(Effect.map(Option.flatMap(narrowLoginChannel))),
    ),
  });
});
