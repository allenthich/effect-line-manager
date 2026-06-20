import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { LineClientRegistry } from "../registry/index.ts";
import { LinePersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import type { LineApiClient } from "../messaging/client.ts";
import { LineLoginChannelId, LineMessagingChannelId, type LineLoginChannel } from "./domain.ts";
import { LineLoginChannelRepository, LineMessagingChannelRepository } from "./repository.ts";
import { ChannelNotFoundError } from "../channel/errors.ts";
import { LineChannelId } from "../channel/domain.ts";

export interface LineMessagingChannelServiceApi {
  readonly getClientByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<LineApiClient, ChannelNotFoundError | LinePersistenceError>;
  readonly getAccessTokenByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<string, ChannelNotFoundError | LinePersistenceError>;
  readonly invalidateClientByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<void, ChannelNotFoundError | LinePersistenceError>;
}

export class LineMessagingChannelService extends Context.Service<
  LineMessagingChannelService,
  LineMessagingChannelServiceApi
>()("effect-line-manager/LineMessagingChannelService") {
  static get layer() {
    return Layer.effect(LineMessagingChannelService)(makeLineMessagingChannelService);
  }
}

export interface LineLoginChannelServiceApi {
  readonly getByLineChannelId: (
    id: LineLoginChannelId,
  ) => Effect.Effect<LineLoginChannel, ChannelNotFoundError | LinePersistenceError>;
}

export class LineLoginChannelService extends Context.Service<
  LineLoginChannelService,
  LineLoginChannelServiceApi
>()("effect-line-manager/LineLoginChannelService") {
  static get layer() {
    return Layer.effect(LineLoginChannelService)(makeLineLoginChannelService);
  }
}

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE channel repository operation failed", error).pipe(
    Effect.andThen(
      Effect.fail(
        new LinePersistenceError({
          operation: error.operation,
        }),
      ),
    ),
  );

const decodeSharedLineChannelId = Schema.decodeUnknownSync(LineChannelId);

const toChannelNotFoundError = (id: string) =>
  new ChannelNotFoundError({
    channelId: decodeSharedLineChannelId(id),
  });

export const makeLineMessagingChannelService = Effect.gen(function* () {
  const repository = yield* LineMessagingChannelRepository;
  const registry = yield* LineClientRegistry;

  const getChannelByLineChannelId = (id: LineMessagingChannelId) =>
    repository.findByLineChannelId(id).pipe(
      Effect.catchTag("LineRepositoryError", persistenceFailure),
      Effect.flatMap((channel) =>
        Option.match(channel, {
          onNone: () => Effect.fail(toChannelNotFoundError(id)),
          onSome: Effect.succeed,
        }),
      ),
    );

  return LineMessagingChannelService.of({
    getClientByLineChannelId: Effect.fn("LineMessagingChannelService.getClientByLineChannelId")(
      (id: LineMessagingChannelId) =>
        Effect.gen(function* () {
          const channel = yield* getChannelByLineChannelId(id);
          return yield* registry
            .getMessagingClient(channel.channelId)
            .pipe(Effect.catchTag("LineRepositoryError", persistenceFailure));
        }),
    ),
    getAccessTokenByLineChannelId: Effect.fn(
      "LineMessagingChannelService.getAccessTokenByLineChannelId",
    )((id: LineMessagingChannelId) =>
      Effect.map(getChannelByLineChannelId(id), (channel) =>
        Redacted.value(channel.channelAccessToken),
      ),
    ),
    invalidateClientByLineChannelId: Effect.fn(
      "LineMessagingChannelService.invalidateClientByLineChannelId",
    )((id: LineMessagingChannelId) =>
      Effect.gen(function* () {
        const channel = yield* getChannelByLineChannelId(id);
        yield* registry.invalidateChannel(channel.channelId);
      }),
    ),
  });
});

export const makeLineLoginChannelService = Effect.gen(function* () {
  const repository = yield* LineLoginChannelRepository;

  return LineLoginChannelService.of({
    getByLineChannelId: Effect.fn("LineLoginChannelService.getByLineChannelId")(
      (id: LineLoginChannelId) =>
        repository.findByLineChannelId(id).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.flatMap((channel) =>
            Option.match(channel, {
              onNone: () => Effect.fail(toChannelNotFoundError(id)),
              onSome: Effect.succeed,
            }),
          ),
        ),
    ),
  });
});
