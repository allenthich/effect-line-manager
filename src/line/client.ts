import { Effect, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { LineMessages, type LineMessageTuple } from "./domain.ts";
import {
  LineApiResponseError,
  LineApiTransportError,
  LineRequestEncodingError,
  type LineApiOperation,
} from "./errors.ts";

const defaultBaseUrl = "https://api.line.me";

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

export type LineApiClientError =
  | LineApiTransportError
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

export const makeLineApiClient = (
  httpClient: HttpClient.HttpClient,
  channelAccessToken: Redacted.Redacted<string>,
  baseUrl = defaultBaseUrl,
): LineApiClient => {
  const rootUrl = withoutTrailingSlash(baseUrl);

  const execute = <S extends Schema.Top & { readonly EncodingServices: never }>(
    operation: LineApiOperation,
    path: string,
    schema: S,
    body: S["Type"],
    retryKey?: string,
  ): Effect.Effect<void, LineApiClientError> => {
    const request = HttpClientRequest.post(`${rootUrl}${path}`).pipe(
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
            causeDescription: error.reason._tag,
          }),
      ),
    );

    return request.pipe(
      Effect.flatMap((encodedRequest) =>
        httpClient.execute(encodedRequest).pipe(
          Effect.mapError(
            (error) =>
              new LineApiTransportError({
                operation,
                causeDescription: error.reason._tag,
              }),
          ),
        ),
      ),
      Effect.flatMap((response) => {
        if (response.status >= 200 && response.status < 300) {
          return Effect.void;
        }

        return response.text.pipe(
          Effect.mapError(
            (error) =>
              new LineApiTransportError({
                operation,
                causeDescription: error.reason._tag,
              }),
          ),
          Effect.flatMap((body) => {
            const requestId = response.headers["x-line-request-id"];
            const acceptedRequestId = response.headers["x-line-accepted-request-id"];
            const token = Redacted.value(channelAccessToken);
            const sanitizedBody = token.length === 0 ? body : body.replaceAll(token, "[REDACTED]");
            return Effect.fail(
              new LineApiResponseError({
                operation,
                status: response.status,
                body: sanitizedBody,
                ...(requestId === undefined ? {} : { requestId }),
                ...(acceptedRequestId === undefined ? {} : { acceptedRequestId }),
              }),
            );
          }),
        );
      }),
    );
  };

  return {
    pushMessage: (recipientId, messages, options) =>
      execute(
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
      ),
    replyMessage: (replyToken, messages, options) =>
      execute("replyMessage", "/v2/bot/message/reply", ReplyMessageBody, {
        replyToken,
        messages,
        ...(options?.notificationDisabled === undefined
          ? {}
          : { notificationDisabled: options.notificationDisabled }),
      }),
  };
};
