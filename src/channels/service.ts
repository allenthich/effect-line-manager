import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { LineClientRegistry } from "../registry/index.ts";
import { LinePersistenceError, type LineRepositoryError } from "../shared/errors.ts";
import type { LineApiClient } from "../messaging/client.ts";
import type { LineLoginClient } from "../login/client.ts";
import { LineLoginChannelId, LineMessagingChannelId, type LineLoginChannel } from "./domain.ts";
import { LineLoginChannelRepository, LineMessagingChannelRepository } from "./repository.ts";
import { MessagingChannelNotFoundError, LoginChannelNotFoundError } from "./errors.ts";
import { LineChannelId } from "../shared/domain.ts";

export interface LineMessagingChannelServiceApi {
  readonly getClientByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<LineApiClient, MessagingChannelNotFoundError | LinePersistenceError>;
  readonly getAccessTokenByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<string, MessagingChannelNotFoundError | LinePersistenceError>;
  readonly invalidateClientByLineChannelId: (
    id: LineMessagingChannelId,
  ) => Effect.Effect<void, MessagingChannelNotFoundError | LinePersistenceError>;
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
  ) => Effect.Effect<LineLoginChannel, LoginChannelNotFoundError | LinePersistenceError>;
  readonly getLoginClientByLineChannelId: (
    id: LineLoginChannelId,
  ) => Effect.Effect<LineLoginClient, LoginChannelNotFoundError | LinePersistenceError>;
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

const toMessagingNotFoundError = (id: string) =>
  new MessagingChannelNotFoundError({
    channelId: Schema.decodeUnknownSync(LineMessagingChannelId)(id),
  });

const toLoginNotFoundError = (id: string) =>
  new LoginChannelNotFoundError({
    channelId: Schema.decodeUnknownSync(LineLoginChannelId)(id),
  });

export const makeLineMessagingChannelService = Effect.gen(function* () {
  const repository = yield* LineMessagingChannelRepository;
  const registry = yield* LineClientRegistry;

  const getChannelByLineChannelId = (id: LineMessagingChannelId) =>
    repository.findByLineChannelId(id).pipe(
      Effect.catchTag("LineRepositoryError", persistenceFailure),
      Effect.flatMap((channel) =>
        Option.match(channel, {
          onNone: () => Effect.fail(toMessagingNotFoundError(id)),
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
            .getMessagingClient(decodeSharedLineChannelId(channel.channelId))
            .pipe(
              Effect.catchTag("ChannelNotFoundError", () =>
                Effect.die("registry inconsistent: channel found by service but not by registry"),
              ),
              Effect.catchTag("LineRepositoryError", persistenceFailure),
            );
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
        yield* registry.invalidateChannel(decodeSharedLineChannelId(channel.channelId));
      }),
    ),
  });
});

export const makeLineLoginChannelService = Effect.gen(function* () {
  const repository = yield* LineLoginChannelRepository;
  const registry = yield* LineClientRegistry;

  const getByLineChannelId = Effect.fn("LineLoginChannelService.getByLineChannelId")(
    (id: LineLoginChannelId) =>
      repository.findByLineChannelId(id).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.flatMap((channel) =>
          Option.match(channel, {
            onNone: () => Effect.fail(toLoginNotFoundError(id)),
            onSome: Effect.succeed,
          }),
        ),
      ),
  );

  return LineLoginChannelService.of({
    getByLineChannelId,
    getLoginClientByLineChannelId: Effect.fn(
      "LineLoginChannelService.getLoginClientByLineChannelId",
    )((id: LineLoginChannelId) =>
      Effect.gen(function* () {
        const channel = yield* getByLineChannelId(id);
        return yield* registry.getLoginClient(decodeSharedLineChannelId(channel.channelId)).pipe(
          Effect.catchTag("ChannelNotFoundError", () =>
            Effect.die("registry inconsistent: channel found by service but not by registry"),
          ),
          Effect.catchTag("LineRepositoryError", persistenceFailure),
        );
      }),
    ),
  });
});
