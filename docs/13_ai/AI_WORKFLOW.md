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

The Phase 0 scaffolding of the application codebase (`georesponse-fe/` config, `georesponse-be/`'s minimal server, `database/migrations/`, and `scripts/`) was subsequently produced the same way — AI-drafted under human direction, with the operator specifying decisions (module path, migration tool, dependency choices) and reviewing the result — following the working procedure in Section 2. Checks that could actually be run in that environment (`go build`, `go vet`, `gofmt`, a live health-check smoke test) were run and their results reported; checks that required tooling unavailable in that environment (Node.js/npm, a live PostgreSQL instance, `sonar-scanner`) were left unrun and explicitly disclosed as such rather than assumed to pass. See the root `README.md` "Implementation Status" section and `IMPLEMENTATION_CHECKLIST.md` for the exact, current state of what has and has not been verified. The resource-management feature packages (Phases 1 onward) have not yet been implemented as of this writing.

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
