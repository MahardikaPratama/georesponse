# AI Workflow

## 1. Purpose

This document describes **how** Agentic AI tooling (Claude Code or similar) is used, and should be used, to build and maintain GeoResponse.

Where `AI_OPERATION_RULES.md` defines the durable rules an AI agent must follow, this document defines the concrete working procedure — the sequence of steps an agent (or a human following the same discipline) goes through for a typical unit of work.

---

## 2. Working Procedure

### Step 1 — Read

Before touching code, read the documents relevant to the task:

```text
Always:      docs/01_product/PRODUCT_CONTEXT.md, DOMAIN_MODEL.md
Usually:     the relevant use case in docs/01_product/USE_CASES.md
             the relevant requirement in docs/02_requirements/FUNCTIONAL_REQUIREMENTS.md
If touching an API or data shape:
             docs/04_contracts/API_CONTRACT.md, DATA_CONTRACT.md
If touching architecture or a new module boundary:
             docs/03_architecture/SYSTEM_ARCHITECTURE.md, DEPENDENCY_RULES.md
```

### Step 2 — Identify the Affected Layer/Boundary

Determine where the change belongs before writing anything:

```text
Backend:  Handler / Application-UseCase / Domain / Repository?
Frontend: Page-Feature / Component / Hook / API / Map Adapter?
```

If the task seems to require touching more than one boundary, confirm that each part of the change stays on its correct side of the dependency rules in `DEPENDENCY_RULES.md` rather than blending responsibilities.

### Step 3 — Check Existing Code and Conventions

Look at how similar functionality is already implemented in the codebase (naming, error handling, test structure, component composition) and follow the existing pattern rather than introducing a new one, per `CODING_STANDARDS.md` section 2.

### Step 4 — Make the Smallest Correct Change

Implement only what the task requires. Prefer extending an existing module over creating a new abstraction, unless the existing structure genuinely cannot accommodate the change.

### Step 5 — Run Tests, Build, and Lint

Before considering the change complete:

```text
Backend:   gofmt, go vet/lint, go test ./..., go build ./...
Frontend:  formatter, linter, type-check, vitest, build
```

Only checks that were actually executed may be reported as passing. See `AI_OPERATION_RULES.md` section 9.

### Step 6 — Update Documentation if Contracts Changed

If the change altered an API shape, a data shape, a domain rule, or an architectural decision, update the corresponding document (`API_CONTRACT.md`, `DATA_CONTRACT.md`, `DOMAIN_MODEL.md`, `BUSINESS_RULES.md`, `ARCHITECTURE_DECISION_RECORDS.md`) in the same change, per `DEFINITION_OF_DONE.md` section 6.

### Step 7 — Report

Report back clearly:

- what changed, and which files;
- why it changed (which requirement/use case/bug it addresses);
- what was actually verified (tests run and their result, build run and its result, manual check performed);
- any assumption made where documentation was silent or ambiguous;
- any unresolved issue or known limitation.

A report that only describes intent, without stating what was verified, is incomplete.

---

## 3. Example Walkthrough

A representative task: "add relocation history tracking to the resource detail view."

```text
1. Read:    PRODUCT_CONTEXT.md, DOMAIN_MODEL.md (ResourceHistory),
            API_CONTRACT.md section 9 (Resource History)
2. Layer:   Backend — Application/UseCase + Repository (history read);
            Frontend — Feature component + hook + API client
3. Check:   existing resource-detail component structure,
            existing repository query patterns
4. Change:  add history query to the use case and repository,
            add a history panel component consuming it via TanStack Query
5. Verify:  go test ./... (backend), npm test (frontend), npm run build
6. Docs:    confirm API_CONTRACT.md section 9 already matches the
            implemented response shape; update it if it does not
7. Report:  files changed, tests run and passed, any assumption
            (e.g. pagination default) stated explicitly
```

---

## 4. Working Procedure Priority

When a task touches multiple concerns at once, address them in this order:

