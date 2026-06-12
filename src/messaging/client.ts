import { Cause, Effect, Redacted, Schema, type Duration } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import {
  LineApiAuthenticationError,
  LineApiRateLimitError,
  LineApiResponseError,
  LineApiTimeoutError,
  LineApiTransportError,
  LineRequestEncodingError,
  type LineApiOperation,
} from "./errors.ts";

const defaultBaseUrl = "https://api.line.me";
const defaultRequestTimeout = "30 seconds";

export const LineTextMessage = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
});

export type LineTextMessage = typeof LineTextMessage.Type;

export type LineMessageTuple =
  | readonly [LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage, LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage, LineTextMessage, LineTextMessage]
  | readonly [LineTextMessage, LineTextMessage, LineTextMessage, LineTextMessage, LineTextMessage];

export const LineMessages = Schema.NonEmptyArray(LineTextMessage).check(Schema.isMaxLength(5));

export type LineMessages = typeof LineMessages.Type;

const PushMessageBody = Schema.Struct({
  to: Schema.String,
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
});

const ReplyMessageBody = Schema.Struct({
  replyToken: Schema.String,
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
});

const BotInfoResponse = Schema.Struct({
  userId: Schema.String,
  basicId: Schema.String,
  displayName: Schema.String,
  pictureUrl: Schema.optional(Schema.String),
});

export interface LinePushOptions {
  readonly retryKey?: string | undefined;
  readonly notificationDisabled?: boolean | undefined;
}

export interface LineReplyOptions {
  readonly notificationDisabled?: boolean | undefined;
}

export interface LineApiClientConfig {
  readonly baseUrl?: string | undefined;
  readonly requestTimeout?: Duration.Input | undefined;
}

export type LineApiClientError =
  | LineApiTransportError
  | LineApiTimeoutError
  | LineApiAuthenticationError
  | LineApiRateLimitError
  | LineApiResponseError
  | LineRequestEncodingError;

const MulticastMessageBody = Schema.Struct({
  to: Schema.Array(Schema.String),
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
});

const NarrowcastMessageBody = Schema.Struct({
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
  recipient: Schema.optional(Schema.Unknown),
  filter: Schema.optional(Schema.Unknown),
  limit: Schema.optional(Schema.Unknown),
});

export interface LineMulticastOptions {
  readonly retryKey?: string | undefined;
  readonly notificationDisabled?: boolean | undefined;
}

export interface LineNarrowcastOptions {
  readonly retryKey?: string | undefined;
  readonly notificationDisabled?: boolean | undefined;
  readonly limit?: { readonly max: number; readonly remaining?: boolean } | undefined;
  readonly recipient?:
    | { readonly type: "operator" }
    | { readonly type: "audience"; readonly audienceGroupId: number }
    | undefined;
  readonly filter?: { readonly demographic?: Record<string, string> } | undefined;
}

export interface LineApiClient {
  readonly getBotInfo: Effect.Effect<
    {
      readonly userId: string;
      readonly basicId: string;
      readonly displayName: string;
      readonly pictureUrl?: string | undefined;
    },
    LineApiClientError
  >;
  readonly pushMessage: (
    recipientId: string,
    messages: LineMessageTuple,
    options?: LinePushOptions,
  ) => Effect.Effect<void, LineApiClientError>;
  readonly replyMessage: (
    replyToken: string,
    messages: LineMessageTuple,
    options?: LineReplyOptions,
  ) => Effect.Effect<void, LineApiClientError>;

  readonly multicastMessage: (
    recipientIds: readonly string[],
    messages: LineMessageTuple,
    options?: LineMulticastOptions,
  ) => Effect.Effect<void, LineApiClientError>;

  readonly narrowcastMessage: (
    messages: LineMessageTuple,
    options?: LineNarrowcastOptions,
  ) => Effect.Effect<void, LineApiClientError>;
}

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const sanitizedCause = (cause: unknown): Error => {
  if (typeof cause !== "object" || cause === null) {
    return new Error("UnknownHttpError");
  }

  if ("reason" in cause) {
    const reason = cause.reason;
    if (typeof reason === "object" && reason !== null && "_tag" in reason) {
      return new Error(String(reason._tag));
    }
  }

  if ("_tag" in cause) {
    return new Error(String(cause._tag));
  }

  return new Error("UnknownHttpError");
};

