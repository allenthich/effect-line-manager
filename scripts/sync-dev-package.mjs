import { lstat, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const devPackageDir = ".dev-package";
export const devPackageDistTarget = "../dist";

export const createDevPackageManifest = (manifest) => ({
  name: manifest.name,
  version: manifest.version,
  description: manifest.description,
  license: manifest.license,
  type: manifest.type,
  types: manifest.types,
  exports: manifest.exports,
  peerDependencies: manifest.peerDependencies,
});

const ensureDistLink = async (rootDir) => {
  const distLinkPath = join(rootDir, devPackageDir, "dist");

  try {
    const stats = await lstat(distLinkPath);
    if (stats.isSymbolicLink()) {
      return;
    }

    await rm(distLinkPath, { force: true, recursive: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      // Nothing to replace.
    } else {
      throw error;
    }
  }

  await symlink(devPackageDistTarget, distLinkPath, "dir");
};

export const syncDevPackage = async (rootDir) => {
  const packageJsonPath = join(rootDir, "package.json");
  const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const devManifest = createDevPackageManifest(manifest);
  const devPackagePath = join(rootDir, devPackageDir);

  await mkdir(devPackagePath, { recursive: true });
  await writeFile(
    join(devPackagePath, "package.json"),
    `${JSON.stringify(devManifest, null, 2)}\n`,
    "utf8",
  );
  await ensureDistLink(rootDir);

  return {
    devManifest,
    devPackagePath,
  };
};

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const rootDir = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
  await syncDevPackage(rootDir);
}
