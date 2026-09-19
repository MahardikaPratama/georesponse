# AI Operation Rules

## 1. Purpose

This document is the durable rulebook for any AI coding agent (Claude Code or similar Agentic AI tooling) operating in the GeoResponse repository.

It is the canonical, long-form source of AI operation policy for this project. A shorter, more operational root-level `AGENTS.md` / `CLAUDE.md` may exist alongside it for quick orientation; where that file is brief, this document is authoritative and should be read in full before any non-trivial change.

These rules apply regardless of which AI tool is used, and regardless of whether the human operator is present interactively or the agent is running a longer autonomous task.

---

## 2. Source-of-Truth Precedence

The `docs/` tree is authoritative over assumptions, training data, and general best practice. When implementing or changing behavior, precedence is:

```text
1. docs/01_product        (what the product is, who uses it, what a Resource is)
2. docs/02_requirements   (functional and non-functional requirements)
3. docs/03_architecture   (system architecture, dependency rules)
4. docs/04_contracts      (API and data contracts)
5. docs/05-11             (engineering, frontend, backend, database, quality, git, devops)
6. Existing code and conventions
7. General AI knowledge / assumptions
```

Rules:

- Do not override a documented decision because a "better" general-purpose pattern exists. If a documented decision genuinely looks wrong, raise it — do not silently work around it.
- When a document is silent or ambiguous on a specific point, prefer asking the operator, or making the **smallest reasonable assumption** and explicitly stating that assumption in the change's report or pull request description. Do not use ambiguity as license to invent new scope.
- Never treat an assumption as a documented fact in a report back to the operator.

---

## 3. Domain Fidelity

GeoResponse's domain model is defined in `docs/01_product/DOMAIN_MODEL.md`.

