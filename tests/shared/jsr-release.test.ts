import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vite-plus/test";

const syncJsrScript = resolve("scripts/sync-jsr.js");

describe("JSR release manifest", () => {
  test("syncs every publishable package entry point", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "effect-line-manager-jsr-release-"));

    try {
      await Promise.all([
        writeFile(
          join(rootDir, "package.json"),
          `${JSON.stringify(
            {
              version: "1.2.3",
              exports: {
                ".": "./dist/index.mjs",
                "./web": "./dist/web/index.mjs",
                "./web/developers-console": "./dist/web/developers-console/index.mjs",
                "./package.json": "./package.json",
              },
            },
            null,
            2,
          )}\n`,
        ),
        writeFile(
          join(rootDir, "jsr.json"),
          `${JSON.stringify(
            {
              version: "1.2.3",
              exports: {
                ".": "./src/index.ts",
                "./web": "./src/web/index.ts",
              },
            },
            null,
            2,
          )}\n`,
        ),
      ]);

      execFileSync(process.execPath, [syncJsrScript], { cwd: rootDir });

      const jsrManifest = JSON.parse(await readFile(join(rootDir, "jsr.json"), "utf8"));
      expect(jsrManifest.exports).toEqual({
        ".": "./src/index.ts",
        "./web": "./src/web/index.ts",
        "./web/developers-console": "./src/web/developers-console/index.ts",
      });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
