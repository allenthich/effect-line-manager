import { Cause, Effect, Redacted, Schema, type Duration } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import {
  LineLoginApiAuthenticationError,
  LineLoginApiRateLimitError,
  LineLoginApiResponseError,
  LineLoginApiTimeoutError,
  LineLoginApiTransportError,
  LineLoginRequestEncodingError,
  type LineLoginOperation,
} from "./errors.ts";

const defaultBaseUrl = "https://api.line.me";
const defaultAuthorizeUrl = "https://access.line.me";
const defaultRequestTimeout = "30 seconds";

export interface LineLoginClientConfig {
  readonly baseUrl?: string | undefined;
  readonly authorizeUrl?: string | undefined;
  readonly requestTimeout?: Duration.Input | undefined;
}

export type LineLoginClientError =
  | LineLoginApiTransportError
  | LineLoginApiTimeoutError
  | LineLoginApiAuthenticationError
  | LineLoginApiRateLimitError
  | LineLoginApiResponseError
  | LineLoginRequestEncodingError;

export interface LineLoginClient {
  readonly getAuthorizeUrl: (options: {
    readonly redirectUri: string;
    readonly state: string;
    readonly scope: readonly string[];
    readonly nonce?: string | undefined;
    readonly botPrompt?: "normal" | "aggressive" | undefined;
  }) => string;

  readonly getAccessToken: (
    code: string,
    redirectUri: string,
  ) => Effect.Effect<
    {
      readonly accessToken: string;
      readonly expiresIn: number;
      readonly idToken?: string | undefined;
      readonly refreshToken: string;
      readonly scope: string;
    },
    LineLoginClientError
  >;

  readonly getProfile: (accessToken: string) => Effect.Effect<
    {
      readonly userId: string;
      readonly displayName: string;
      readonly pictureUrl?: string | undefined;
      readonly statusMessage?: string | undefined;
    },
    LineLoginClientError
  >;
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

export const makeLineLoginClient = (
  httpClient: HttpClient.HttpClient,
  loginChannelId: string,
  loginChannelSecret: Redacted.Redacted<string>,
  config: LineLoginClientConfig = {},
): LineLoginClient => {
  const rootUrl = withoutTrailingSlash(config.baseUrl ?? defaultBaseUrl);
  const authorizeBaseUrl = withoutTrailingSlash(config.authorizeUrl ?? defaultAuthorizeUrl);
  const requestTimeout = config.requestTimeout ?? defaultRequestTimeout;

  const handleFailureResponse = (
    operation: LineLoginOperation,
    status: number,
    responseBody: string,
    headers: Record<string, string>,
  ) =>
    Effect.gen(function* () {
      const requestId = headers["x-line-request-id"];
      const secret = Redacted.value(loginChannelSecret);
      const sanitizedBody =
        secret.length === 0 ? responseBody : responseBody.replaceAll(secret, "[REDACTED]");
      const responseFields = {
        operation,
        body: sanitizedBody,
        ...(requestId === undefined ? {} : { requestId }),
      };

      if (status === 401 || status === 403) {
        return yield* new LineLoginApiAuthenticationError({
          ...responseFields,
          status,
        });
      }
      if (status === 429) {
        const retryAfter = headers["retry-after"];
        return yield* new LineLoginApiRateLimitError({
          ...responseFields,
          status: 429,
          ...(retryAfter === undefined ? {} : { retryAfter }),
        });
      }
      return yield* new LineLoginApiResponseError({
        ...responseFields,
        status,
      });
    });

  return {
    getAuthorizeUrl: (options) => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: loginChannelId,
        redirect_uri: options.redirectUri,
        state: options.state,
        scope: options.scope.join(" "),
      });
      if (options.nonce !== undefined) {
        params.set("nonce", options.nonce);
      }
      if (options.botPrompt !== undefined) {
        params.set("bot_prompt", options.botPrompt);
      }
      return `${authorizeBaseUrl}/oauth2/v2.1/authorize?${params.toString()}`;
    },

    getAccessToken: (code, redirectUri) =>
      Effect.gen(function* () {
        const operation: LineLoginOperation = "getAccessToken";
        yield* Effect.annotateCurrentSpan({ operation });

        const request = HttpClientRequest.post(`${rootUrl}/oauth2/v2.1/token`).pipe(
          HttpClientRequest.bodyUrlParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: loginChannelId,
            client_secret: Redacted.value(loginChannelSecret),
          }),
        );

        const response = yield* httpClient
          .execute(request)
          .pipe(
            Effect.mapError(
              (cause) =>
                new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );

        if (response.status >= 200 && response.status < 300) {
          const bodyJson = yield* response.json.pipe(
            Effect.mapError(
              (cause) =>
                new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );
          const schema = Schema.Struct({
            access_token: Schema.String,
            expires_in: Schema.Finite,
            id_token: Schema.optional(Schema.String),
            refresh_token: Schema.String,
            scope: Schema.String,
          });
          const parsed = yield* Schema.decodeUnknownEffect(schema)(bodyJson).pipe(
            Effect.mapError(
              (cause) =>
                new LineLoginRequestEncodingError({
                  operation,
                  cause: sanitizedCause(cause),
                }),
            ),
          );
          return {
            accessToken: parsed.access_token,
            expiresIn: parsed.expires_in,
            idToken: parsed.id_token,
            refreshToken: parsed.refresh_token,
            scope: parsed.scope,
          };
        }

        const responseBody = yield* response.text.pipe(
          Effect.mapError(
            (cause) => new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
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
            ? new LineLoginApiTimeoutError({ operation: "getAccessToken" })
            : cause,
        ),
      ),

    getProfile: (accessToken) =>
      Effect.gen(function* () {
        const operation: LineLoginOperation = "getProfile";
        yield* Effect.annotateCurrentSpan({ operation });

        const request = HttpClientRequest.get(`${rootUrl}/v2/profile`).pipe(
          HttpClientRequest.bearerToken(Redacted.make(accessToken)),
        );

        const response = yield* httpClient
          .execute(request)
          .pipe(
            Effect.mapError(
              (cause) =>
                new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );

        if (response.status >= 200 && response.status < 300) {
          const bodyJson = yield* response.json.pipe(
            Effect.mapError(
              (cause) =>
                new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
            ),
          );
          const schema = Schema.Struct({
            userId: Schema.String,
            displayName: Schema.String,
            pictureUrl: Schema.optional(Schema.String),
            statusMessage: Schema.optional(Schema.String),
          });
          return yield* Schema.decodeUnknownEffect(schema)(bodyJson).pipe(
            Effect.mapError(
              (cause) =>
                new LineLoginRequestEncodingError({
                  operation,
                  cause: sanitizedCause(cause),
                }),
            ),
          );
        }

        const responseBody = yield* response.text.pipe(
          Effect.mapError(
            (cause) => new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
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
            ? new LineLoginApiTimeoutError({ operation: "getProfile" })
            : cause,
        ),
      ),
  };
};
