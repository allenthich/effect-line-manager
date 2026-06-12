import { Effect, Schema } from "effect";
import { HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi";
import { LineRepositoryOperation } from "../account/errors.ts";

export class LineAccountValidationError extends Schema.TaggedErrorClass<LineAccountValidationError>()(
  "LineAccountValidationError",
  {
    message: Schema.String,
  },
  { httpApiStatus: 400 },
) {}

export class LineAccountNotFoundHttpError extends Schema.TaggedErrorClass<LineAccountNotFoundHttpError>()(
  "LineAccountNotFoundHttpError",
  {
    recordId: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

export class LineAccountDuplicateChannelHttpError extends Schema.TaggedErrorClass<LineAccountDuplicateChannelHttpError>()(
  "LineAccountDuplicateChannelHttpError",
  {
    channelId: Schema.String,
  },
  { httpApiStatus: 409 },
) {}

export class LineAccountPersistenceHttpError extends Schema.TaggedErrorClass<LineAccountPersistenceHttpError>()(
  "LineAccountPersistenceHttpError",
  {
    operation: LineRepositoryOperation,
  },
  { httpApiStatus: 500 },
) {}

export class LineAccountValidationMiddleware extends HttpApiMiddleware.Service<LineAccountValidationMiddleware>()(
  "effect-line-manager/httpapi/LineAccountValidationMiddleware",
  {
    error: LineAccountValidationError.pipe(HttpApiSchema.status(400)),
  },
) {}

export const LineAccountValidationMiddlewareLayer = HttpApiMiddleware.layerSchemaErrorTransform(
  LineAccountValidationMiddleware,
  () =>
    Effect.fail(
      new LineAccountValidationError({
        message: "The request did not match the expected schema.",
      }),
    ),
);
