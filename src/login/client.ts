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
import { sanitizedCause, withoutTrailingSlash } from "../shared/http-client-utils.ts";

const defaultBaseUrl = "https://api.line.me";
const defaultAuthorizeUrl = "https://access.line.me";
const defaultRequestTimeout = "30 seconds";

/** Configuration for the LINE Login client. */
export interface LineLoginClientConfig {
  readonly baseUrl?: string | undefined;
  readonly authorizeUrl?: string | undefined;
  readonly requestTimeout?: Duration.Input | undefined;
}

/** Union of all errors the LINE Login client can produce. */
export type LineLoginClientError =
  | LineLoginApiTransportError
  | LineLoginApiTimeoutError
  | LineLoginApiAuthenticationError
  | LineLoginApiRateLimitError
  | LineLoginApiResponseError
  | LineLoginRequestEncodingError;

/** Client interface for the LINE Login API (OAuth 2.1). */
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

  readonly refreshAccessToken: (refreshToken: string) => Effect.Effect<
    {
      readonly accessToken: string;
      readonly expiresIn: number;
      readonly refreshToken: string;
      readonly scope: string;
    },
    LineLoginClientError
  >;

  readonly verifyIdToken: (
    idToken: string,
    nonce?: string,
  ) => Effect.Effect<
    {
      readonly iss: string;
      readonly sub: string;
      readonly aud: string;
      readonly exp: number;
      readonly iat: number;
      readonly nonce?: string | undefined;
      readonly amr?: readonly string[] | undefined;
      readonly name?: string | undefined;
      readonly picture?: string | undefined;
      readonly email?: string | undefined;
    },
    LineLoginClientError
  >;
}

/** Creates a LINE Login client backed by the given HTTP client and channel credentials. */
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

  const doRefreshAccessToken = (refreshToken: string) =>
    Effect.gen(function* () {
      const operation: LineLoginOperation = "refreshAccessToken";
      yield* Effect.annotateCurrentSpan({ operation });

      const request = HttpClientRequest.post(`${rootUrl}/oauth2/v2.1/token`).pipe(
        HttpClientRequest.bodyUrlParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: loginChannelId,
          client_secret: Redacted.value(loginChannelSecret),
        }),
      );

      const response = yield* httpClient
        .execute(request)
        .pipe(
          Effect.mapError(
            (cause) => new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

      if (response.status >= 200 && response.status < 300) {
        const bodyJson = yield* response.json.pipe(
          Effect.mapError(
            (cause) => new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );
        const schema = Schema.Struct({
          access_token: Schema.String,
          expires_in: Schema.Finite,
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
          ? new LineLoginApiTimeoutError({ operation: "refreshAccessToken" })
          : cause,
      ),
    );

  const doVerifyIdToken = (idToken: string, nonce?: string) =>
    Effect.gen(function* () {
      const operation: LineLoginOperation = "verifyIdToken";
      yield* Effect.annotateCurrentSpan({ operation });

      const body: Record<string, string> = {
        id_token: idToken,
        client_id: loginChannelId,
      };
      if (nonce !== undefined) {
        body.nonce = nonce;
      }

      const request = HttpClientRequest.post(`${rootUrl}/oauth2/v2.1/verify`).pipe(
        HttpClientRequest.bodyUrlParams(body),
      );

      const response = yield* httpClient
        .execute(request)
        .pipe(
          Effect.mapError(
            (cause) => new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );

      if (response.status >= 200 && response.status < 300) {
        const bodyJson = yield* response.json.pipe(
          Effect.mapError(
            (cause) => new LineLoginApiTransportError({ operation, cause: sanitizedCause(cause) }),
          ),
        );
        const schema = Schema.Struct({
          iss: Schema.String,
          sub: Schema.String,
          aud: Schema.String,
          exp: Schema.Finite,
          iat: Schema.Finite,
          nonce: Schema.optional(Schema.String),
          amr: Schema.optional(Schema.Array(Schema.String)),
          name: Schema.optional(Schema.String),
          picture: Schema.optional(Schema.String),
          email: Schema.optional(Schema.String),
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
          ? new LineLoginApiTimeoutError({ operation: "verifyIdToken" })
          : cause,
      ),
    );

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

    refreshAccessToken: doRefreshAccessToken,
    verifyIdToken: doVerifyIdToken,
  };
};