export const makeLineApiClient = (
  httpClient: HttpClient.HttpClient,
  channelAccessToken: Redacted.Redacted<string>,
  config: LineApiClientConfig = {},
): LineApiClient => {
  const rootUrl = withoutTrailingSlash(config.baseUrl ?? defaultBaseUrl);
  const requestTimeout = config.requestTimeout ?? defaultRequestTimeout;

  const handleFailureResponse = (
    operation: LineApiOperation,
    status: number,
    responseBody: string,
    headers: Record<string, string>,
  ) =>
    Effect.gen(function* () {
      const requestId = headers["x-line-request-id"];
      const acceptedRequestId = headers["x-line-accepted-request-id"];
      const token = Redacted.value(channelAccessToken);
      const sanitizedBody =
        token.length === 0 ? responseBody : responseBody.replaceAll(token, "[REDACTED]");
      const responseFields = {
        operation,
        body: sanitizedBody,
        ...(requestId === undefined ? {} : { requestId }),
        ...(acceptedRequestId === undefined ? {} : { acceptedRequestId }),
      };

      if (status === 401 || status === 403) {
        return yield* new LineApiAuthenticationError({
          ...responseFields,
          status,
        });
      }
      if (status === 429) {
        const retryAfter = headers["retry-after"];
        return yield* new LineApiRateLimitError({
          ...responseFields,
          status: 429,
          ...(retryAfter === undefined ? {} : { retryAfter }),
        });
      }
      return yield* new LineApiResponseError({
        ...responseFields,
        status,
      });
    });

  const executePost = <S extends Schema.Top & { readonly EncodingServices: never }>(
    operation: LineApiOperation,
    path: string,
    schema: S,
    body: S["Type"],
    retryKey?: string,
  ): Effect.Effect<void, LineApiClientError> =>
    Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan({ operation });

      const request = yield* HttpClientRequest.post(`${rootUrl}${path}`).pipe(
        HttpClientRequest.bearerToken(channelAccessToken),
        HttpClientRequest.schemaBodyJson(schema)(body),
        Effect.map((request) =>
          retryKey === undefined
            ? request
            : HttpClientRequest.setHeader(request, "X-Line-Retry-Key", retryKey),
        ),
        Effect.mapError(
          (error) =>
            new LineRequestEncodingError({
              operation,
              cause: sanitizedCause(error),
            }),
        ),
      );

      const response = yield* httpClient
        .execute(request)
        .pipe(
          Effect.mapError(
            (cause) => new LineApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

      if (response.status >= 200 && response.status < 300) {
        return;
      }

      const responseBody = yield* response.text.pipe(
        Effect.mapError(
          (cause) => new LineApiTransportError({ operation, cause: sanitizedCause(cause) }),
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
      Effect.mapError((error) =>
        Cause.isTimeoutError(error) ? new LineApiTimeoutError({ operation }) : error,
      ),
    );

  const executeGet = <S extends Schema.Top & { readonly EncodingServices: never }>(
    operation: LineApiOperation,
    path: string,
    schema: S,
  ): Effect.Effect<S["Type"], LineApiClientError, S["DecodingServices"]> =>
    Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan({ operation });

      const request = HttpClientRequest.get(`${rootUrl}${path}`).pipe(
        HttpClientRequest.bearerToken(channelAccessToken),
      );

      const response = yield* httpClient
        .execute(request)
        .pipe(
          Effect.mapError(
            (cause) => new LineApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

      if (response.status >= 200 && response.status < 300) {
        const bodyJson = yield* response.json.pipe(
          Effect.mapError(
            (cause) => new LineApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );
        return yield* Schema.decodeUnknownEffect(schema)(bodyJson).pipe(
          Effect.mapError(
            (error) =>
              new LineRequestEncodingError({
                operation,
                cause: sanitizedCause(error),
              }),
          ),
        );
      }

      const responseBody = yield* response.text.pipe(
        Effect.mapError(
          (cause) => new LineApiTransportError({ operation, cause: sanitizedCause(cause) }),
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
      Effect.mapError((error) =>
        Cause.isTimeoutError(error) ? new LineApiTimeoutError({ operation }) : error,
      ),
    );

  return {
    getBotInfo: executeGet("getBotInfo", "/v2/bot/info", BotInfoResponse).pipe(
      Effect.withSpan("LineApiClient.getBotInfo"),
    ),
    pushMessage: Effect.fn("LineApiClient.pushMessage")(function* (recipientId, messages, options) {
      return yield* executePost(
        "pushMessage",
        "/v2/bot/message/push",
        PushMessageBody,
        {
          to: recipientId,
          messages,
          ...(options?.notificationDisabled === undefined
            ? {}
            : { notificationDisabled: options.notificationDisabled }),
        },
        options?.retryKey,
      );
    }),
    replyMessage: Effect.fn("LineApiClient.replyMessage")(
      function* (replyToken, messages, options) {
        return yield* executePost("replyMessage", "/v2/bot/message/reply", ReplyMessageBody, {
          replyToken,
          messages,
          ...(options?.notificationDisabled === undefined
            ? {}
            : { notificationDisabled: options.notificationDisabled }),
        });
      },
    ),
    multicastMessage: Effect.fn("LineApiClient.multicastMessage")(
      function* (recipientIds, messages, options) {
        return yield* executePost(
          "multicastMessage",
          "/v2/bot/message/multicast",
          MulticastMessageBody,
          {
            to: [...recipientIds],
            messages,
            ...(options?.notificationDisabled === undefined
              ? {}
              : { notificationDisabled: options.notificationDisabled }),
          },
          options?.retryKey,
        );
      },
    ),
    narrowcastMessage: Effect.fn("LineApiClient.narrowcastMessage")(function* (messages, options) {
      return yield* executePost(
        "narrowcastMessage",
        "/v2/bot/message/narrowcast",
        NarrowcastMessageBody,
        {
          messages,
          ...(options?.notificationDisabled === undefined
            ? {}
            : { notificationDisabled: options.notificationDisabled }),
          ...(options?.recipient === undefined ? {} : { recipient: options.recipient }),
          ...(options?.filter === undefined ? {} : { filter: options.filter }),
          ...(options?.limit === undefined ? {} : { limit: options.limit }),
        },
        options?.retryKey,
      );
    }),
  };
};
