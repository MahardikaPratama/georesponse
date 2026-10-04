# Development Workflow

## 1. Purpose

This document is the day-to-day sequence for developing GeoResponse, from
picking up a unit of work to merging it into `main`. It ties together
documents that own the details: line-level rules in `CODING_STANDARDS.md`,
gate commands in `QUALITY_GATES.md`, branch and commit conventions in
`GIT_MANAGEMENT.md`, pull request structure in `PULL_REQUEST_GUIDELINES.md`,
the final checklist in `DEFINITION_OF_DONE.md`, and Compose services in
`docs/11_devops/DOCKER_COMPOSE.md`.

---

## 2. Source of Truth Before Implementation

Before writing code, check whether the behavior is already specified in
`docs/01_product/` to `docs/04_contracts/`. The full precedence order
between docs, code, and assumptions is in
`docs/13_ai/AI_OPERATION_RULES.md` section 2 and applies to every
contributor, human or AI.

If a planned change contradicts those documents, either the plan is wrong
or the documents need updating in the same change; the two never silently
diverge. Where a document is silent, make the smallest reasonable
assumption and state it in the pull request description.

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

Create a branch off `main` using the prefix convention in
`GIT_MANAGEMENT.md` section 4, scoped to one unit of work as defined in
`DEFINITION_OF_DONE.md` section 2.

---

## 5. Local Development Loop

### 5.1 Environment

Local development runs the frontend, backend, and a PostgreSQL + PostGIS
database. `./run.sh` or `.\run.ps1` brings up all three with Docker Compose,
migrated and seeded. For day-to-day iteration you can run only the database
via Compose and start each app directly. `scripts/dev/setup.sh` /
`setup.ps1` installs dependencies in one step, and
`docs/11_devops/DOCKER_COMPOSE.md` lists the exact services and commands.

Typical loop:

```text
1. Start local dependencies (database, and backend/frontend if run via Compose).
2. Run the backend directly (`go run ./cmd/api` from georesponse-be/) if not run via Compose.
3. Run the frontend dev server (`npm run dev`, Rspack dev server on port 5173).
4. Make the change.
5. Verify it manually against the running application.
```

### 5.2 Iterating

1. Implement the change following `CODING_STANDARDS.md` and the layer
   boundaries in `DEPENDENCY_RULES.md`.
2. Write or update tests alongside the code: Go `testing` for the backend
   (`BACKEND_TESTING.md`), colocated Vitest + React Testing Library tests
   for the frontend (`FRONTEND_TESTING.md`).
3. Re-run the relevant tests often while iterating, not only at the end.

---

## 6. Quality Gates

Run the gates in `QUALITY_GATES.md` section 3 locally for whichever
application changed before pushing. Do not open a pull request with a
known-failing gate. If a gate cannot pass for a documented reason, say so in
the pull request description.

---

## 7. Keeping Documentation in Sync

Update the documents that describe changed behavior in the same branch,
before the pull request is opened. `DEFINITION_OF_DONE.md` section 6 owns
this rule and the list of documents it covers.

---

## 8. Pull Request and Review

1. Open a pull request following `PULL_REQUEST_GUIDELINES.md`.
2. Address review feedback with focused follow-up commits rather than
   rewriting history mid-review, unless the reviewer asks for a squash or
   rebase.
3. Merge into `main` once the `DEFINITION_OF_DONE.md` checklist is
   satisfied and review is resolved.

On this solo project, review may be self-review against that checklist, but
the checklist itself is not optional.
