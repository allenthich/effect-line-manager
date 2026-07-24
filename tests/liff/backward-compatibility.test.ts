import { Schema } from "effect";
import { describe, expect, test } from "vite-plus/test";
import {
  CreateLiffAppRecordInput,
  LiffAppView,
  type LiffAppView as LiffAppViewType,
} from "../../src/liff/domain.ts";
import { LineLoginChannelId } from "../../src/shared/domain.ts";

const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("2001043291");

const legacyLiffView = {
  id: "liff-record-1",
  loginChannelId,
  liffId: "2001043291-AbCdEf12",
  view: { type: "tall" as const, url: "https://example.com/liff" },
  description: null,
  createdAt: new Date("2026-07-23T00:00:00.000Z"),
  updatedAt: new Date("2026-07-23T00:00:00.000Z"),
} satisfies LiffAppViewType;

describe("LIFF additional URL parameter compatibility", () => {
  test("accepts public LIFF views produced by adapters from the stable release", () => {
    expect(legacyLiffView).not.toHaveProperty("additionalUrlParameters");
    expect(
      Schema.decodeUnknownSync(LiffAppView)({
        ...legacyLiffView,
        createdAt: legacyLiffView.createdAt.toISOString(),
        updatedAt: legacyLiffView.updatedAt.toISOString(),
      }),
    ).toMatchObject(legacyLiffView);
  });

  test("accepts create-record inputs from repositories built for the stable release", () => {
    const decoded = Schema.decodeUnknownSync(CreateLiffAppRecordInput)({
      loginChannelId,
      liffId: "2001043291-AbCdEf12",
      view: { type: "tall", url: "https://example.com/liff" },
    });

    expect(decoded.additionalUrlParameters).toBeUndefined();
  });
});
