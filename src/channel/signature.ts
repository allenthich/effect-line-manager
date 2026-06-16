import { createHmac, timingSafeEqual } from "node:crypto";
import { Effect, Redacted } from "effect";
import { LineSignatureError } from "./errors-messaging.ts";

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export const verifyLineSignature = Effect.fn("LineSignature.verify")(function* (
  body: Uint8Array,
  signature: string | undefined,
  channelSecret: Redacted.Redacted<string>,
) {
  if (signature === undefined || signature.length === 0) {
    return yield* new LineSignatureError({ reason: "missing" });
  }
  if (signature.length % 4 !== 0 || !base64Pattern.test(signature)) {
    return yield* new LineSignatureError({ reason: "malformed" });
  }

  const matches = yield* Effect.try({
    try: () => {
      const actual = Buffer.from(signature, "base64");
      const expected = createHmac("sha256", Redacted.value(channelSecret)).update(body).digest();

      return actual.length === expected.length && timingSafeEqual(actual, expected);
    },
    catch: () => new LineSignatureError({ reason: "malformed" }),
  });

  if (!matches) {
    return yield* new LineSignatureError({ reason: "mismatch" });
  }

  return yield* Effect.void;
});

export const verifyLineSignatureString = Effect.fn("LineSignature.verifyString")(function* (
  body: string,
  signature: string | undefined,
  channelSecret: Redacted.Redacted<string>,
) {
  return yield* verifyLineSignature(new TextEncoder().encode(body), signature, channelSecret);
});
