import { createHmac, timingSafeEqual } from "node:crypto";
import { Effect, Redacted } from "effect";
import { LineSignatureError } from "./errors.ts";

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export const verifyLineSignature = (
  body: Uint8Array,
  signature: string | undefined,
  channelSecret: Redacted.Redacted<string>,
): Effect.Effect<void, LineSignatureError> =>
  Effect.suspend(() => {
    if (signature === undefined || signature.length === 0) {
      return Effect.fail(new LineSignatureError({ reason: "missing" }));
    }
    if (signature.length % 4 !== 0 || !base64Pattern.test(signature)) {
      return Effect.fail(new LineSignatureError({ reason: "malformed" }));
    }

    try {
      const actual = Buffer.from(signature, "base64");
      const expected = createHmac("sha256", Redacted.value(channelSecret)).update(body).digest();

      if (actual.length !== expected.length) {
        return Effect.fail(new LineSignatureError({ reason: "mismatch" }));
      }

      return timingSafeEqual(actual, expected)
        ? Effect.void
        : Effect.fail(new LineSignatureError({ reason: "mismatch" }));
    } catch {
      return Effect.fail(new LineSignatureError({ reason: "malformed" }));
    }
  });

export const verifyLineSignatureString = (
  body: string,
  signature: string | undefined,
  channelSecret: Redacted.Redacted<string>,
): Effect.Effect<void, LineSignatureError> =>
  verifyLineSignature(new TextEncoder().encode(body), signature, channelSecret);
