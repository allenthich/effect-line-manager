import { describe, expect, test } from "vite-plus/test";
import { buildLiffUrl } from "../../src/web/liff-url.ts";

describe("buildLiffUrl", () => {
  test("builds the public LIFF URL from the LIFF ID", () => {
    expect(buildLiffUrl("2001043291-AbCdEf12")).toBe("https://liff.line.me/2001043291-AbCdEf12");
  });

  test.each(["campaign=spring", "?campaign=spring", "&campaign=spring"])(
    "appends additional parameters supplied as %s",
    (parameters) => {
      expect(buildLiffUrl("2001043291-AbCdEf12", parameters)).toBe(
        "https://liff.line.me/2001043291-AbCdEf12?campaign=spring",
      );
    },
  );

  test("does not append a query delimiter for blank parameters", () => {
    expect(buildLiffUrl("2001043291-AbCdEf12", "  ")).toBe(
      "https://liff.line.me/2001043291-AbCdEf12",
    );
  });
});
