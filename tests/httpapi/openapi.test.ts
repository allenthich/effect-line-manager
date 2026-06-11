import { describe, expect, test } from "vite-plus/test";
import { lineAccountManagementOpenApi } from "../../src/httpapi/index.ts";

describe("LINE account OpenAPI", () => {
  test("contains relative CRUD paths and declared response statuses", () => {
    const paths = lineAccountManagementOpenApi.paths;

    expect(Object.keys(paths)).toEqual(["/line-accounts", "/line-accounts/{id}"]);
    expect(Object.keys(paths["/line-accounts"]?.get?.responses ?? {})).toEqual(["200", "500"]);
    expect(Object.keys(paths["/line-accounts"]?.post?.responses ?? {})).toEqual([
      "201",
      "400",
      "409",
      "500",
    ]);
    expect(Object.keys(paths["/line-accounts/{id}"]?.patch?.responses ?? {})).toEqual([
      "200",
      "400",
      "404",
      "409",
      "500",
    ]);
    expect(Object.keys(paths["/line-accounts/{id}"]?.delete?.responses ?? {})).toEqual([
      "204",
      "400",
      "404",
      "500",
    ]);
  });
});
