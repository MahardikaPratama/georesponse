# Coding Standards

## 1. Purpose

This document defines the practical coding rules to follow when adding or modifying source code.

These rules are intentionally focused on code quality and consistency. Architecture, API contracts, data models, scope, and technology decisions are defined in their respective documents.

---

## 2. General Rules

- Keep each file focused on one primary responsibility.
- Prefer simple, readable code over clever or overly abstract code.
- Follow existing project conventions before introducing a new pattern.
- Do not introduce dependencies, patterns, or abstractions without a clear need.
- Keep business rules explicit and testable.
- Avoid hidden side effects.
- Do not leave commented-out code in the codebase.
- Do not add unexplained magic numbers or strings.
- Do not leave unfinished `TODO` items without sufficient context or a tracked issue/reference.

---

## 3. File Header

Every source file must contain a file-level header with five fields: `Author`, `Version`, `Created Date`, `Description`, and `Changelog`.

**A multi-line comment must use the language's block-comment form (`/** */`-style), never a repeated single-line comment marker (`//`) stacked line after line.** This applies to every language that has a real block-comment syntax. The exact delimiters differ per language, but the shape is the same everywhere: one opening delimiter, the content, one closing delimiter — not the same marker repeated on every line.

### TypeScript / TSX / JavaScript

```ts
/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Resource list component. Displays resources and handles
 *                resource selection.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
```

### Go

Go supports `/* */` block comments in addition to `//` line comments; use the block form for this header (exported-identifier GoDoc comments elsewhere in the file still use the normal `//` GoDoc convention — this rule is about the file header specifically):

```go
/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Package resource contains resource management
                functionality.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource
```

For non-package Go source files, use the same five-field block-comment header.

### SQL

```sql
/*
 * Author       : Mahardika Pratama
 * Version      : 1.0.0
 * Created Date : 2026-09-19
 * Description  : Enables PostGIS and creates the resources table.
 *
 * Changelog:
 * - 1.0.0 (2026-09-19): Initial creation.
 */
```

### PowerShell (`.ps1`)

PowerShell's block-comment form is `<# ... #>`, not `#` repeated per line:

```powershell
<#
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : PowerShell equivalent of the corresponding .sh script.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
#>
```

### Bash (`.sh`)

Bash has no block-comment syntax — `#` per line is the only mechanism the language provides, so it remains the correct form here (this is a language limitation, not an exception to the rule above). The shebang stays on line 1, above the header:

```bash
#!/usr/bin/env bash
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-19
# Description  : Bash equivalent of the corresponding .ps1 script.
#
# Changelog:
# - 1.0.0 (2026-09-19): Initial creation.
```

### Pure configuration files — no header

**`.gitignore`, `.prettierignore`, `.prettierrc.json`, `.golangci.yml`, `sonar-project.properties`, `tsconfig.json`, `package.json`, GitHub Actions workflow YAML, and similar declarative configuration files do not get a file header at all.** They hold data/settings, not logic, and a header adds noise without adding information a `git log`/`git blame` on the file doesn't already give more precisely. This is different from executable configuration-as-code files that contain real logic (`rspack.config.js`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`, `eslint.config.js`) — those are source files and do get the standard header in their language's block-comment form.

The `Description` should state **what the file is responsible for**, not repeat its implementation. Every subsequent change to the file adds one line to `Changelog` (new version, date, one-line summary) rather than rewriting history.

### Author, Version, and Date

- `Author` is the person who authored the file in this repository — for this project, **Mahardika Pratama**. Do not attribute a file to an AI tool; per `docs/13_ai/AI_WORKFLOW.md`, AI assistance is disclosed at the project level, not per file.
- `Created Date` is the date the file was first added to **this** repository, in `YYYY-MM-DD` format — not the date of an earlier project it may have been adapted from.
- When a file is adapted from prior personal work (e.g. a reusable utility), reset `Author` to Mahardika Pratama, `Version` to `1.0.0`, and `Created Date` to today, and start a fresh `Changelog` noting the adaptation (e.g. `"Adapted from a prior personal project for GeoResponse."`) — do not carry over the original project's version history line by line.
- **Never include a company name, copyright notice, or "proprietary"/"confidential" marking in the header.** This is an individual take-home submission, not company-owned code — a header carrying another organization's copyright must never appear in this repository, including in code adapted from prior personal projects.

---

