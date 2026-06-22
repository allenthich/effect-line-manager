import { describe, expect, test } from "vite-plus/test";
import { lineOpenApi } from "../../src/httpapi/index.ts";

describe("LINE account OpenAPI", () => {
  test("contains relative CRUD paths", () => {
    const paths = lineOpenApi.paths;

    expect(Object.keys(paths).sort()).toEqual(
      [
        "/line-liff-apps",
        "/line-liff-apps/{id}",
        "/line-login-channels",
        "/line-login-channels/{id}",
        "/line-messaging-channels",
        "/line-messaging-channels/{id}",
        "/line-providers",
        "/line-providers/{id}",
      ].sort(),
    );
  });
});
