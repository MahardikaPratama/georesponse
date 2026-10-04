# Git Management

## 1. Purpose

This document owns the repository's naming, branching, commit message, and
commit hygiene conventions. Other documents link here instead of repeating
branch or commit examples. Pull request structure and merging are covered in
`PULL_REQUEST_GUIDELINES.md`.

---

## 2. Repository Naming

- Repository names use `kebab-case`.
- No underscores, camelCase, or abbreviations that are not already well
  established.
- No version numbers in the repository name.

Example: `georesponse`, not `Geo_Response`, `geoResponse`, or
`georesponse-v2`.

---

## 3. Branching Strategy

**Strategy: Feature Branching off `main`.**

### 3.1 Rationale

`main` is the only long-lived branch. Each unit of work (a feature, a fix, a
doc update) gets a short-lived branch, is reviewed through its own diff, and
merges back into `main` once it passes the gates in `QUALITY_GATES.md`. This
keeps history simple for a small, effectively solo project. Git Flow and
Trunk-Based Development were considered and not adopted: neither the release
coordination of Git Flow nor the feature-flag discipline of Trunk-Based
Development is needed at this scale.

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

### 3.3 Practice in This Repository

The specification and each implementation phase (Phases 0 to 6, PRs #1
to #19) were developed on feature branches and squash-merged into `main`
through pull requests, so those commits carry a `(#N)` suffix. Merged
branches were deleted, so `main` is the only branch. Later work, mostly
fixes and documentation updates, was committed directly to `main` in
Conventional Commits form.

---

## 4. Branch Naming Convention

Branches are prefixed by category, followed by a `kebab-case` short
description:

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New functionality | `feature/resource-relocation` |
| `bugfix/` or `fix/` | Non-urgent bug fix | `fix/map-marker-cleanup` |
| `hotfix/` | Urgent fix, typically against a released or deployed state | `hotfix/api-crash-on-empty-filter` |
| `release/` | Release preparation, if and when releases are cut | `release/1.0.0` |
| `chore/` | Maintenance with no user-facing behavior change | `chore/update-dependencies` |
| `docs/` | Documentation-only changes | `docs/fill-backend-architecture-doc` |

Rules:

- Everything after the prefix is `kebab-case`.
- Descriptions are short and specific: `feature/resource-map-markers`, not
  `feature/add-map-stuff`.
- No ticket-number-only names (such as `feature/GR-123`). The project has no
  external issue tracker, so the description must be readable on its own.

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
| `chore` | Tooling, dependencies, config, non-source maintenance |
| `ci` | CI/build-pipeline configuration |
| `build` | Build-system or external dependency changes |

### 5.2 Rules

- Write the description in the imperative mood ("add", not "added" or
  "adds").
- Keep the description to a short summary. Put further detail in the commit
  body.
- A scope in parentheses is optional but preferred when the change is
  localized to one area (`frontend`, `backend`, `db`, `docker`, `map`,
  `api`, and so on).
- No period at the end of the description line.

### 5.3 Examples From This Repository

```text
feat(frontend): implement resource relocation
feat(backend): validate config at start-up and auto-migrate in development
fix(db): make the auth seed files idempotent
fix(docker): make the frontend healthcheck use 127.0.0.1 and keep Go sources LF
refactor: strip internal spec-doc citations from source comments
test: add API integration suite and Playwright golden-path e2e test
ci: add integration and docker-build jobs, use npm ci with cache
docs(engineering): drop mandatory header for shell scripts and env files
```

---

## 6. Commit Granularity

- One logical change per commit. Do not combine unrelated changes (for
  example a feature and an unrelated formatting sweep).
- Where practical, each commit leaves the repository in a working state: it
  builds and the tests relevant to the change pass.
- Prefer several small, well-described commits over one large commit. They
  are easier to review and make a regression easier to isolate.
- Clean up work-in-progress or exploratory commits (squash or rewrite them)
  before they reach `main`.

---

## 7. What Not to Commit

Never commit:

- `node_modules/` and other installed or vendored dependency directories.
- Build artifacts and compiled output (frontend `dist/` or `build/`, Go
  binaries).
- `.env` files or any file containing real credentials, API keys, or
  connection strings.
- Local IDE or editor configuration that is not a shared project convention.
- Generated files that can be reproduced from source (generated API
  clients, coverage reports) unless there is a documented reason to check
  them in.
- Database dumps containing real or sensitive data.

These are excluded via `.gitignore`. If such a file is staged by accident,
remove it from the index before committing. `QUALITY_GATES.md` G10 is the
matching pre-merge check, and `docs/11_devops/ENVIRONMENT_MANAGEMENT.md`
owns the secrets and `.env` policy.

---

## 8. Related Documents

- `PULL_REQUEST_GUIDELINES.md`: how a branch becomes a reviewed, merged pull
  request.
- `QUALITY_GATES.md`: the checks that must pass before a branch is merged.
- `CODING_STANDARDS.md`: line-level source code conventions.