## 4. Naming

Use names that communicate intent and follow the project's established naming convention.

### General

- Use nouns for data/types.
- Use verbs for actions/functions.
- Avoid abbreviations unless they are well established.
- Avoid generic names such as `data`, `item`, `value`, or `result` when a more meaningful name is available.

### TypeScript / React

- Components: `PascalCase`
- Types/interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Hooks: `useCamelCase`
- Component utility files: `PascalCase.utils.ts`
- Component type files: `PascalCase.types.ts`
- Component constant files: `PascalCase.constants.ts`
- Component hook files: `useCamelCase.ts`
- Global type files: `camelCase.types.ts`
- Global constant files: `camelCase.constants.ts`
- Store files: `domain.store.ts` / `useDomainStore.ts` when a store is required

### File and directory names

- Directories: `kebab-case`
- Default source files: `camelCase.ts`
- React component files: `PascalCase.tsx`
- Tests: colocated with the source file as `*.test.ts` or `*.test.tsx`

Do not introduce a separate `__tests__` directory when colocated tests are practical.

---

## 5. Documentation and Docstrings

Documentation is required where it helps another developer understand the contract, purpose, or non-obvious behavior of code.

### Required

- Every source file has a file-level header.
- Exported TypeScript functions, classes, components, and important public types should have JSDoc when their purpose or contract is not immediately obvious.
- Exported Go identifiers must follow GoDoc conventions.
- Complex internal functions must have a comment explaining their purpose, constraints, or non-obvious behavior.

### TypeScript example

```ts
/**
 * Retrieves resources using the provided filters.
 *
 * @param filters - Search and filtering parameters.
 * @returns The matching resources.
 */
async function getResources(
  filters: ResourceFilters,
): Promise<Resource[]> {
  // ...
}
```

### Go example

```go
// CreateResource creates a resource after validating the input
// and applying the required business rules.
func (s *ResourceService) CreateResource(
    ctx context.Context,
    input CreateResourceInput,
) (*Resource, error) {
    // ...
}
```

Do not write comments that merely restate the code.

---

## 6. Imports

- Keep imports organized and consistent.
- Remove unused imports.
- Prefer direct imports over unnecessary re-export chains.
- Do not use imports solely to hide an architectural dependency.
- Keep import boundaries aligned with the module's responsibility.

---

## 7. Functions and Methods

- A function should have one clear responsibility.
- Keep functions short enough to understand without excessive scrolling.
- Extract logic when a function starts handling multiple responsibilities.
- Use descriptive parameters.
- Prefer an options/input object when a function requires many related parameters.
- Keep side effects explicit.
- Avoid functions that both perform unrelated business logic and handle presentation concerns.
- Handle asynchronous and I/O errors explicitly.
- Export functions only when they are part of a module's intended public API.

Do not add a function abstraction only to reduce line count. Extract code when the extracted unit has a meaningful responsibility or improves testability.

---

## 8. Types and Interfaces

### TypeScript

- Prefer precise types over `any`.
- Use `unknown` for data whose type is not yet known, then narrow it safely.
- Avoid unnecessary type assertions (`as`).
- Avoid non-null assertions (`!`) unless the invariant is guaranteed and clear.
- Define domain types explicitly.
- Keep API/transport types separate from domain types when their responsibilities differ.
- Avoid duplicating the same type definition across modules.

### Go

- Use domain-specific types when they improve correctness or readability.
- Keep transport/request/response structures separate from domain structures when appropriate.
- Do not leak database-specific structures into the domain layer unnecessarily.

---

## 9. Constants

- Replace repeated or meaningful literals with named constants.
- Constants must communicate the meaning of the value.
- Keep constants close to the responsibility where they are used.
- Do not create a global constant merely to avoid writing a literal once.

Example:

```ts
const MAX_RESOURCE_NAME_LENGTH = 100;
```

---

## 10. Error Handling

- Errors must be handled at the appropriate boundary.
- Do not silently ignore errors.
- Preserve useful error context.
- Do not expose internal implementation details through API errors.
- Use stable application/API error codes where required by the API contract.
- Do not use exceptions/errors as normal control flow when a simpler result is appropriate.

### TypeScript

- Handle rejected promises explicitly.
- Validate external data before using it.
- Avoid broad `catch` blocks that hide the original problem.

### Go

