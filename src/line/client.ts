import { Cause, Effect, Redacted, Schema, type Duration } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { LineMessages, type LineMessageTuple } from "./domain.ts";
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

export interface LineApiClient {
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

export const makeLineApiClient = (
  httpClient: HttpClient.HttpClient,
  channelAccessToken: Redacted.Redacted<string>,
  config: LineApiClientConfig = {},
): LineApiClient => {
  const rootUrl = withoutTrailingSlash(config.baseUrl ?? defaultBaseUrl);
  const requestTimeout = config.requestTimeout ?? defaultRequestTimeout;

  const execute = <S extends Schema.Top & { readonly EncodingServices: never }>(
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
          (cause) =>
            new LineRequestEncodingError({
              operation,
              cause: sanitizedCause(cause),
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
      const requestId = response.headers["x-line-request-id"];
      const acceptedRequestId = response.headers["x-line-accepted-request-id"];
      const token = Redacted.value(channelAccessToken);
      const sanitizedBody =
        token.length === 0 ? responseBody : responseBody.replaceAll(token, "[REDACTED]");
      const responseFields = {
        operation,
        body: sanitizedBody,
        ...(requestId === undefined ? {} : { requestId }),
        ...(acceptedRequestId === undefined ? {} : { acceptedRequestId }),
      };

      if (response.status === 401 || response.status === 403) {
        return yield* new LineApiAuthenticationError({
          ...responseFields,
          status: response.status,
        });
      }
      if (response.status === 429) {
        const retryAfter = response.headers["retry-after"];
        return yield* new LineApiRateLimitError({
          ...responseFields,
          status: 429,
          ...(retryAfter === undefined ? {} : { retryAfter }),
        });
      }
      return yield* new LineApiResponseError({
        ...responseFields,
        status: response.status,
      });
    }).pipe(
      Effect.timeout(requestTimeout),
      Effect.mapError((cause) =>
        Cause.isTimeoutError(cause) ? new LineApiTimeoutError({ operation }) : cause,
      ),
    );

  return {
    pushMessage: Effect.fn("LineApiClient.pushMessage")(function* (recipientId, messages, options) {
      return yield* execute(
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
        return yield* execute("replyMessage", "/v2/bot/message/reply", ReplyMessageBody, {
          replyToken,
          messages,
          ...(options?.notificationDisabled === undefined
            ? {}
            : { notificationDisabled: options.notificationDisabled }),
        });
      },
    ),
  };
};
