import { describe, expect, test } from "vite-plus/test";
import { sanitizedCause, withoutTrailingSlash } from "../../src/shared/http-client-utils.ts";

describe("withoutTrailingSlash", () => {
  test("strips trailing slashes", () => {
    expect(withoutTrailingSlash("https://api.line.me/")).toBe("https://api.line.me");
    expect(withoutTrailingSlash("https://api.line.me///")).toBe("https://api.line.me");
  });

  test("leaves URLs without trailing slashes untouched", () => {
    expect(withoutTrailingSlash("https://api.line.me")).toBe("https://api.line.me");
  });
});

describe("sanitizedCause", () => {
  test("collapses HttpClientError reason carriers to their _tag", () => {
    class TransportError extends Error {
      readonly _tag = "TransportError" as const;
    }
    const cause = { reason: new TransportError() };

    expect(sanitizedCause(cause).message).toBe("TransportError");
  });

  test("uses cause._tag for tagged Effect errors", () => {
    const cause = Object.assign(new Error("schema failed"), { _tag: "SchemaError" });

    expect(sanitizedCause(cause).message).toBe("SchemaError");
  });

  test("preserves the message of native Error instances without _tag", () => {
    const error = new Error("sequelize: column providerId does not exist");

    expect(sanitizedCause(error).message).toBe("sequelize: column providerId does not exist");
    expect(sanitizedCause(error)).toBeInstanceOf(Error);
    expect(sanitizedCause(error)).not.toBe(error);
  });

  test("falls back to the constructor name for errors without a message", () => {
    class EmptyDatabaseError extends Error {}
    const error = new EmptyDatabaseError();

    expect(sanitizedCause(error).message).toBe("EmptyDatabaseError");
  });

  test("falls back to the constructor name when reading error.message throws", () => {
    class RedactedFailure extends Error {}

    const error = new RedactedFailure();
    Object.defineProperty(error, "message", {
      get() {
        throw new Error("Unable to get redacted value");
      },
    });

    expect(sanitizedCause(error).message).toBe("RedactedFailure");
  });

  test("returns UnknownHttpError for non-Error primitives", () => {
    expect(sanitizedCause(null).message).toBe("UnknownHttpError");
    expect(sanitizedCause(undefined).message).toBe("UnknownHttpError");
    expect(sanitizedCause("connect ECONNREFUSED").message).toBe("UnknownHttpError");
    expect(sanitizedCause({ statusCode: 500 }).message).toBe("UnknownHttpError");
  });
});
