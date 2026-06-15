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

export const LineEmoji = Schema.Struct({
  index: Schema.Number,
  productId: Schema.String,
  emojiId: Schema.String,
});

export type LineEmoji = typeof LineEmoji.Type;

export const LineQuickReplyItem = Schema.Struct({
  type: Schema.optional(Schema.Literal("action")),
  action: Schema.Unknown,
  imageUrl: Schema.optional(Schema.String),
});

export type LineQuickReplyItem = typeof LineQuickReplyItem.Type;

export const LineQuickReply = Schema.Struct({
  items: Schema.optional(Schema.Array(LineQuickReplyItem)),
});

export type LineQuickReply = typeof LineQuickReply.Type;

export const LineSender = Schema.Struct({
  name: Schema.optional(Schema.String),
  iconUrl: Schema.optional(Schema.String),
});

export type LineSender = typeof LineSender.Type;

export const LineEmojiSubstitutionObject = Schema.Struct({
  type: Schema.Literal("emoji"),
  productId: Schema.String,
  emojiId: Schema.String,
});

export type LineEmojiSubstitutionObject = typeof LineEmojiSubstitutionObject.Type;

export const LineUserMentionee = Schema.Struct({
  type: Schema.Literal("user"),
  userId: Schema.String,
});

export type LineUserMentionee = typeof LineUserMentionee.Type;

export const LineAllMentionee = Schema.Struct({
  type: Schema.Literal("all"),
});

export type LineAllMentionee = typeof LineAllMentionee.Type;

export const LineMentionee = Schema.Union([LineUserMentionee, LineAllMentionee]);

export type LineMentionee = typeof LineMentionee.Type;

export const LineMentionSubstitutionObject = Schema.Struct({
  type: Schema.Literal("mention"),
  mentionee: LineMentionee,
});

export type LineMentionSubstitutionObject = typeof LineMentionSubstitutionObject.Type;

export const LineSubstitutionObject = Schema.Union([
  LineEmojiSubstitutionObject,
  LineMentionSubstitutionObject,
]);

export type LineSubstitutionObject = typeof LineSubstitutionObject.Type;

export const LineTextMessage = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  emojis: Schema.optional(Schema.Array(LineEmoji)),
  quoteToken: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineTextMessage = typeof LineTextMessage.Type;

export const LineTextMessageV2 = Schema.Struct({
  type: Schema.Literal("textV2"),
  text: Schema.String,
  substitution: Schema.optional(Schema.Record(Schema.String, LineSubstitutionObject)),
  quoteToken: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineTextMessageV2 = typeof LineTextMessageV2.Type;

export const LineStickerMessage = Schema.Struct({
  type: Schema.Literal("sticker"),
  packageId: Schema.String,
  stickerId: Schema.String,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
  quoteToken: Schema.optional(Schema.String),
});

export type LineStickerMessage = typeof LineStickerMessage.Type;

export const LineImageMessage = Schema.Struct({
  type: Schema.Literal("image"),
  originalContentUrl: Schema.String,
  previewImageUrl: Schema.String,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineImageMessage = typeof LineImageMessage.Type;

export const LineVideoMessage = Schema.Struct({
  type: Schema.Literal("video"),
  originalContentUrl: Schema.String,
  previewImageUrl: Schema.String,
  trackingId: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineVideoMessage = typeof LineVideoMessage.Type;

export const LineAudioMessage = Schema.Struct({
  type: Schema.Literal("audio"),
  originalContentUrl: Schema.String,
  duration: Schema.Number,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineAudioMessage = typeof LineAudioMessage.Type;

export const LineLocationMessage = Schema.Struct({
  type: Schema.Literal("location"),
  title: Schema.String,
  address: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineLocationMessage = typeof LineLocationMessage.Type;

export const LineImagemapMessage = Schema.Struct({
  type: Schema.Literal("imagemap"),
  baseUrl: Schema.String,
  altText: Schema.String,
  baseSize: Schema.Struct({
    width: Schema.Number,
    height: Schema.Number,
  }),
  actions: Schema.Array(Schema.Unknown),
  video: Schema.optional(Schema.Unknown),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineImagemapMessage = typeof LineImagemapMessage.Type;

export const LineTemplateMessage = Schema.Struct({
  type: Schema.Literal("template"),
  altText: Schema.String,
  template: Schema.Unknown,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineTemplateMessage = typeof LineTemplateMessage.Type;

export const LineFlexMessage = Schema.Struct({
  type: Schema.Literal("flex"),
  altText: Schema.String,
  contents: Schema.Unknown,
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineFlexMessage = typeof LineFlexMessage.Type;

export const LineCouponMessage = Schema.Struct({
  type: Schema.Literal("coupon"),
  couponId: Schema.String,
  deliveryTag: Schema.optional(Schema.String),
  quickReply: Schema.optional(LineQuickReply),
  sender: Schema.optional(LineSender),
});

export type LineCouponMessage = typeof LineCouponMessage.Type;

export const LineOutboundMessage = Schema.Union([
  LineTextMessage,
  LineTextMessageV2,
  LineStickerMessage,
  LineImageMessage,
  LineVideoMessage,
  LineAudioMessage,
  LineLocationMessage,
  LineImagemapMessage,
  LineTemplateMessage,
  LineFlexMessage,
  LineCouponMessage,
]);

export type LineOutboundMessage = typeof LineOutboundMessage.Type;

export type LineMessageTuple =
  | readonly [LineOutboundMessage]
  | readonly [LineOutboundMessage, LineOutboundMessage]
  | readonly [LineOutboundMessage, LineOutboundMessage, LineOutboundMessage]
  | readonly [LineOutboundMessage, LineOutboundMessage, LineOutboundMessage, LineOutboundMessage]
  | readonly [
      LineOutboundMessage,
      LineOutboundMessage,
      LineOutboundMessage,
      LineOutboundMessage,
      LineOutboundMessage,
    ];

export const LineMessages = Schema.NonEmptyArray(LineOutboundMessage).check(Schema.isMaxLength(5));

export type LineMessages = typeof LineMessages.Type;

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

const MulticastMessageBody = Schema.Struct({
  to: Schema.Array(Schema.String),
  messages: LineMessages,
  notificationDisabled: Schema.optional(Schema.Boolean),
  customAggregationUnits: Schema.optional(Schema.Array(Schema.String)),
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
  readonly recipient?: unknown;
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
