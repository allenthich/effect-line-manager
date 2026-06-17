# Contributing

## Releasing

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs, and publishes to [JSR](https://jsr.io/@allenthich/effect-line-manager).

### How to trigger a release

When you make a change that should be included in the next release, run:

```bash
pnpm changeset
```

You'll be prompted to:

1. **Select the bump type** — `patch` (bug fixes), `minor` (new features), or `major` (breaking changes)
2. **Write a changelog entry** — a human-readable summary of what changed (e.g., "Fixed OAuth token refresh race condition")

This creates a file in `.changeset/` (e.g., `.changeset/shy-tigers-sing.md`). **Commit this file with your PR.**

### What happens next

```
You open a PR
  └─ CI runs: build, test, lint

PR is merged to main
  └─ Changeset bot creates a "Version Packages" PR
       • bumps version in package.json
       • updates CHANGELOG.md
       • deletes consumed changeset files

"Version Packages" PR is merged
  └─ Release workflow publishes to JSR
       → @allenthich/effect-line-manager on jsr.io
       → GitHub Release with auto-generated notes
       → Git tag (e.g., v1.2.3)
```

### No manual version bumps

Never edit the `version` field in `package.json` by hand — Changesets handles all versioning automatically.

### Package scope

This package is **ESM-only** and published to JSR. There is no CJS or npm distribution.
