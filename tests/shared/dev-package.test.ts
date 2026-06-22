import { mkdtemp, readFile, readlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vite-plus/test";
import {
  createDevPackageManifest,
  devPackageDir,
  devPackageDistTarget,
  syncDevPackage,
} from "../../scripts/sync-dev-package.mjs";

describe("dev package layout", () => {
  test("creates a consumer-safe manifest that points at built dist output", () => {
    const manifest = createDevPackageManifest({
      name: "effect-line-manager",
      version: "0.0.5",
      description: "Headless Effect library for managing LINE Messaging API channels and clients.",
      license: "MIT",
      type: "module",
      types: "./dist/index.d.mts",
      exports: {
        ".": "./dist/index.mjs",
        "./httpapi": "./dist/httpapi/index.mjs",
        "./package.json": "./package.json",
      },
      peerDependencies: {
        effect: "4.0.0-beta.78",
        lit: "^3.3.3",
      },
    });

    expect(manifest).toEqual({
      name: "effect-line-manager",
      version: "0.0.5",
      description: "Headless Effect library for managing LINE Messaging API channels and clients.",
      license: "MIT",
      type: "module",
      types: "./dist/index.d.mts",
      exports: {
        ".": "./dist/index.mjs",
        "./httpapi": "./dist/httpapi/index.mjs",
        "./package.json": "./package.json",
      },
      peerDependencies: {
        effect: "4.0.0-beta.78",
        lit: "^3.3.3",
      },
    });
  });

  test("keeps the dev package isolated from workspace dependencies", () => {
    expect(devPackageDir).toBe(".dev-package");
    expect(devPackageDistTarget).toBe("../dist");
  });

  test("writes a minimal package and links dist into the dev package directory", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "effect-line-manager-dev-package-"));
    const manifest = {
      name: "effect-line-manager",
      version: "0.0.5",
      description: "Headless Effect library for managing LINE Messaging API channels and clients.",
      license: "MIT",
      type: "module",
      types: "./dist/index.d.mts",
      exports: {
        ".": "./dist/index.mjs",
        "./package.json": "./package.json",
      },
      peerDependencies: {
        effect: "4.0.0-beta.78",
      },
      devDependencies: {
        effect: "4.0.0-beta.78",
      },
    };

    await writeFile(join(rootDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await syncDevPackage(rootDir);

    const writtenManifest = JSON.parse(
      await readFile(join(rootDir, devPackageDir, "package.json"), "utf8"),
    );
    expect(writtenManifest).toEqual(createDevPackageManifest(manifest));
    expect(await readlink(join(rootDir, devPackageDir, "dist"))).toBe(devPackageDistTarget);
  });
});
