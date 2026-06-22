import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vite-plus/test";

describe("shared package boundary", () => {
  test("treats effect as a peer dependency to avoid duplicate Redacted registries", async () => {
    const packageJson = await readFile(resolve("package.json"), "utf8");
    const manifest = JSON.parse(packageJson) as {
      readonly dependencies?: Record<string, string>;
      readonly devDependencies?: Record<string, string>;
      readonly peerDependencies?: Record<string, string>;
    };

    expect(manifest.dependencies?.effect).toBeUndefined();
    expect(manifest.devDependencies?.effect).toBe("4.0.0-beta.78");
    expect(manifest.peerDependencies?.effect).toBe("4.0.0-beta.78");
  });
});
