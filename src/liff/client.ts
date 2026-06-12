import { Cause, Effect, Redacted, Schema, type Duration } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import {
  LineLiffApiAuthenticationError,
  LineLiffApiRateLimitError,
  LineLiffApiResponseError,
  LineLiffApiTimeoutError,
  LineLiffApiTransportError,
  LineLiffRequestEncodingError,
  type LineLiffOperation,
} from "./errors.ts";

const defaultBaseUrl = "https://api.line.me";
const defaultRequestTimeout = "30 seconds";

export interface LineLiffClientConfig {
  readonly baseUrl?: string | undefined;
  readonly requestTimeout?: Duration.Input | undefined;
}

export type LineLiffClientError =
  | LineLiffApiTransportError
  | LineLiffApiTimeoutError
  | LineLiffApiAuthenticationError
  | LineLiffApiRateLimitError
  | LineLiffApiResponseError
  | LineLiffRequestEncodingError;

const LiffViewSchema = Schema.Struct({
  type: Schema.Literals(["compact", "tall", "full"]),
  url: Schema.String,
});

const LiffAppSchema = Schema.Struct({
  liffId: Schema.String,
  view: LiffViewSchema,
  description: Schema.optional(Schema.String),
});

const GetLiffAppsResponseSchema = Schema.Struct({
  apps: Schema.Array(LiffAppSchema),
});

const CreateLiffAppResponseSchema = Schema.Struct({
  liffId: Schema.String,
});

export interface LineLiffClient {
  readonly getLiffApps: Effect.Effect<
    ReadonlyArray<{
      readonly liffId: string;
      readonly view: {
        readonly type: "compact" | "tall" | "full";
        readonly url: string;
      };
      readonly description?: string | undefined;
    }>,
    LineLiffClientError
  >;

  readonly getLiffApp: (liffId: string) => Effect.Effect<
    {
      readonly liffId: string;
      readonly view: {
        readonly type: "compact" | "tall" | "full";
        readonly url: string;
      };
      readonly description?: string | undefined;
    },
    LineLiffClientError
  >;

  readonly createLiffApp: (app: {
    readonly view: {
      readonly type: "compact" | "tall" | "full";
      readonly url: string;
    };
    readonly description?: string | undefined;
  }) => Effect.Effect<string, LineLiffClientError>;

  readonly updateLiffApp: (
    liffId: string,
    app: {
      readonly view: {
        readonly type: "compact" | "tall" | "full";
        readonly url: string;
      };
      readonly description?: string | undefined;
    },
  ) => Effect.Effect<void, LineLiffClientError>;

  readonly deleteLiffApp: (liffId: string) => Effect.Effect<void, LineLiffClientError>;
}

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const sanitizedCause = (cause: unknown): Error => {
  if (typeof cause === "object" && cause !== null && "reason" in cause) {
    const reason = cause.reason;
    if (typeof reason === "object" && reason !== null && "_tag" in reason) {
      return new Error(String(reason._tag));
    }
  }
  return new Error("UnknownHttpError");
};

