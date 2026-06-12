import { Context, Effect, Layer, Redacted } from "effect";
import {
  type CreateLineAccountInput,
  type CreateLineAccountRecordInput,
  type LineAccount,
  type LineAccountView,
  type LineChannelId,
  type LineChannelRecordId,
  type LineLiffId,
  type LineLoginChannelId,
  type UpdateLineAccountInput,
  type UpdateLineAccountRecordInput,
} from "./domain.ts";
import {
  type LineAccountDuplicateChannelError,
  type LineAccountNotFoundError,
  LineAccountPersistenceError,
  type LineRepositoryError,
} from "./errors.ts";
import { LineClientRegistry } from "./registry.ts";
import { LineRepository } from "./repository.ts";

export interface LineAccountManagementService {
  readonly list: Effect.Effect<ReadonlyArray<LineAccountView>, LineAccountPersistenceError>;
  readonly create: (
    input: CreateLineAccountInput,
  ) => Effect.Effect<
    LineAccountView,
    LineAccountDuplicateChannelError | LineAccountPersistenceError
  >;
  readonly update: (
    id: LineChannelRecordId,
    input: UpdateLineAccountInput,
  ) => Effect.Effect<
    LineAccountView,
    LineAccountNotFoundError | LineAccountDuplicateChannelError | LineAccountPersistenceError
  >;
  readonly delete: (
    id: LineChannelRecordId,
  ) => Effect.Effect<void, LineAccountNotFoundError | LineAccountPersistenceError>;
}

export class LineAccountManagement extends Context.Service<
  LineAccountManagement,
  LineAccountManagementService
>()("effect-line-manager/LineAccountManagement") {
  static get layer() {
    return Layer.effect(LineAccountManagement)(makeLineAccountManagement);
  }
}

export const toLineAccountView = (account: LineAccount): LineAccountView => ({
  id: account.id,
  name: account.name,
  channelId: account.channelId,
  botUserId: account.botUserId ?? null,
  basicId: account.basicId ?? null,
  displayName: account.displayName ?? null,
  pictureUrl: account.pictureUrl ?? null,
  isActive: account.isActive,
  loginChannelId: account.loginChannelId,
  liffId: account.liffId,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
  hasChannelSecret: true,
  hasChannelAccessToken: true,
  hasLoginChannelSecret: account.loginChannelSecret !== null,
});

const persistenceFailure = (error: LineRepositoryError) =>
  Effect.logError("LINE account repository operation failed", error).pipe(
    Effect.andThen(Effect.fail(new LineAccountPersistenceError({ operation: error.operation }))),
  );

const toCreateRecordInput = (input: CreateLineAccountInput): CreateLineAccountRecordInput => ({
  name: input.name,
  channelId: input.channelId as LineChannelId,
  channelSecret: Redacted.make(input.channelSecret),
  channelAccessToken: Redacted.make(input.channelAccessToken),
  loginChannelId: input.loginChannelId as LineLoginChannelId | null,
  loginChannelSecret:
    input.loginChannelSecret === null ? null : Redacted.make(input.loginChannelSecret),
  liffId: input.liffId as LineLiffId | null,
});

const toUpdateRecordInput = (input: UpdateLineAccountInput): UpdateLineAccountRecordInput => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.channelId === undefined ? {} : { channelId: input.channelId as LineChannelId }),
  ...(input.channelSecret === undefined
    ? {}
    : { channelSecret: Redacted.make(input.channelSecret) }),
  ...(input.channelAccessToken === undefined
    ? {}
    : { channelAccessToken: Redacted.make(input.channelAccessToken) }),
  ...(input.loginChannelId === undefined
    ? {}
    : { loginChannelId: input.loginChannelId as LineLoginChannelId | null }),
  ...(input.loginChannelSecret === undefined
    ? {}
    : {
        loginChannelSecret:
          input.loginChannelSecret === null ? null : Redacted.make(input.loginChannelSecret),
      }),
  ...(input.liffId === undefined ? {} : { liffId: input.liffId as LineLiffId | null }),
  ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
});

export const makeLineAccountManagement = Effect.gen(function* () {
  const repository = yield* LineRepository;
  const registry = yield* LineClientRegistry;

  return LineAccountManagement.of({
    list: repository.listAll.pipe(
      Effect.catchTag("LineRepositoryError", persistenceFailure),
      Effect.map((accounts) => accounts.map(toLineAccountView)),
      Effect.withSpan("LineAccountManagement.list"),
    ),
    create: Effect.fn("LineAccountManagement.create")((input: CreateLineAccountInput) =>
      repository.create(toCreateRecordInput(input)).pipe(
        Effect.catchTag("LineRepositoryError", persistenceFailure),
        Effect.tap((account) => registry.invalidate(account.id)),
        Effect.map(toLineAccountView),
      ),
    ),
    update: Effect.fn("LineAccountManagement.update")(
      (id: LineChannelRecordId, input: UpdateLineAccountInput) =>
        repository.update(id, toUpdateRecordInput(input)).pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.tap(() => registry.invalidate(id)),
          Effect.map(toLineAccountView),
        ),
    ),
    delete: Effect.fn("LineAccountManagement.delete")((id: LineChannelRecordId) =>
      repository
        .deleteById(id)
        .pipe(
          Effect.catchTag("LineRepositoryError", persistenceFailure),
          Effect.andThen(registry.invalidate(id)),
        ),
    ),
  });
});
