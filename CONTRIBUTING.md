# Contributing

## Releasing

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs, and publishes to [JSR](https://jsr.io/@allenthich/effect-line-manager).

### How to trigger a release

When you make a change that should be included in the next release, run:

```bash
vp changeset
```

You'll be prompted to:

1. **Select the bump type** — `patch` (bug fixes), `minor` (new features), or `major` (breaking changes)
2. **Write a changelog entry** — a human-readable summary of what changed (e.g., "Fixed OAuth token refresh race condition")

This creates a file in `.changeset/` (e.g., `.changeset/shy-tigers-sing.md`). **Commit this file with your PR.**

### Authoring conventions

**Summary style**

- Use **past tense**, imperative mood: "Fixed…" not "Fix…" or "Fixes…"
- Write for a **consumer reading a changelog**, not a teammate reading a commit
- One sentence is usually enough; use a second only for migration notes
- Start with the affected area: "`LineClientRegistry` now…", "Webhook verification…"

```markdown
# Good

"Fixed OAuth token refresh expiring prematurely when clock skew > 30s"

# Bad — too vague, present tense

"Fix token bug"
```

**When to skip a changeset**

| Skip                               | Reason                     |
| ---------------------------------- | -------------------------- |
| Typo fixes, comment edits          | Not user-visible           |
| Test-only changes                  | No behavior change         |
| Internal refactors (no API change) | Consumers don't care       |
| CI / tooling config                | Not shipped in the package |

**When to use each bump type**

| Type    | When                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------ |
| `patch` | Bug fix, perf improvement, doc fix that matters to consumers                                     |
| `minor` | New feature, new export, deprecation (mark as deprecated, don't remove)                          |
| `major` | Breaking change: removed export, changed function signature, dropped Node/Effect version support |

**Breaking changes need migration notes**

```markdown
---
"effect-line-manager": major
---

Renamed `makeLineClient` to `makeLineApiClient`.
Migration: replace all imports of `makeLineClient` with `makeLineApiClient`.
The old name is removed — no backward compatibility shim.
```

**Batch related changes**

One PR can include multiple changeset files if it touches different areas:

```bash
vp changeset   # creates .changeset/blue-cats-run.md  — "Added webhook retry"
vp changeset   # creates .changeset/warm-dogs-fly.md  — "Deprecated `legacyAuth` option"
```

The bot will batch them into a single release with multiple changelog entries.

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
