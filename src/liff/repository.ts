import { Context, type Effect, type Option } from "effect";
import type { LineLoginChannelId } from "../shared/domain.ts";
import type { NormalizedPageQuery, PageResult } from "../shared/domain.ts";
import type {
  CreateLiffAppRecordInput,
  LineLiffApp,
  LineLiffId,
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
      id: LineLiffId,
      input: UpdateLiffAppRecordInput,
    ) => Effect.Effect<LineLiffApp, LiffAppNotFoundError | LineRepositoryError>;

    readonly findLiffAppByLiffId: (
      id: LineLiffId,
    ) => Effect.Effect<Option.Option<LineLiffApp>, LineRepositoryError>;

    readonly listLiffAppsByChannel: (
      channelId: LineLoginChannelId,
      query: NormalizedPageQuery,
    ) => Effect.Effect<PageResult<LineLiffApp>, LineRepositoryError>;

    readonly deleteLiffApp: (
      id: LineLiffId,
    ) => Effect.Effect<void, LiffAppNotFoundError | LineRepositoryError>;
  }
>()("effect-line-manager/LineLiffRepository") {}

/** Extracted service type for the LIFF repository. */
export type LineLiffRepositoryService = LineLiffRepository["Service"];