export const makeLineLiffClient = (
  httpClient: HttpClient.HttpClient,
  channelAccessToken: Redacted.Redacted<string>,
  config: LineLiffClientConfig = {},
): LineLiffClient => {
  const rootUrl = withoutTrailingSlash(config.baseUrl ?? defaultBaseUrl);
  const requestTimeout = config.requestTimeout ?? defaultRequestTimeout;

  const handleFailureResponse = (
    operation: LineLiffOperation,
    status: number,
    responseBody: string,
    headers: Record<string, string>,
  ) =>
    Effect.gen(function* () {
      const requestId = headers["x-line-request-id"];
      const token = Redacted.value(channelAccessToken);
      const sanitizedBody =
        token.length === 0 ? responseBody : responseBody.replaceAll(token, "[REDACTED]");
      const responseFields = {
        operation,
        body: sanitizedBody,
        ...(requestId === undefined ? {} : { requestId }),
      };

      if (status === 401 || status === 403) {
        return yield* new LineLiffApiAuthenticationError({
          ...responseFields,
          status,
        });
      }
      if (status === 429) {
        const retryAfter = headers["retry-after"];
        return yield* new LineLiffApiRateLimitError({
          ...responseFields,
          status: 429,
          ...(retryAfter === undefined ? {} : { retryAfter }),
        });
      }
      return yield* new LineLiffApiResponseError({
        ...responseFields,
        status,
      });
    });

  return {
    getLiffApps: Effect.gen(function* () {
      const operation: LineLiffOperation = "getLiffApps";
      yield* Effect.annotateCurrentSpan({ operation });

      const request = HttpClientRequest.get(`${rootUrl}/liff/v1/apps`).pipe(
        HttpClientRequest.bearerToken(channelAccessToken),
      );

      const response = yield* httpClient
        .execute(request)
        .pipe(
          Effect.mapError(
            (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

      if (response.status >= 200 && response.status < 300) {
        const bodyJson = yield* response.json.pipe(
          Effect.mapError(
            (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );
        const parsed = yield* Schema.decodeUnknownEffect(GetLiffAppsResponseSchema)(bodyJson).pipe(
          Effect.mapError(
            (cause) =>
              new LineLiffRequestEncodingError({
                operation,
                cause: sanitizedCause(cause),
              }),
          ),
        );
        return parsed.apps;
      }

      const responseBody = yield* response.text.pipe(
        Effect.mapError(
          (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
        ),
      );

      return yield* handleFailureResponse(
        operation,
        response.status,
        responseBody,
        response.headers,
      );
    }).pipe(
      Effect.withSpan("LineLiffClient.getLiffApps"),
      Effect.timeout(requestTimeout),
      Effect.mapError((cause) =>
        Cause.isTimeoutError(cause)
          ? new LineLiffApiTimeoutError({ operation: "getLiffApps" })
          : cause,
      ),
    ),

    getLiffApp: (liffId) =>
      Effect.gen(function* () {
        const operation: LineLiffOperation = "getLiffApp";
        yield* Effect.annotateCurrentSpan({ operation });

        const request = HttpClientRequest.get(`${rootUrl}/liff/v1/apps/${liffId}`).pipe(
          HttpClientRequest.bearerToken(channelAccessToken),
        );

        const response = yield* httpClient
          .execute(request)
          .pipe(
            Effect.mapError(
              (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );

        if (response.status >= 200 && response.status < 300) {
          const bodyJson = yield* response.json.pipe(
            Effect.mapError(
              (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );
          return yield* Schema.decodeUnknownEffect(LiffAppSchema)(bodyJson).pipe(
            Effect.mapError(
              (cause) =>
                new LineLiffRequestEncodingError({
                  operation,
                  cause: sanitizedCause(cause),
                }),
            ),
          );
        }

        const responseBody = yield* response.text.pipe(
          Effect.mapError(
            (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

        return yield* handleFailureResponse(
          operation,
          response.status,
          responseBody,
          response.headers,
        );
      }).pipe(
        Effect.timeout(requestTimeout),
        Effect.mapError((cause) =>
          Cause.isTimeoutError(cause)
            ? new LineLiffApiTimeoutError({ operation: "getLiffApp" })
            : cause,
        ),
      ),

    createLiffApp: (app) =>
      Effect.gen(function* () {
        const operation: LineLiffOperation = "createLiffApp";
        yield* Effect.annotateCurrentSpan({ operation });

        const request = yield* HttpClientRequest.post(`${rootUrl}/liff/v1/apps`).pipe(
          HttpClientRequest.bearerToken(channelAccessToken),
          HttpClientRequest.schemaBodyJson(
            Schema.Struct({
              view: LiffViewSchema,
              description: Schema.optional(Schema.String),
            }),
          )(app),
          Effect.mapError(
            (cause) =>
              new LineLiffRequestEncodingError({
                operation,
                cause: sanitizedCause(cause),
              }),
          ),
        );

        const response = yield* httpClient
          .execute(request)
          .pipe(
            Effect.mapError(
              (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );

        if (response.status >= 200 && response.status < 300) {
          const bodyJson = yield* response.json.pipe(
            Effect.mapError(
              (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );
          const parsed = yield* Schema.decodeUnknownEffect(CreateLiffAppResponseSchema)(
            bodyJson,
          ).pipe(
            Effect.mapError(
              (cause) =>
                new LineLiffRequestEncodingError({
                  operation,
                  cause: sanitizedCause(cause),
                }),
            ),
          );
          return parsed.liffId;
        }

        const responseBody = yield* response.text.pipe(
          Effect.mapError(
            (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

        return yield* handleFailureResponse(
          operation,
          response.status,
          responseBody,
          response.headers,
        );
      }).pipe(
        Effect.timeout(requestTimeout),
        Effect.mapError((cause) =>
          Cause.isTimeoutError(cause)
            ? new LineLiffApiTimeoutError({ operation: "createLiffApp" })
            : cause,
        ),
      ),

    updateLiffApp: (liffId, app) =>
      Effect.gen(function* () {
        const operation: LineLiffOperation = "updateLiffApp";
        yield* Effect.annotateCurrentSpan({ operation });

        const request = yield* HttpClientRequest.put(`${rootUrl}/liff/v1/apps/${liffId}`).pipe(
          HttpClientRequest.bearerToken(channelAccessToken),
          HttpClientRequest.schemaBodyJson(
            Schema.Struct({
              view: LiffViewSchema,
              description: Schema.optional(Schema.String),
            }),
          )(app),
          Effect.mapError(
            (cause) =>
              new LineLiffRequestEncodingError({
                operation,
                cause: sanitizedCause(cause),
              }),
          ),
        );

        const response = yield* httpClient
          .execute(request)
          .pipe(
            Effect.mapError(
              (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );

        if (response.status >= 200 && response.status < 300) {
          return;
        }

        const responseBody = yield* response.text.pipe(
          Effect.mapError(
            (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

        return yield* handleFailureResponse(
          operation,
          response.status,
          responseBody,
          response.headers,
        );
      }).pipe(
        Effect.timeout(requestTimeout),
        Effect.mapError((cause) =>
          Cause.isTimeoutError(cause)
            ? new LineLiffApiTimeoutError({ operation: "updateLiffApp" })
            : cause,
        ),
      ),

    deleteLiffApp: (liffId) =>
      Effect.gen(function* () {
        const operation: LineLiffOperation = "deleteLiffApp";
        yield* Effect.annotateCurrentSpan({ operation });

        const request = HttpClientRequest.delete(`${rootUrl}/liff/v1/apps/${liffId}`).pipe(
          HttpClientRequest.bearerToken(channelAccessToken),
        );

        const response = yield* httpClient
          .execute(request)
          .pipe(
            Effect.mapError(
              (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );

        if (response.status >= 200 && response.status < 300) {
          return;
        }

        const responseBody = yield* response.text.pipe(
          Effect.mapError(
            (cause) => new LineLiffApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

        return yield* handleFailureResponse(
          operation,
          response.status,
          responseBody,
          response.headers,
        );
      }).pipe(
        Effect.timeout(requestTimeout),
        Effect.mapError((cause) =>
          Cause.isTimeoutError(cause)
            ? new LineLiffApiTimeoutError({ operation: "deleteLiffApp" })
            : cause,
        ),
      ),
  };
};
