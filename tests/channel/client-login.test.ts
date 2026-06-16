import { describe, expect, test } from "vite-plus/test";
import { Effect, Redacted } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { makeLineLoginClient } from "../../src/channel/client-login.ts";

const baseUrl = "https://line-login.test";

const failure = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

describe("LINE Login API client", () => {
  test("generates authorization URL with options", () => {
    const client = makeLineLoginClient(
      HttpClient.make(() => Effect.never),
      "login-channel-123",
      Redacted.make("secret-123"),
      { authorizeUrl: "https://access.test" },
    );

    const url = client.getAuthorizeUrl({
      redirectUri: "https://my-app.test/callback",
      state: "state-123",
      scope: ["profile", "openid"],
      nonce: "nonce-123",
      botPrompt: "normal",
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://access.test");
    expect(parsed.pathname).toBe("/oauth2/v2.1/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("login-channel-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://my-app.test/callback");
    expect(parsed.searchParams.get("state")).toBe("state-123");
    expect(parsed.searchParams.get("scope")).toBe("profile openid");
    expect(parsed.searchParams.get("nonce")).toBe("nonce-123");
    expect(parsed.searchParams.get("bot_prompt")).toBe("normal");
  });

  test("exchanges code for access token", async () => {
    const requests: any[] = [];
    const httpClient = HttpClient.make((request) => {
      requests.push(request);
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              access_token: "access-token-123",
              expires_in: 3600,
              id_token: "id-token-123",
              refresh_token: "refresh-token-123",
              scope: "profile openid",
            }),
            { status: 200 },
          ),
        ),
      );
    });

    const client = makeLineLoginClient(
      httpClient,
      "login-channel-123",
      Redacted.make("secret-123"),
      { baseUrl },
    );

    const token = await Effect.runPromise(
      client.getAccessToken("code-123", "https://my-app.test/callback"),
    );

    expect(token).toEqual({
      accessToken: "access-token-123",
      expiresIn: 3600,
      idToken: "id-token-123",
      refreshToken: "refresh-token-123",
      scope: "profile openid",
    });

    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.method).toBe("POST");
    expect(req.url).toBe(`${baseUrl}/oauth2/v2.1/token`);
    expect(req.headers["content-type"]).toBe("application/x-www-form-urlencoded");
  });

  test("fetches user profile", async () => {
    const requests: any[] = [];
    const httpClient = HttpClient.make((request) => {
      requests.push(request);
      return Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            JSON.stringify({
              userId: "U123456",
              displayName: "Alice",
              pictureUrl: "https://example.com/pic.png",
              statusMessage: "hello",
            }),
            { status: 200 },
          ),
        ),
      );
    });

    const client = makeLineLoginClient(
      httpClient,
      "login-channel-123",
      Redacted.make("secret-123"),
      { baseUrl },
    );

    const profile = await Effect.runPromise(client.getProfile("access-token-123"));

    expect(profile).toEqual({
      userId: "U123456",
      displayName: "Alice",
      pictureUrl: "https://example.com/pic.png",
      statusMessage: "hello",
    });

    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.method).toBe("GET");
    expect(req.url).toBe(`${baseUrl}/v2/profile`);
    expect(req.headers.authorization).toBe("Bearer access-token-123");
  });

  test("redacts login client secrets in errors", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(
            '{"error":"invalid_client","error_description":"client secret-123 is wrong"}',
            {
              status: 401,
            },
          ),
        ),
      ),
    );

    const client = makeLineLoginClient(
      httpClient,
      "login-channel-123",
      Redacted.make("secret-123"),
      { baseUrl },
    );

    const error = await failure(client.getAccessToken("code-123", "https://my-app.test/callback"));

    expect(error).toMatchObject({
      _tag: "LineLoginApiAuthenticationError",
      body: expect.not.stringContaining("secret-123"),
    });
    expect((error as any).body).toContain("[REDACTED]");
  });
});
