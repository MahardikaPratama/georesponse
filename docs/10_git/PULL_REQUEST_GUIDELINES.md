# Pull Request Guidelines

## 1. Purpose

This document defines how pull requests (PRs) for GeoResponse are titled,
described, sized, reviewed, and merged. Branch and commit conventions are in
`GIT_MANAGEMENT.md`, the pass/fail checks are in `QUALITY_GATES.md`, and the
final pre-merge checklist is in `docs/12_workflow/DEFINITION_OF_DONE.md`.

Non-trivial changes go through a PR rather than straight to `main`, so there
is a reviewable record of what changed and why.

---

## 2. PR Title Convention

PR titles use the Conventional Commits format from `GIT_MANAGEMENT.md`
section 5, because the squash-merged commit takes the PR title as its
message (section 7).

If the branch contains commits of different types, the title reflects the
overall intent of the change (usually the primary `type`), not a list of
everything included.

---

## 3. Required PR Description Content

Every PR description includes:

1. **What changed**: a short summary of the functional or structural change
   (new endpoint, new component, bug fix, refactor, doc update).
2. **Why**: the requirement, bug, or gap it addresses. Reference the
   requirement ID or document where applicable (for example "Implements
   NFR-GEO-004 relocation consistency").
3. **How it was tested**: tests added or run (`vitest run`,
   `go test ./...`) and any manual verification (for example, exercising the
   relocation flow through the UI against a local backend).
4. **Related documentation or requirements**: the `docs/` files whose
   described behavior the change affects, so reviewers can cross-check.

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

A description that only restates the title is not enough. It must explain
the reasoning and the verification.

---

## 4. PR Size Guidance

- Keep each PR to a single logical change, reviewable in one sitting (see
  the commit granularity rules in `GIT_MANAGEMENT.md` section 6). Split
  unrelated concerns, such as a new endpoint and an unrelated map adapter
  refactor, into separate PRs.
- A large change is acceptable as one PR only when its pieces are not
  independently meaningful (for example a new domain concept end to end:
  migration, repository, service, handler, frontend). The description must
  then state the scope so review effort can be planned.
- Documentation PRs are naturally larger but should stay scoped to a
  coherent set of related documents.

---

## 5. Review Expectations

On this solo project, review is mainly self-review against the project's own
standards, reading the diff as an external reviewer would. Check for:

- Alignment with `CODING_STANDARDS.md` (naming, structure, error handling,
  documentation).
- Alignment with `CODE_QUALITY.md` (readability, no dead code, no
  unnecessary abstraction, business-rule coverage).
- All `QUALITY_GATES.md` gates passing.
- A description that matches the actual diff, with no unexplained scope
  creep.
- No unrelated changes bundled in (formatting churn on untouched files,
  accidental file moves).

---

## 6. Checklist Before Requesting Review

Before opening a PR (or, for solo work, before merging), run the checklist
in `docs/12_workflow/DEFINITION_OF_DONE.md`. Its pull request section covers
branch naming, commit format, and the description template from section 3.1
above.

---

## 7. Merge Strategy

**Strategy: squash merge into `main`.**

- A feature branch may collect work-in-progress commits, but `main` gets one
  clean commit per completed unit of work.
- The squash commit uses the PR title (Conventional Commits) as its message,
  and GitHub appends the PR number, so every commit on `main` that came from
  a PR traces back to it.
- Intermediate "fix typo", "wip", or "address review comment" commits stay
  on the branch and do not reach `main`.

After a squash merge, the source branch is deleted so the branch list only
shows active work.

---

## 8. Related Documents

- `GIT_MANAGEMENT.md`: branching strategy, branch naming, and commit
  conventions.
- `QUALITY_GATES.md`: the pass/fail criteria every PR must meet.
- `docs/12_workflow/DEFINITION_OF_DONE.md`: the final checklist before
  merging.
- `CODE_QUALITY.md`: the quality philosophy behind what reviewers look for.
- `CODING_STANDARDS.md`: line-level rules checked during review.
