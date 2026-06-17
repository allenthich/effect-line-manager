import { describe, expect, test } from "vite-plus/test";
import { lineOpenApi } from "../../src/httpapi/index.ts";

describe("LINE account OpenAPI", () => {
  test("contains relative CRUD paths", () => {
    const paths = lineOpenApi.paths;

    expect(Object.keys(paths).sort()).toEqual(
      [
        "/line-channels",
        "/line-channels/{id}",
        "/line-liff-apps",
        "/line-liff-apps/{id}",
        "/line-providers",
        "/line-providers/{id}",
      ].sort(),
    );
  });
});
