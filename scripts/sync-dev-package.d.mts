export const devPackageDir: ".dev-package";
export const devPackageDistTarget: "../dist";

export interface DevPackageManifest {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly license?: string;
  readonly type?: string;
  readonly types?: string;
  readonly exports?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

export const createDevPackageManifest: (manifest: DevPackageManifest) => DevPackageManifest;

export const syncDevPackage: (rootDir: string) => Promise<{
  readonly devManifest: DevPackageManifest;
  readonly devPackagePath: string;
}>;
