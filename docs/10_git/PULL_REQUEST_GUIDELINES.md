# Pull Request Guidelines

## 1. Purpose

This document defines how pull requests (PRs) are titled, described, sized, reviewed, and merged for GeoResponse. It builds directly on the branching and commit conventions in `GIT_MANAGEMENT.md` and the pass/fail criteria in `QUALITY_GATES.md`.

Even on a small, short-timeline project, every non-trivial change goes through a PR rather than being pushed straight to `main` — this keeps a reviewable record of what changed and why, which matters both for the take-home evaluation and for any future continuation of the project.

---

## 2. PR Title Convention

PR titles mirror the Conventional Commits format used for commit messages (see `GIT_MANAGEMENT.md` §5):

```text
<type>[optional scope]: <description>
```

Examples:

```text
feat(resource): add relocation endpoint
fix(map): correct marker cleanup on unmount
docs: fill git management and PR guideline docs
refactor(resource): extract status-transition rules into domain service
```

If a PR's branch already contains multiple commits with different types, the PR title should reflect the overall intent of the change (usually the primary `type`), not an arbitrary list of everything included.

---

## 3. Required PR Description Content

Every PR description must include:

1. **What changed** — a short summary of the functional or structural change (new endpoint, new component, bug fix, refactor, doc fill-in, etc.).
2. **Why** — the reason for the change: which requirement, bug, or gap it addresses. Reference the relevant requirement ID or document where applicable (e.g. "Implements NFR-GEO-004 relocation consistency").
3. **How it was tested** — which tests were added/run (`vitest run`, `go test ./...`), and any manual verification performed (e.g. exercised the relocation flow through the UI against a local backend).
4. **Linked documentation/requirement** — if the change affects behavior described in `docs/` (requirements, architecture, API contract), link or name the relevant document so reviewers can cross-check.

### 3.1 Template

```markdown
## What changed
<Short summary of the change.>

## Why
<Requirement, bug, or gap this addresses. Reference doc/requirement IDs if applicable.>

## How tested
<Automated tests added/run, manual verification performed.>

## Related docs / requirements
<Links or names of affected documents, e.g. NON_FUNCTIONAL_REQUIREMENTS.md NFR-GEO-004.>
```

A PR description that only restates the title ("adds relocation endpoint") is not sufficient — it must explain the reasoning and verification, not just repeat what the diff already shows.

---

## 4. PR Size Guidance

- Keep PRs small and focused on a single logical change, mirroring the commit granularity guidance in `GIT_MANAGEMENT.md` §6.
- A PR should be reviewable in one sitting. If a change grows to cover multiple unrelated concerns (e.g. a new endpoint *and* an unrelated refactor of the map adapter), split it into separate PRs.
- Large, unavoidable changes (e.g. introducing a new domain concept end-to-end: migration, repository, service, handler, frontend integration) are acceptable as a single PR only when the pieces are not independently meaningful — but the description must make the scope explicit so review effort can be planned accordingly.
- Pure documentation PRs (filling in `docs/`) are expected to be larger by nature but should still stay scoped to a coherent set of related documents rather than mixing unrelated sections of the project.

---

## 5. Review Expectations

Given the project's solo/short-timeline context, review is primarily **rigorous self-review against this project's own standards**, treating the PR diff as if an external reviewer will read it — because, for this take-home, one will.

When reviewing a PR (self or otherwise), check for:

- Alignment with `CODING_STANDARDS.md` (naming, structure, error handling, documentation).
- Alignment with `CODE_QUALITY.md` (readability, no dead code, proportionate abstraction, business-rule coverage).
- All `QUALITY_GATES.md` gates passing.
- The PR description accurately reflecting the actual diff (no scope creep left unexplained).
- No unrelated changes bundled in (formatting-only churn on untouched files, accidental file moves, etc.).

---

## 6. Checklist Before Requesting Review

Before opening a PR (or, for solo work, before merging), confirm:

- [ ] All merge gates in `QUALITY_GATES.md` §5 pass (`scripts/quality/check.sh`/`check.ps1`, builds, lint, type-check, formatting, tests, business-logic coverage) — see that document for the full mechanical checklist, not restated here.
- [ ] Documentation is updated if the change alters behavior, API contracts, or architecture described in `docs/`.
- [ ] Branch name follows the convention in `GIT_MANAGEMENT.md` §4.
- [ ] Commit messages follow Conventional Commits (`GIT_MANAGEMENT.md` §5).
- [ ] PR description is filled in using the template in §3.1 of this document.
- [ ] No excluded files (`node_modules`, build artifacts, `.env`, secrets — see `GIT_MANAGEMENT.md` §7) are included in the diff.

---

## 7. Merge Strategy

**Chosen strategy: Squash merge into `main`.**

Rationale:

- Consistent with the Feature Branching strategy in `GIT_MANAGEMENT.md` §3: each feature branch may accumulate work-in-progress commits during development, but `main` should read as one clean, meaningful commit per completed unit of work.
- Keeps `main`'s history directly traceable to PRs: one squash-merged commit per PR, using the PR title (Conventional Commits format) as the resulting commit message.
- Avoids polluting `main` with intermediate "fix typo", "wip", or "address review comment" commits that only have meaning within the lifetime of the branch.
- The feature branch itself may still contain a more granular commit history during development for the author's own traceability; that detail is intentionally collapsed on merge.

After a squash merge, the source branch is deleted to keep the branch list limited to active work.

---

## 8. Related Documents

- `GIT_MANAGEMENT.md` — branch naming, commit conventions, and branching strategy this PR process builds on.
- `QUALITY_GATES.md` — the pass/fail criteria referenced in the pre-review checklist.
- `CODE_QUALITY.md` — the quality philosophy behind what reviewers look for.
- `CODING_STANDARDS.md` — line-level rules checked during review.

---

A PR should let a reviewer understand what changed, why, and how it was verified — without needing to ask the author first.
