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
import { type LineMessageTuple, LineMessages } from "./schemas.ts";
import { sanitizedCause, withoutTrailingSlash } from "../shared/http-client-utils.ts";

const defaultBaseUrl = "https://api.line.me";
const defaultRequestTimeout = "30 seconds";

export interface LinePushOptions {
  readonly retryKey?: string | undefined;
  readonly notificationDisabled?: boolean | undefined;
  readonly customAggregationUnits?: readonly string[] | undefined;
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

const PushMessageBody = Schema.Struct({
  to: Schema.String,
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
  customAggregationUnits: Schema.optional(Schema.Array(Schema.String)),
});

const ReplyMessageBody = Schema.Struct({
  replyToken: Schema.String,
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
});

/**
 * App-level bot profile subset projected from the official
 * `@line/bot-sdk` `BotInfoResponse`. Only the fields consumed by
 * account registry are kept; `premiumId`, `chatMode`, and
 * `markAsReadMode` are intentionally excluded.
 */
const BotProfile = Schema.Struct({
  userId: Schema.String,
  basicId: Schema.String,
  displayName: Schema.String,
  pictureUrl: Schema.optional(Schema.String),
});

const MulticastMessageBody = Schema.Struct({
  to: Schema.Array(Schema.String),
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
  customAggregationUnits: Schema.optional(Schema.Array(Schema.String)),
});

const NarrowcastMessageBody = Schema.Struct({
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
  // Passthrough — the caller supplies the full recipient payload from the LINE SDK.
  // Schemas for OperatorRecipient, AudienceRecipient, and RedeliveryRecipient exist
  // in @line/bot-sdk but are not re-validated here to avoid coupling to SDK internals.
  recipient: Schema.optional(Schema.Unknown),
  // Passthrough — the caller supplies the full demographic-filter payload from the LINE SDK.
  // DemographicFilter variants (Gender, Age, AppType, Area, SubscriptionPeriod, etc.) are
  // not re-validated here to avoid coupling to SDK internals.
  filter: Schema.optional(Schema.Unknown),
  limit: Schema.optional(Schema.Unknown),
});

export interface LineMulticastOptions {
  readonly retryKey?: string | undefined;
  readonly notificationDisabled?: boolean | undefined;
  readonly customAggregationUnits?: readonly string[] | undefined;
}

export interface LineNarrowcastOptions {
  readonly retryKey?: string | undefined;
  readonly notificationDisabled?: boolean | undefined;
  readonly limit?:
    | {
        readonly max: number;
        readonly upToRemainingQuota?: boolean | undefined;
        readonly forbidPartialDelivery?: boolean | undefined;
      }
    | undefined;
  /** Passthrough — the caller supplies the full recipient shape from the LINE SDK (e.g. OperatorRecipient). */
  readonly recipient?: unknown;
  /** Passthrough — the caller supplies the full demographic-filter shape from the LINE SDK (e.g. GenderDemographicFilter). */
  readonly filter?: unknown;
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
    getBotInfo: executeGet("getBotInfo", "/v2/bot/info", BotProfile).pipe(
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
          ...(options?.customAggregationUnits === undefined
            ? {}
            : { customAggregationUnits: options.customAggregationUnits }),
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
            ...(options?.customAggregationUnits === undefined
              ? {}
              : { customAggregationUnits: options.customAggregationUnits }),
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