```text
1. Correctness against the documented requirement/use case
2. Architectural boundary compliance
3. Test coverage for the new/changed behavior
4. Documentation consistency
5. Code style/polish
```

Do not skip ahead to polish before correctness and boundary compliance are satisfied.

---

## 5. Disclosure — AI Assistance Used in This Project

In keeping with the take-home assignment's requirement to document Agentic AI usage, this section states plainly how AI assistance was used to build GeoResponse.

The `docs/` tree — from `docs/01_product` through this document, `docs/13_ai` — was substantially authored with the assistance of Claude Code, an Agentic AI coding tool, under human direction and review. The human operator defined the product scope, requirements, and structure; the AI agent was used to draft, structure, and fill in documentation content following that direction, with the operator reviewing and directing revisions.

The application codebase was subsequently produced the same way, phase by phase per `IMPLEMENTATION_CHECKLIST.md`: the Phase 0 scaffolding (`georesponse-fe/` config, `georesponse-be/`'s minimal server, `database/migrations/`, `scripts/`), then the backend domain, repository, use-case, and HTTP layers (Phases 1–4), the frontend foundation and every feature (Phases 5–6, including the BMKG hotspot overlay added beyond the documented scope — see `SCOPE.md` section 11.5), the integration and e2e suites (Phase 7), containerization and the one-command run (Phase 8), CI (Phase 9), and this documentation reconciliation (Phase 10). The map-library benchmark in `geo-map-benchmark/` was produced the same way, but before implementation began — it was committed together with the initial `docs/` set and its result fed `TECHNOLOGY_SELECTION.md`. In each phase the AI agent drafted the code, tests, and doc updates following the working procedure in Section 2, while the operator specified the decisions (module path, migration tool, dependency choices, UI behaviour, what to defer or leave out of scope) and reviewed and directed revisions before anything was committed.

Verification was always reported as what actually ran, never assumed: backend checks (`go build`, `go vet`, `gofmt`, `go test`, repository tests against a live PostGIS container) ran locally in every phase; frontend checks (`npm run lint`/`typecheck`/`build`/`test`) ran locally when Node.js was available and otherwise in CI on `main`; the `tests/integration/` suite runs in CI against a live backend and PostGIS service container; and checks that could not be run in a given environment (for example the Playwright e2e suite, which is not a CI stage, the composed stack as a single `run.sh` / `docker compose up --build` run, or `scripts/dev/setup.sh` as a single end-to-end run) are marked as unverified in `IMPLEMENTATION_CHECKLIST.md` rather than checked off. The root `README.md` "Implementation Status" section and that checklist are the exact, current record of what has and has not been verified, and `SCOPE.md` section 11 records every requirement or use case that is only partially implemented at submission.

This disclosure is factual, not a caveat on quality: the working procedure, operation rules, and quality gates defined in this `docs/` tree apply identically regardless of whether a given line of code or documentation was typed by the human operator or drafted by an AI agent under their direction. The human operator remains responsible for reviewing and accepting all AI-assisted output before it is considered part of the project.

A shorter, operational `AGENTS.md` / `CLAUDE.md` at the repository root points back to this document and to `AI_OPERATION_RULES.md` as the canonical source of AI operation policy for anyone (human or AI) continuing to work on this repository.

---

## 6. Scope Boundary

This document describes the **working procedure** for using AI assistance on this project. It does not define:

- the rules an AI agent must follow while doing so — see `AI_OPERATION_RULES.md`;
- the general (non-AI-specific) development workflow — see `docs/12_workflow/DEVELOPMENT_WORKFLOW.md`;
- the quality gates a change must pass — see `QUALITY_GATES.md`.

---

## 7. Principle

> Read first, change the smallest correct thing, verify what actually ran, update the docs that describe it, and report honestly.

This is the same discipline expected of any contributor to this repository — the AI-specific documents exist to make it explicit and enforceable for Agentic AI tooling specifically.
