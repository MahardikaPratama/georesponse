# AI Workflow

## 1. Purpose

This document covers the AI-specific parts of working on GeoResponse with
agentic tooling (Claude Code or similar): what to read first, how to report
back, and how AI assistance was used to build the project (section 5).

The general sequence from branch to merge is in
`docs/12_workflow/DEVELOPMENT_WORKFLOW.md`, the done checklist is in
`docs/12_workflow/DEFINITION_OF_DONE.md`, and the rules an agent must follow
are in `AI_OPERATION_RULES.md`.

---

## 2. Working Procedure

An agent follows `DEVELOPMENT_WORKFLOW.md` and `DEFINITION_OF_DONE.md` like
any contributor. The steps below add what is specific to AI-assisted work.

### 2.1 Read Before Changing Anything

```text
Always:      docs/01_product/PRODUCT_CONTEXT.md, DOMAIN_MODEL.md
Usually:     the relevant use case in docs/01_product/USE_CASES.md
             the relevant requirement in docs/02_requirements/FUNCTIONAL_REQUIREMENTS.md
If touching an API or data shape:
             docs/04_contracts/API_CONTRACT.md, DATA_CONTRACT.md
If touching architecture or a new module boundary:
             docs/03_architecture/SYSTEM_ARCHITECTURE.md, DEPENDENCY_RULES.md
```

Then identify which layer owns the change (backend handler, use case,
domain, or repository; frontend page, component, hook, API client, or Map
Adapter) and follow the existing pattern for similar code
(`CODING_STANDARDS.md` section 2).

### 2.2 Verify Only What Actually Ran

Run the gates in `QUALITY_GATES.md` section 3 for the affected
application. Only checks that were executed may be reported as passing (see
`AI_OPERATION_RULES.md` section 9).

### 2.3 Report

Every report back to the operator states:

- what changed, and in which files;
- why it changed (the requirement, use case, or bug it addresses);
- what was verified (tests run and their result, build run and its result,
  manual checks performed);
- any assumption made where documentation was silent or ambiguous;
- any unresolved issue or known limitation.

A report that describes intent without stating what was verified is
incomplete.

---

## 3. Example Walkthrough

A representative task: "add relocation history tracking to the resource
detail view."

```text
1. Read:    PRODUCT_CONTEXT.md, DOMAIN_MODEL.md (ResourceHistory),
            API_CONTRACT.md section 9 (Resource History)
2. Layer:   Backend - Application/UseCase + Repository (history read);
            Frontend - Feature component + hook + API client
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

When a task touches several concerns at once, address them in this order,
and do not move to polish before correctness and boundary compliance are
satisfied:

```text
1. Correctness against the documented requirement/use case
2. Architectural boundary compliance
3. Test coverage for the new/changed behavior
4. Documentation consistency
5. Code style/polish
```

---

## 5. Disclosure: AI Assistance Used in This Project

The take-home assignment asks for Agentic AI usage to be documented. This
section states how AI assistance was used to build GeoResponse.

### 5.1 Documentation

The `docs/` tree, from `docs/01_product` through `docs/13_ai`, was largely
written with Claude Code, an agentic AI coding tool, under human direction
and review. The operator designed the spec-driven workflow itself (docs
first, a fixed source-of-truth precedence, and the agent operating rules in
this folder and in `AGENTS.md`) and defined the product scope,
requirements, and document structure. The agent drafted and filled in the
content, and the operator reviewed it and directed revisions. The root
`README.md` "AI-Assisted Development" section summarizes who did what.

### 5.2 Application Code

The codebase was built the same way, phase by phase per
`IMPLEMENTATION_CHECKLIST.md`:

- Phase 0: scaffolding (`georesponse-fe/` config, the minimal
  `georesponse-be/` server, `database/migrations/`, `scripts/`).
- Phases 1 to 4: the backend domain, repository, use-case, and HTTP layers.
- Phases 5 and 6: the frontend foundation and every feature, including the
  BMKG hotspot overlay added beyond the documented scope (see `SCOPE.md`
  section 11.5).
- Phase 7: the integration and e2e suites.
- Phase 8: containerization and the one-command run.
- Phase 9: CI.
- Phase 10: documentation reconciliation.

The map-library benchmark in `geo-map-benchmark/` was produced the same
way, but before implementation began. It was committed with the initial
`docs/` set, and its result fed `TECHNOLOGY_SELECTION.md`.

In each phase the agent drafted code, tests, and doc updates following
section 2. The operator made the decisions (module path, migration tool,
dependency choices, UI behaviour, what to defer or leave out of scope) and
reviewed and directed revisions before anything was committed.

### 5.3 Verification

Verification was always reported as what actually ran:

- Backend checks (`go build`, `go vet`, `gofmt`, `go test`, repository tests
  against a live PostGIS container) ran locally in every phase.
- Frontend checks (`npm run lint`, `typecheck`, `build`, `test`) ran locally
  when Node.js was available, and otherwise in CI on `main`.
- The `tests/integration/` suite runs in CI against a live backend and a
  PostGIS service container.
- Checks that could not be run in a given environment are marked unverified
  in `IMPLEMENTATION_CHECKLIST.md` instead of checked off. Examples: the
  Playwright e2e suite (not a CI stage), the composed stack as a single
  `run.sh` / `docker compose up --build` run, and `scripts/dev/setup.sh` as
  a single end-to-end run.

The root `README.md` "Implementation Status" section and that checklist are
the current record of what has and has not been verified. `SCOPE.md`
section 11 records every requirement or use case that is only partially
implemented.

### 5.4 Responsibility

The working procedure, operation rules, and quality gates in `docs/` apply
the same way whether a line was typed by the operator or drafted by an
agent. The operator is responsible for reviewing and accepting all
AI-assisted output before it becomes part of the project. The root
`AGENTS.md` (imported by `CLAUDE.md`) points anyone continuing the work,
human or AI, to this document and `AI_OPERATION_RULES.md`.
