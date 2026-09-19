# Git Management

## 1. Purpose

This document defines how the GeoResponse repository is named, branched, and committed to. It establishes one consistent convention so that history stays readable and reviewable, even though the project is developed on a short timeline by a small (effectively solo) team.

These conventions match the team's existing internal standard for other projects and are applied here from the current state of the repository forward (single `main` branch, one initial commit).

---

## 2. Repository Naming

- Repository names use `kebab-case`.
- No underscores, camelCase, or abbreviations that are not already well established.
- No version numbers embedded in the repository name.

Example: `georesponse` — not `Geo_Response`, `geoResponse`, or `georesponse-v2`.

---

## 3. Branching Strategy

**Chosen strategy: Feature Branching off `main`.**

### 3.1 Rationale

GeoResponse is a small, short-timeline project with a single primary integration branch. Feature Branching is the appropriate default here because:

- It keeps history simple: one long-lived branch (`main`), short-lived branches for everything else.
- It avoids the overhead of Git Flow's permanent `develop`/`release` branch structure, which exists to coordinate multiple concurrent release trains — a concern this project does not have.
- It is less demanding than pure Trunk-Based Development, which typically assumes very short-lived branches, feature flags, and frequent small merges directly to `main` multiple times a day — more process than a short, largely solo take-home warrants.
- Every unit of work (a feature, a fix, a doc update) gets its own branch, is reviewed conceptually via its own diff, and merges back into `main` once it is complete and passes the quality gates in `QUALITY_GATES.md`.

Git Flow and Trunk-Based Development remain valid alternatives and are called out here only as the discarded options: Git Flow for larger, multi-release, multi-team projects; Trunk-Based Development for teams with strong CI/CD and feature-flag discipline operating at high commit frequency.

### 3.2 Diagram

```text
main   ●───────●───────────────●───────────●─────────────▶
        \       \               \           \
         \       \               \           \
feature/  ●──●──●●  (merge)       \           \
resource-crud                      \           \
                                     ●──●──●──●●  (merge)
                              feature/relocation-flow
                                                      \
                                                       ●──●●
                                                 fix/marker-cleanup
```

Each branch starts from `main`, stays short-lived, and merges back into `main` once its change is complete and passes the quality gates.

### 3.3 Current Repository State

As of this writing the repository has a single `main` branch and one commit (`Initial commit`). All work from this point forward follows the branching and commit conventions in this document.

---

## 4. Branch Naming Convention

Branches are prefixed by category, followed by a `kebab-case` short description:

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New functionality | `feature/resource-relocation` |
| `bugfix/` or `fix/` | Non-urgent bug fix | `fix/map-marker-cleanup` |
| `hotfix/` | Urgent fix, typically against a released/deployed state | `hotfix/api-crash-on-empty-filter` |
| `release/` | Release preparation, if/when releases are cut | `release/1.0.0` |
| `chore/` | Maintenance work with no user-facing behavior change | `chore/update-dependencies` |
| `docs/` | Documentation-only changes | `docs/fill-backend-architecture-doc` |

Rules:

- Everything after the prefix is `kebab-case`.
- Descriptions are short and specific to the change, not generic (`feature/add-map-stuff` is not acceptable; `feature/resource-map-markers` is).
- No ticket-number-only branch names (e.g. `feature/GR-123`) — the description should be human-readable on its own, since this project does not run an external issue tracker.

---

## 5. Commit Message Convention

**Format: Conventional Commits.**

```text
<type>[optional scope]: <description>
```

### 5.1 Types

| Type | Use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting-only change with no logic impact |
| `refactor` | Code change that is neither a feature nor a fix |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Tooling, dependencies, config, non-source-affecting maintenance |
| `ci` | CI/build-pipeline configuration |
| `build` | Build-system or external dependency changes |

### 5.2 Rules

- Description is written in the imperative mood ("add", not "added" or "adds").
- Description is concise — a short summary, not a paragraph. Additional detail goes in the commit body if needed.
- Scope (in parentheses) is optional but preferred when the change is clearly localized to one area (`resource`, `map`, `auth`, `api`, etc.).
- No period at the end of the description line.

### 5.3 GeoResponse-Specific Examples

```text
feat(resource): add relocation endpoint
fix(map): correct marker cleanup on unmount
docs: fill backend architecture doc
refactor(resource): extract status-transition rules into domain service
test(resource): cover relocation consistency across API and persistence
chore: update go.mod dependencies
style(frontend): apply prettier formatting to resource components
fix(api): return structured error on invalid coordinates
```

---

## 6. Commit Granularity

- Commit small, focused units of work — one logical change per commit.
- Avoid combining unrelated changes (e.g. a feature and an unrelated formatting sweep) in a single commit.
- A commit should leave the repository in a working state where practical (it builds, tests relevant to the change pass).
- Prefer several small, well-described commits over one large "implement everything" commit — this makes the diff reviewable and makes it possible to isolate a regression later.
- Work-in-progress or exploratory commits should be cleaned up (squashed or rewritten) before merging into `main`, so that `main`'s history stays meaningful.

---

## 7. What NOT to Commit

The following must never be committed to the repository:

- `node_modules/` and any other installed/vendored dependency directories.
- Build artifacts and compiled output (frontend `dist/`/`build/`, Go binaries).
- `.env` files or any file containing real credentials, API keys, or connection strings.
- Local IDE/editor configuration that is not shared project convention.
- Generated files that can be reproduced from source (e.g. generated API clients, generated coverage reports) unless the project explicitly decides to check them in for a documented reason.
- Database dumps containing real or sensitive data.

These are excluded via `.gitignore`. If a file matching one of these categories is accidentally staged, it must be removed from the index before committing — see `QUALITY_GATES.md` G10 for the corresponding pre-merge check.

---

## 8. Related Documents

- `PULL_REQUEST_GUIDELINES.md` — how branches are turned into reviewed, mergeable pull requests.
- `QUALITY_GATES.md` — the checks that must pass before a branch is merged.
- `CODING_STANDARDS.md` — line-level source code conventions.

---

A branch name and commit message should tell a reader what happened without needing to open the diff first.