- Always use **`Resource`** as the domain term for the objects the system manages. Do not introduce a generic term such as "Entity" or "Item" in code, comments, or documentation.
- Resource types are limited to the enum defined in the domain model: `VEHICLE`, `FACILITY`, `EQUIPMENT`, `IOT_DEVICE`.
- Resource statuses are limited to the enum defined in the domain model: `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `UNAVAILABLE`.
- Do not add, rename, or remove a resource type or status value without first updating `DOMAIN_MODEL.md` (and any dependent contract in `docs/04_contracts/`) in the same change.
- Preserve the distinction between `Resource`, `ResourceHistory`, `AuditRecord`, `User`, `Role`, and `Permission` as separate concepts — do not collapse them into one generic structure for convenience.

---

## 4. Architecture Boundaries

Follow `SYSTEM_ARCHITECTURE.md` and `DEPENDENCY_RULES.md` without exception:

**Backend** — dependency direction is one-way:

```text
HTTP Handler → Application/Use Case → Domain → Repository Interface → Repository Implementation → Database
```

- Do not put business logic inside handlers.
- Do not access the database directly from a handler.
- Domain code must not depend on HTTP or database-driver types.

**Frontend** — dependency direction is one-way:

```text
Page/Feature → Components/Hooks → API / Map Adapter → External System
```

- MapLibre GL JS usage must remain behind the map adapter. Do not import MapLibre directly into a feature component or presentational component.
- Do not put API/data-access logic directly inside presentational components.
- Use TanStack Query for server state; do not duplicate server state into local `useState` without a documented reason.

If a change appears to require crossing one of these boundaries, that is a signal to reconsider the approach, not to add a shortcut import.

---

## 5. Technology Boundaries

`TECHNOLOGY_SELECTION.md` section 17 explicitly excludes the following at the current project scope:

```text
gRPC as the primary browser-facing API
Microservices
Message brokers
Redis
Kubernetes
Event-driven infrastructure
Dedicated global state management beyond what is required
Additional abstraction layers without a concrete requirement
```

Do not introduce any of these without first adding a documented decision (an entry in `ARCHITECTURE_DECISION_RECORDS.md` and an update to `TECHNOLOGY_SELECTION.md`) explaining why the current architecture no longer fits. An AI agent must not make this call unilaterally and silently — it is a decision to surface to the operator.

---

## 6. Code Quality

- Follow `CODING_STANDARDS.md` for naming, file headers, error handling, and test placement.
- Do not fabricate benchmark results, test output, or coverage numbers. If a measurement was not actually run, say so — report `FAILED` or `NOT RUN`, never an invented figure. This mirrors the integrity rule already established for the map-library benchmark (`geo-map-benchmark/CLAUDE.md` section 4).
- Do not silently skip or weaken validation to make a test pass or a feature "work." If backend validation defined in `API_CONTRACT.md` section 12 or `DATA_CONTRACT.md` cannot be satisfied as specified, surface the conflict rather than loosening it.
- Do not suppress a lint, type, or compiler error without a documented reason in a comment or the pull request description.

---

## 7. Documentation Discipline

If a change alters behavior that a document under `docs/` describes, that document is updated in the **same change**, not as a follow-up task:

- API shape/behavior change → update `API_CONTRACT.md`.
- Data shape/meaning change → update `DATA_CONTRACT.md`.
- Domain model or business rule change → update `DOMAIN_MODEL.md` / `BUSINESS_RULES.md`.
- Architecturally significant decision → add an entry to `ARCHITECTURE_DECISION_RECORDS.md`.

An AI agent must not report a change as complete while leaving the documentation describing the old behavior. Documentation drift introduced by an AI-assisted change is treated the same as a bug.

---

## 8. Git and Repository Safety

- Never commit secrets, credentials, `.env` files, or connection strings. See `GIT_MANAGEMENT.md` section 7 for the full exclusion list.
- Never run a destructive git operation (`reset --hard`, `push --force`, `checkout --` discarding changes, `clean -f`, branch deletion) without explicit operator confirmation for that specific action.
- Follow the branch naming and commit message conventions in `GIT_MANAGEMENT.md`.
- Do not amend or rewrite commits that have already been shared/pushed without explicit instruction.

---

## 9. Reporting Honesty

- Do not report work as done, tested, or verified unless it was actually executed and observed to succeed. "The tests should pass" is not the same as "the tests were run and passed."
- When a step could not be completed (a tool failure, a missing dependency, an environment limitation), state that plainly rather than omitting it or implying success.
- Distinguish clearly, in any report back to the operator, between what was verified (build ran, tests passed, manually exercised) and what was only reasoned about.

---

## 10. Scope Discipline

- Make the smallest change that correctly satisfies the request. Do not rewrite unrelated code, reformat unrelated files, or "clean up" adjacent code as a side effect of an unrelated task.
- Do not introduce a new dependency, library, or abstraction without a concrete need tied to the current task — see `DEPENDENCY_RULES.md` section 6 for the applicable test.
- Do not expand a bug fix into a feature, or a feature into a refactor, without the operator asking for that expansion.

---

## 11. Priority When Rules Conflict

```text
1. Explicit operator instruction for the current task
2. Mandatory project requirements (React+TypeScript frontend, Go backend, REST+JSON, PostgreSQL+PostGIS)
3. docs/01-04 (product, requirements, architecture, contracts)
4. docs/05-11 (engineering conventions)
5. This document (AI_OPERATION_RULES.md) and AI_WORKFLOW.md
6. Implementation convenience
```

Implementation convenience never outranks a documented rule. When an explicit operator instruction conflicts with a documented rule, surface the conflict rather than silently picking one.

---

## 12. Scope Boundary

This document defines **rules of operation** — what an AI agent must and must not do while working in this repository. It does not define:

- the step-by-step working procedure for a task — see `AI_WORKFLOW.md`;
- line-level coding conventions — see `CODING_STANDARDS.md`;
- the branching/commit conventions — see `GIT_MANAGEMENT.md`;
- the quality gates that must pass — see `QUALITY_GATES.md`.

---

## 13. Principle

> An AI agent in this repository behaves like a careful contributor who reads the docs before writing code, changes only what the task requires, and never reports work that was not actually done.

This principle governs any case not explicitly covered above.
