# AI Operation Rules

## 1. Purpose

This is the canonical rulebook for any AI coding agent (Claude Code or a
similar agentic tool) working in the GeoResponse repository, whether the
operator is present interactively or the agent runs a longer autonomous
task. The root `AGENTS.md` (which `CLAUDE.md` imports) is a short entry
point that summarizes these rules; where it is brief or disagrees, this
document wins.

It defines what an agent must and must not do. The step-by-step procedure
is in `AI_WORKFLOW.md`, and the general workflow, coding, git, and quality
rules are in the documents linked below. For any case not covered here,
behave like a careful contributor: read the docs before writing code,
change only what the task requires, and never report work that was not
actually done.

---

## 2. Source-of-Truth Precedence

This section is the single statement of precedence for the repository.
`AGENTS.md` and `docs/12_workflow/DEVELOPMENT_WORKFLOW.md` link here. The
`docs/` tree outranks assumptions, training data, and general best practice:

```text
1. Explicit operator instruction for the current task
2. Mandatory technology stack (React + TypeScript, Go, REST + JSON,
   PostgreSQL + PostGIS; see AGENTS.md section 3)
3. docs/01_product, docs/02_requirements   (what the product must do)
4. docs/03_architecture, docs/04_contracts (how it is shaped)
5. docs/05_engineering to docs/13_ai       (engineering, frontend, backend,
                                            database, quality, git, devops,
                                            workflow, and AI conventions)
6. Existing code and conventions
7. General AI knowledge and assumptions
```

Within a tier, the lower-numbered folder wins (for example `03_architecture`
over `04_contracts`). `AGENTS.md` and `CLAUDE.md` summarize tier 5 and never
override it.

Rules:

- Do not override a documented decision because a "better" general-purpose
  pattern exists. If a decision looks wrong, raise it instead of working
  around it.
- When an operator instruction conflicts with a documented rule, surface the
  conflict instead of silently picking one.
- When a document is silent or ambiguous, ask the operator or make the
  **smallest reasonable assumption** and state it in the report or pull
  request description. Ambiguity is not license to invent scope.
- Never present an assumption as a documented fact.
- Implementation convenience never outranks a documented rule.

---

## 3. Domain Fidelity

The domain model is defined in `docs/01_product/DOMAIN_MODEL.md`.

- Use **`Resource`** for the objects the system manages. Do not introduce a
  generic term such as "Entity" or "Item" in code, comments, or
  documentation.
- Resource types are limited to `VEHICLE`, `FACILITY`, `EQUIPMENT`,
  `IOT_DEVICE`. Statuses are limited to `AVAILABLE`, `IN_USE`,
  `MAINTENANCE`, `UNAVAILABLE`.
- Do not add, rename, or remove a type or status value without updating
  `DOMAIN_MODEL.md` (and any dependent contract in `docs/04_contracts/`) in
  the same change.
- Keep `Resource`, `ResourceHistory`, `AuditRecord`, `User`, `Role`, and
  `Permission` as separate concepts. Do not collapse them into one generic
  structure.

---

## 4. Architecture Boundaries

Follow the backend and frontend dependency directions in
`docs/03_architecture/DEPENDENCY_RULES.md` (including the Map Adapter rule)
and the state rules in `docs/06_frontend/FRONTEND_STATE.md`. If a change
seems to require crossing a boundary, reconsider the approach instead of
adding a shortcut import.

---

## 5. Technology Boundaries

Do not introduce any technology excluded in `TECHNOLOGY_SELECTION.md`
section 17 (gRPC as the browser API, microservices, message brokers, Redis,
Kubernetes, and others listed there). Adding one requires a documented
decision first: an `ARCHITECTURE_DECISION_RECORDS.md` entry and a
`TECHNOLOGY_SELECTION.md` update. An agent never makes that call alone; it
surfaces the need to the operator.

---

## 6. Code Quality

- Follow `CODING_STANDARDS.md` for naming, file headers, error handling, and
  test placement.
- Do not fabricate benchmark results, test output, or coverage numbers. If a
  measurement was not run, report `FAILED` or `NOT RUN`, never an invented
  figure (the same integrity rule as `geo-map-benchmark/AGENT.md`
  section 8).
- Do not skip or weaken validation to make a test pass or a feature work. If
  the validation in `API_CONTRACT.md` section 12 or `DATA_CONTRACT.md`
  cannot be satisfied as specified, surface the conflict.
- Do not suppress a lint, type, or compiler error without a documented
  reason in a comment or the pull request description.

---

## 7. Documentation Discipline

Update documentation in the same change as the behavior it describes, as
required by `docs/12_workflow/DEFINITION_OF_DONE.md` section 6. An agent
must not report a change as complete while docs still describe the old
behavior. Documentation drift introduced by an AI-assisted change is a bug.

---

## 8. Git and Repository Safety

- Never commit secrets, credentials, `.env` files, or connection strings
  (see `GIT_MANAGEMENT.md` section 7).
- Never run a destructive git operation (`reset --hard`, `push --force`,
  `checkout --` discarding changes, `clean -f`, branch deletion) without the
  operator confirming that specific action.
- Do not amend or rewrite commits that have been shared or pushed without
  explicit instruction.
- Follow the branch and commit conventions in `GIT_MANAGEMENT.md`.

---

## 9. Reporting Honesty

- Do not report work as done, tested, or verified unless it was executed and
  observed to succeed. "The tests should pass" is not "the tests were run and
  passed."
- When a step could not be completed (tool failure, missing dependency,
  environment limitation), say so plainly.
- In every report, separate what was verified (build ran, tests passed,
  manually exercised) from what was only reasoned about.

---

## 10. Scope Discipline

- Make the smallest change that correctly satisfies the request. Do not
  rewrite, reformat, or clean up unrelated code as a side effect.
- Do not add a dependency, library, or abstraction without a concrete need
  tied to the current task (see `DEPENDENCY_RULES.md` section 6 for the
  test).
- Do not expand a bug fix into a feature, or a feature into a refactor,
  unless the operator asks.
