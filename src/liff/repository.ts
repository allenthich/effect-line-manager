import { Context, type Effect, type Option } from "effect";
import type { LineChannelUid } from "../channel/domain.ts";
import type {
  CreateLiffAppRecordInput,
  LineLiffApp,
  LineLiffUid,
  UpdateLiffAppRecordInput,
} from "./domain.ts";
import type { LiffAppDuplicateError, LiffAppNotFoundError } from "./errors.ts";
import type { LineRepositoryError } from "../shared/errors.ts";

/** Repository service for persisting LIFF application data. */
export class LineLiffRepository extends Context.Service<
  LineLiffRepository,
  {
    readonly createLiffApp: (
      input: CreateLiffAppRecordInput,
    ) => Effect.Effect<LineLiffApp, LiffAppDuplicateError | LineRepositoryError>;

    readonly updateLiffApp: (
      id: LineLiffUid,
      input: UpdateLiffAppRecordInput,
    ) => Effect.Effect<LineLiffApp, LiffAppNotFoundError | LineRepositoryError>;

    readonly findLiffAppByUid: (
      id: LineLiffUid,
    ) => Effect.Effect<Option.Option<LineLiffApp>, LineRepositoryError>;

    readonly listLiffAppsByChannel: (
      channelId: LineChannelUid,
    ) => Effect.Effect<ReadonlyArray<LineLiffApp>, LineRepositoryError>;

    readonly deleteLiffApp: (
      id: LineLiffUid,
    ) => Effect.Effect<void, LiffAppNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineLiffRepository") {}

/** Extracted service type for the LIFF repository. */
export type LineLiffRepositoryService = LineLiffRepository["Service"];