- Return errors instead of using `panic` for expected runtime failures.
- Wrap errors with context when crossing meaningful boundaries.
- Preserve the original error when appropriate using `%w`.
- Do not ignore returned errors with `_` unless there is a documented reason.
- Pass `context.Context` first for functions performing I/O or operations that may need cancellation.

Example:

```go
return fmt.Errorf("create resource: %w", err)
```

---

## 11. Comments

Comments should explain **why**, constraints, or non-obvious behavior.

Good:

```ts
// Keep the selected resource in local UI state because it does not
// represent server state.
```

Avoid:

```ts
// Set selected resource.
setSelectedResource(resource);
```

Do not use comments as a substitute for clear naming or structure.

---

## 12. TypeScript Rules

- Use strict TypeScript settings.
- Avoid `any`.
- Prefer explicit return types for exported functions.
- Narrow external input before using it.
- Avoid unnecessary type assertions.
- Avoid non-null assertions unless justified.
- Keep API calls in the appropriate data-access/application layer.
- Keep business rules out of reusable presentation components.
- Use existing project utilities before creating duplicates.

---

## 13. React Rules

### Components

- Components use `PascalCase`.
- Keep components focused on presentation and interaction.
- Extract reusable logic into hooks or application-level functions.
- Avoid large components with multiple unrelated responsibilities.
- Do not place API/data-access logic directly in presentational components.

### State

- Use **TanStack Query** for server state.
- Use React `useState` / `useReducer` for local UI state.
- Do not duplicate server state into local state without a clear reason.
- Avoid using `useEffect` as a substitute for server-state management.

### Hooks

- Custom hooks use the `useCamelCase` convention.
- A hook should represent a coherent piece of reusable behavior.
- Keep side effects inside the appropriate hook/application boundary.

### Lists

- Use stable, meaningful keys.
- Do not use array indexes as keys for dynamic lists unless the list is genuinely static and order cannot change.

### Map

- MapLibre-specific implementation must remain behind the map adapter boundary.
- Feature components should not directly depend on MapLibre APIs unless they are part of that adapter.

---

## 14. Go Rules

- Follow idiomatic Go.
- Run `gofmt` on Go source files.
- Follow Go naming conventions.
- Keep packages cohesive and small.
- Export only identifiers that need to be part of the package API.
- Add GoDoc comments to exported identifiers.
- Keep handlers thin; business rules belong in the application/domain layer.
- Keep database access inside the repository/data-access boundary.
- Avoid global mutable state.
- Pass context explicitly for request-scoped operations and I/O.
- Return meaningful errors instead of panicking for expected failures.

---

## 15. Tests

### General

- Test observable behavior and business rules rather than implementation details.
- Test success and relevant failure paths.
- Tests must be deterministic.
- Avoid arbitrary sleeps and timing-dependent assertions.
- Mock or isolate external boundaries when appropriate.

### Frontend

- Tests are colocated with the source:
  - `ResourceList.test.tsx`
  - `resourceApi.test.ts`
- Use Vitest and React Testing Library.
- Prefer user-facing behavior and interaction assertions.

### Backend

- Use Go's standard `testing` package.
- Test application/domain behavior independently from infrastructure where practical.
- Test repository behavior separately when persistence behavior matters.

---

## 16. Formatting and Static Checks

Before considering a change complete:

- Run the project's formatter.
- Run the project's linter/static checks.
- Run relevant frontend tests.
- Run relevant backend tests.
- Ensure the project builds successfully.
- Do not suppress lint/type errors without a documented reason.

Formatting and static-analysis configuration should be shared through project configuration rather than individual developer preferences.

---

## 17. Code Review Checklist

Before committing or opening a pull request, verify:

- [ ] Every changed source file has an appropriate header.
- [ ] Names clearly describe their purpose.
- [ ] Exported/public APIs are documented where required.
- [ ] Complex logic has explanatory documentation.
- [ ] Functions have one clear responsibility.
- [ ] No unnecessary abstraction was introduced.
- [ ] No commented-out code remains.
- [ ] No unexplained magic values were introduced.
- [ ] Errors are handled explicitly.
- [ ] Types are precise; unnecessary `any` and assertions are avoided.
- [ ] React server state uses TanStack Query where appropriate.
- [ ] MapLibre usage remains behind the map adapter.
- [ ] Tests cover the changed behavior.
- [ ] Formatting, linting, tests, and build checks pass.
