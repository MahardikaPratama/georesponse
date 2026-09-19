# Release Management

## 1. Purpose

This document defines what constitutes a "release" for GeoResponse, how releases are versioned and tracked, and how that relates to the project's git branching convention and the take-home submission itself.

---

## 2. Scope Boundary

GeoResponse is a take-home test submitted once by a fixed deadline, not a continuously operated product with a customer-facing release cadence. Release management here is scoped accordingly:

In scope:

- What counts as a "release" at this project's scale.
- The relationship between releases and the `release/` branch convention.
- A lightweight changelog approach.
- A versioning scheme suggestion, applied proportionately.

Out of scope:

- Release trains, scheduled release cadences, or release trains coordinated across teams.
- Automated release-note generation infrastructure beyond what Conventional Commits + a manual `CHANGELOG.md` already provide.
- Multi-environment release promotion (no staging/production distinction exists — see `DEPLOYMENT.md` and `ENVIRONMENT_MANAGEMENT.md`).

---

## 3. What Counts as a Release

For GeoResponse, a "release" is defined as either of two things, depending on context:

1. **The take-home submission itself** — the state of the `main` branch at the point it is submitted for evaluation is, in effect, the project's release artifact. This is the release that matters most for this project's purpose.
2. **A tagged commit on `main`** — for any development that happens in discrete, meaningful increments before submission (e.g. "backend CRUD complete," "map integration complete"), a lightweight git tag on `main` can mark that point as a release, primarily to give reviewers and the deploy/rollback tooling in `DEPLOYMENT.md` a stable reference to build and deploy from.

A release is not a separate artifact-management or approval process here — it is simply "a tagged, known-good point on `main` that can be built into images and deployed."

---

## 4. Relationship to Branching Strategy

Release branches follow the release branch convention defined in the git management documentation (`docs/10_git/GIT_MANAGEMENT.md` §4), using a `release/*` branch prefix. GeoResponse's chosen strategy is Feature Branching off a single long-lived `main` (`GIT_MANAGEMENT.md` §3) — there is no permanent `develop` branch, so a release, when one is cut, branches directly from and merges directly back into `main`:

```text
main ──┬──────────────────────────────────────────────▶
       │                                        ▲
       └── release/x.y.z ──┬── stabilization ───┘
                            │   (bug fixes only,
                            │    no new features)
                            │
                            ▼
                      tag vX.Y.Z on main
```

For a project at GeoResponse's scale and timeline, this full flow is more process than is likely to be exercised before the submission deadline — most work lands directly on `main` through short-lived `feature/`/`fix/` branches and pull requests gated by CI (`CI_CD.md`), per the normal Feature Branching flow. The `release/*` branch prefix remains available and documented for the case where stabilization work genuinely needs isolating from ongoing feature development (for example, freezing scope in the final days before the 2026-09-19 deadline while unrelated exploratory work continues on other feature branches).

---

## 5. Versioning Scheme

**Suggested scheme: Semantic Versioning (`MAJOR.MINOR.PATCH`)**, applied loosely rather than with strict API-stability guarantees, since GeoResponse does not yet have external consumers of a stable public API or package:

| Segment | Meaning for GeoResponse |
|---|---|
| `MAJOR` | Breaking change to the REST API contract or a fundamental architecture change |
| `MINOR` | New functionality (new resource type, new endpoint, new frontend feature) |
| `PATCH` | Bug fixes, non-breaking corrections, documentation/DevOps changes |

For the take-home timeline, a pragmatic starting point is:

- `v0.1.0` — first end-to-end working slice (frontend + backend + database wired together).
- `v0.x.0` — incremental functional milestones during development.
- `v1.0.0` — the final submitted state, if the team chooses to mark submission itself with a tag.

Using a `0.x.y` series until submission signals accurately that the API and behavior are still evolving, which matches NFR-API-004 (backward compatibility) not yet being a binding constraint pre-submission.

---

## 6. Changelog Approach

**Decision: keep it simple** — a manually maintained `CHANGELOG.md` at the repository root, informed by the Conventional Commits messages already required by `docs/10_git/GIT_MANAGEMENT.md` §5, rather than a generated-and-published changelog pipeline.

Illustrative `CHANGELOG.md` structure:

```text
# Changelog

## [Unreleased]
- ...

## [0.2.0] - 2026-09-18
### Added
- Resource relocation endpoint and history tracking.
### Fixed
- Map marker offset at high zoom levels.

## [0.1.0] - 2026-09-10
### Added
- Initial frontend/backend/database scaffolding.
```

This is proportionate to the take-home scope: it gives a reviewer a fast, human-readable summary of what changed and when, without requiring release-automation tooling that would not be exercised meaningfully in a single-submission project. As of this writing no `CHANGELOG.md` has been created and no release tag has been cut — the Conventional Commits history on `main` is the change record until one is.

---

## 7. Release Checklist (Practical)

Before tagging a release point (including the final submission), the following should hold, cross-referencing `docs/09_quality/QUALITY_GATES.md` and `CI_CD.md`:

1. CI pipeline passes on `main` (lint, type-check/build, tests, docker build verification).
2. `CHANGELOG.md` reflects the notable changes since the last tag.
3. Any pending database migrations are present in `database/migrations/` and have been exercised locally via `scripts/database/migrate.sh`.
4. `docker compose up` succeeds from a clean checkout (validates NFR-DEP-001, reproducible environment).
5. The git tag is created on `main` at the intended commit (`git tag vX.Y.Z && git push --tags`).

---

## 8. Principle

> A release should be nothing more than a clearly identified, verified point in history — not a process that outweighs the size of the project.

For GeoResponse, the submission itself is the release that matters; the tagging, versioning, and changelog practices above exist to make that submission traceable and reproducible, not to simulate a release process a take-home test does not need.
