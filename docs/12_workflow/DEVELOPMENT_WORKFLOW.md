# Development Workflow

## 1. Purpose

This document describes the day-to-day workflow for developing GeoResponse — from picking up a unit of work to merging it into `main`.

It ties together the conventions already defined in `GIT_MANAGEMENT.md`, `QUALITY_GATES.md`, `PULL_REQUEST_GUIDELINES.md`, and `DEFINITION_OF_DONE.md` into a single practical sequence, so a developer (human or AI-assisted) always knows what to do next.

---

## 2. Source of Truth Before Implementation

Before writing code, check whether the behavior is already specified:

```text
docs/01_product/       → what the product is, who uses it, what a Resource is
docs/02_requirements/  → functional and non-functional requirements
docs/03_architecture/  → system architecture and dependency rules
docs/04_contracts/     → API and data contracts
```

These documents are authoritative. If the planned change contradicts them, either the plan is wrong or the documents need to be updated first — the two should never silently diverge. When a requirement is ambiguous or a document is silent on a point, prefer the smallest reasonable assumption and state it in the pull request description rather than guessing at larger scope.

If the change affects the domain model, an API endpoint, or a data shape, the corresponding document under `docs/01_product` or `docs/04_contracts` is updated as part of the same change — see `DEFINITION_OF_DONE.md` section 6.

---

## 3. Workflow Overview

```text
   docs/01-04            main
  (source of truth)        │
        │                  ▼
        │           git checkout -b feature/<name>
        │                  │
        ▼                  ▼
  confirm scope      local dev loop
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        write code    write tests   run quality gates
              │             │             │
              └─────────────┴─────────────┘
                            │
                            ▼
                update docs if contracts changed
                            │
                            ▼
                    open pull request
                            │
                            ▼
                     review + address
                            │
                            ▼
                    merge into main
```

---

## 4. Branching

Create a branch off `main` following the prefix convention in `GIT_MANAGEMENT.md`:

```text
feature/resource-relocation
fix/map-marker-cleanup
chore/update-dependencies
docs/fill-observability-doc
```

Keep the branch scoped to one unit of work as defined in `DEFINITION_OF_DONE.md`.

---

## 5. Local Development Loop

### 5.1 Environment

Local development runs the frontend, backend, and a local PostgreSQL + PostGIS instance. `./run.sh` / `.\run.ps1` bring up all three with Docker Compose (migrated and seeded); for day-to-day iteration you can also run only the database via Compose and start each app directly — see `docs/11_devops/DOCKER_COMPOSE.md` for the exact services and commands, and `scripts/dev/setup.sh` / `setup.ps1` for the one-shot dependency install.

Typical loop:

```text
1. Start local dependencies (database, and backend/frontend if run via Compose).
2. Run the backend directly (`go run ./cmd/api` from georesponse-be/) if not run via Compose.
3. Run the frontend dev server (`npm run dev`, Rspack dev server on port 5173).
4. Make the change.
5. Verify it manually against the running application.
```

### 5.2 Iterating

1. Write the implementation following `CODING_STANDARDS.md` and the layer boundaries in `SYSTEM_ARCHITECTURE.md` / `DEPENDENCY_RULES.md`.
2. Write or update tests alongside the code — not as an afterthought. Backend tests use Go `testing` (`BACKEND_TESTING.md`); frontend tests use Vitest + React Testing Library, colocated with the component or module (`FRONTEND_TESTING.md`).
3. Re-run the relevant tests frequently while iterating, rather than only once at the end.

---

## 6. Quality Gates (Local, Before Opening a PR)

Run the checks defined in `QUALITY_GATES.md` locally before pushing — formatter, linter, type-check, tests, and build, for whichever application(s) changed. A pull request should not be opened with a known-failing gate; if one cannot pass for a documented reason, that reason belongs in the pull request description, not silently skipped.

---

## 7. Keeping Documentation in Sync

If the change alters a domain rule, an API contract, a data contract, or a significant architectural decision, the corresponding document is updated in the same branch, before the pull request is opened — the documentation set under `docs/` is expected to describe the system as it actually behaves, not as it behaved at some earlier point. See `DEFINITION_OF_DONE.md` section 6 for the exact list of documents this applies to.

---

## 8. Pull Request and Review

1. Open a pull request following `PULL_REQUEST_GUIDELINES.md` — a clear title, a description of what changed and why, and a note on what was verified.
2. Reference the use case or functional requirement the change satisfies, where applicable.
3. Address review feedback with focused follow-up commits rather than rewriting history mid-review, unless the reviewer explicitly asks for a squash/rebase.
4. Once the checklist in `DEFINITION_OF_DONE.md` is satisfied and the review is resolved, merge into `main`.

Given the project's small/solo-team context described in `GIT_MANAGEMENT.md`, review may be self-review against the checklist rather than a second person, but the checklist itself is not optional.

---

## 9. What This Document Does Not Cover

- Line-level coding rules — see `CODING_STANDARDS.md`.
- The exact set of automated checks and their tooling — see `QUALITY_GATES.md`.
- Branch naming and commit message format — see `GIT_MANAGEMENT.md`.
- Pull request structure and review etiquette — see `PULL_REQUEST_GUIDELINES.md`.
- Container/Compose service definitions — see `docs/11_devops/DOCKER_COMPOSE.md`.

---

## 10. Workflow Principle

> Check the docs before writing code. Write the smallest correct change. Verify it before asking someone else to.

The workflow exists to keep `main` always in a state that reflects both working code and accurate documentation — not one at the expense of the other.
