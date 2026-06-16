import { createHmac } from "node:crypto";
import { describe, expect, test } from "vite-plus/test";
import { Effect, Redacted } from "effect";
import { verifyLineSignature, verifyLineSignatureString } from "../../src/channel/signature.ts";

const publishedBody = '{"destination":"U8e742f61d673b39c7fff3cecb7536ef0","events":[]}';
const publishedSecret = Redacted.make("8c570fa6dd201bb328f1c1eac23a96d8");
const publishedSignature = "GhRKmvmHys4Pi8DxkF4+EayaH0OqtJtaZxgTD9fMDLs=";

const failure = <A>(effect: Effect.Effect<A, unknown>) => Effect.runPromise(Effect.flip(effect));

describe("LINE webhook signature verification", () => {
  test("validates LINE's published signature example", async () => {
    await expect(
      Effect.runPromise(
        verifyLineSignatureString(publishedBody, publishedSignature, publishedSecret),
      ),
    ).resolves.toBeUndefined();
  });

  test("rejects modified raw bytes", async () => {
    const bytes = new TextEncoder().encode(`${publishedBody} `);

    await expect(
      failure(verifyLineSignature(bytes, publishedSignature, publishedSecret)),
    ).resolves.toMatchObject({
      _tag: "LineSignatureError",
      reason: "mismatch",
    });
  });

  test("rejects a signature produced by the wrong secret", async () => {
    await expect(
      failure(
        verifyLineSignatureString(publishedBody, publishedSignature, Redacted.make("wrong-secret")),
      ),
    ).resolves.toMatchObject({
      _tag: "LineSignatureError",
      reason: "mismatch",
    });
  });

  test("distinguishes missing and malformed signatures", async () => {
    await expect(
      failure(verifyLineSignatureString(publishedBody, undefined, publishedSecret)),
    ).resolves.toMatchObject({ reason: "missing" });
    await expect(
      failure(verifyLineSignatureString(publishedBody, "not base64!", publishedSecret)),
    ).resolves.toMatchObject({ reason: "malformed" });
  });

  test("rejects a valid Base64 value with the wrong digest length", async () => {
    await expect(
      failure(verifyLineSignatureString(publishedBody, "AA==", publishedSecret)),
    ).resolves.toMatchObject({ reason: "mismatch" });
  });

  test("verifies UTF-8 payloads without normalizing their contents", async () => {
    const body = '{"message":"こんにちは🌏\\nline two"}';
    const secret = Redacted.make("utf8-secret");
    const signature = createHmac("sha256", "utf8-secret")
      .update(new TextEncoder().encode(body))
      .digest("base64");

    await expect(
      Effect.runPromise(verifyLineSignatureString(body, signature, secret)),
    ).resolves.toBeUndefined();
    await expect(
      failure(verifyLineSignatureString(body.replace("\\n", "\n"), signature, secret)),
    ).resolves.toMatchObject({ reason: "mismatch" });
  });
});
