import { describe, expect, test } from "vite-plus/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as httpapi from "../../src/httpapi/index.ts";

describe("HTTP API package boundary", () => {
  test("exports the optional HTTP API surface independently", () => {
    expect([
      httpapi.LineApi,
      httpapi.LineApiLayer,
      httpapi.makeLineClient,
      httpapi.makeLineProviderManagementAdapter,
      httpapi.lineOpenApi,
    ]).not.toContain(undefined);
  });

  test("keeps framework packages out of root and web runtime entry points", async () => {
    const [rootSource, webSource, packageJson] = await Promise.all([
      readFile(resolve("src/index.ts"), "utf8"),
      readFile(resolve("src/web/index.ts"), "utf8"),
      readFile(resolve("package.json"), "utf8"),
    ]);

    expect(rootSource).not.toMatch(/hono|express/iu);
    expect(webSource).not.toMatch(/hono|express/iu);
    const manifest = JSON.parse(packageJson) as {
      readonly dependencies?: Record<string, string>;
      readonly devDependencies?: Record<string, string>;
      readonly exports?: Record<string, string>;
    };
    expect(manifest.dependencies).not.toHaveProperty("hono");
    expect(manifest.dependencies).not.toHaveProperty("express");
    expect(manifest.devDependencies).toHaveProperty("hono");
    expect(manifest.devDependencies).toHaveProperty("express");
    expect(manifest.exports?.["./httpapi"]).toEqual("./dist/httpapi/index.mjs");
  });
});
