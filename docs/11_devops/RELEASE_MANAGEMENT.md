# Release Management

## 1. Purpose

This document defines what a release is for GeoResponse and how one would
be versioned and recorded. GeoResponse is a take-home test submitted once,
so release management is minimal: there are no release trains or
schedules, no generated release notes, and no promotion between
environments (only local development exists, see
`ENVIRONMENT_MANAGEMENT.md`).

---

## 2. Current Practice

- The release that matters is the state of `main` at submission.
- Work reaches `main` through short-lived branches and pull requests gated
  by CI (`CI_CD.md`), following `docs/10_git/GIT_MANAGEMENT.md`.
- The Conventional Commits history on `main` is the change record. No
  `CHANGELOG.md` exists and no git tag has been created.
- No `release/*` branch has been used.

---

## 3. Releases, Tags, and Versioning

If an increment needs a stable reference (for example, to build and deploy
it with the tooling in `DEPLOYMENT.md`), it is marked with a lightweight
git tag on `main`. A release is a tagged, known-good commit on `main` that
can be built into images and deployed, with no separate approval process.

Tags would follow Semantic Versioning, applied loosely since there are no
external API consumers yet:

| Segment | Meaning for GeoResponse |
| --- | --- |
| `MAJOR` | Breaking change to the REST API contract or a fundamental architecture change |
| `MINOR` | New functionality (resource type, endpoint, frontend feature) |
| `PATCH` | Bug fixes, non-breaking corrections, documentation or DevOps changes |

Versions stay in the `0.x.y` range until submission (an optional `v1.0.0`
tag could mark the submitted state), since NFR-API-004 (backward
compatibility) is not yet binding.

The `release/*` branch prefix from `GIT_MANAGEMENT.md` section 4 is
available if stabilization ever needs to be isolated from feature work. A
release branch would branch from and merge back into `main` (there is no
`develop` branch), and the tag would go on `main`.

---

## 4. Release Checklist

Before tagging a release point, including the final submission:

1. CI passes on `main` (`CI_CD.md`).
2. New migrations are in `database/migrations/` and have been applied
   locally with `scripts/database/migrate.sh`.
3. `docker compose up` (or `./run.sh`) succeeds from a clean checkout
   (NFR-DEP-001).
4. If a `CHANGELOG.md` has been started, it lists the notable changes
   since the last tag.
5. The tag is created on the intended commit:
   `git tag vX.Y.Z && git push --tags`.
