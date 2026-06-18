import { Context, type Effect, type Option } from "effect";
import type { LineChannelRecordId } from "../channel/domain.ts";
import type {
  CreateLiffAppRecordInput,
  LineLiffApp,
  LineLiffRecordId,
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
      id: LineLiffRecordId,
      input: UpdateLiffAppRecordInput,
    ) => Effect.Effect<LineLiffApp, LiffAppNotFoundError | LineRepositoryError>;

    readonly findLiffAppById: (
      id: LineLiffRecordId,
    ) => Effect.Effect<Option.Option<LineLiffApp>, LineRepositoryError>;

    readonly listLiffAppsByChannel: (
      channelId: LineChannelRecordId,
    ) => Effect.Effect<ReadonlyArray<LineLiffApp>, LineRepositoryError>;

    readonly deleteLiffApp: (
      id: LineLiffRecordId,
    ) => Effect.Effect<void, LiffAppNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineLiffRepository") {}

/** Extracted service type for the LIFF repository. */
export type LineLiffRepositoryService = LineLiffRepository["Service"];
