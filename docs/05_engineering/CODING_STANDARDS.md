# Coding Standards

## 1. Purpose

This document defines the code-level rules for adding or changing source
code in GeoResponse: file headers, naming, documentation, error handling,
and per-language conventions. Architecture, API contracts, data models,
scope, and technology decisions live in their own documents.

---

## 2. General Rules

- Keep each file focused on one primary responsibility.
- Prefer simple, readable code over clever or overly abstract code.
- Follow existing project conventions before introducing a new pattern.
- Do not introduce dependencies, patterns, or abstractions without a clear
  need.
- Keep business rules explicit and testable.
- Avoid hidden side effects.
- Do not leave commented-out code in the codebase.
- Do not add unexplained magic numbers or strings.
- Do not leave a `TODO` without enough context or a tracked
  issue/reference.

---

## 3. File Header

Every source file must contain a file-level header with five fields:
`Author`, `Version`, `Created Date`, `Description`, and `Changelog`.

**A multi-line comment must use the language's block-comment form
(`/** */`-style), never a single-line marker (`//`) repeated line after
line.** This applies to every language that has real block-comment syntax.
The delimiters differ per language, but the shape is the same: one opening
delimiter, the content, one closing delimiter.

### 3.1 TypeScript / TSX / JavaScript

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

### 3.2 Go

Use the `/* */` block form for the file header. GoDoc comments on exported
identifiers elsewhere in the file still use the normal `//` convention.

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

Non-package Go source files use the same five-field block-comment header.

### 3.3 SQL

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

### 3.4 PowerShell (`.ps1`)

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

### 3.5 Files without a header

**Pure configuration files get no header:** `.gitignore`,
`.prettierignore`, `.prettierrc.json`, `.golangci.yml`,
`sonar-project.properties`, `tsconfig.json`, `package.json`, GitHub Actions
workflow YAML, and similar declarative files. They hold settings, not
logic, and `git log`/`git blame` already records their history more
precisely. Configuration-as-code files that contain real logic
(`rspack.config.js`, `tailwind.config.js`, `postcss.config.js`,
`vitest.config.ts`, `eslint.config.js`) are source files and do get the
standard header.

**Bash scripts (`.sh`) and environment files (`.env`, `.env.example`) also
get no header.** Shell scripts are operational tooling (run, build, and
deploy helpers), and Bash has no real block-comment syntax, so a brief
top-of-file comment describing the script's purpose is enough where useful.
`.env` files hold key-value configuration, like the files above.

The `Description` states **what the file is responsible for**, not how it
is implemented. Every later change adds one line to `Changelog` (new
version, date, one-line summary) instead of rewriting history.

### 3.6 Author, Version, and Date

- `Author` is the person who authored the file in this repository:
  **Mahardika Pratama**. Do not attribute a file to an AI tool; AI
  assistance is disclosed at the project level, per
  `docs/13_ai/AI_WORKFLOW.md`.
- `Created Date` is the date the file was first added to **this**
  repository, in `YYYY-MM-DD` format, not the date of an earlier project it
  was adapted from.
- When a file is adapted from prior personal work (e.g. a reusable
  utility), reset `Author` to Mahardika Pratama, `Version` to `1.0.0`, and
  `Created Date` to today, and start a fresh `Changelog` noting the
  adaptation (e.g. `"Adapted from a prior personal project for
  GeoResponse."`). Do not carry over the original version history.
- **Never include a company name, copyright notice, or
  "proprietary"/"confidential" marking in the header.** This is an
  individual take-home submission, not company-owned code, and that
  includes code adapted from prior personal projects.

---

## 4. Naming

Use names that communicate intent.

### 4.1 General

- Use nouns for data and types.
- Use verbs for actions and functions.
- Avoid abbreviations unless they are well established.
- Avoid generic names such as `data`, `item`, `value`, or `result` when a
  more meaningful name is available.

### 4.2 TypeScript / React

- Components: `PascalCase`
- Types/interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Hooks: `useCamelCase`
- Directories: `kebab-case`
- React component files: `PascalCase.tsx`; other source files:
  `camelCase.ts`
- Tests: colocated with the source file as `*.test.ts` or `*.test.tsx`; no
  `__tests__` directories

File suffixes by kind (`.types.ts`, `.constants.ts`, `.utils.ts`, API
modules, stores) are defined in `docs/06_frontend/FRONTEND_NAMING.md`
section 3.

### 4.3 Go

Follow idiomatic Go naming (`gofmt`-clean code, `MixedCaps` identifiers,
short lowercase package names). Package, file, and test naming for
`georesponse-be` is defined in `docs/07_backend/BACKEND_NAMING.md`.

---

## 5. Documentation and Docstrings

Document code where it helps another developer understand its contract,
purpose, or non-obvious behavior.

### 5.1 Required

- Every source file has a file-level header (section 3).
- Exported TypeScript functions, classes, components, and important public
  types have JSDoc when their purpose or contract is not obvious.
- Exported Go identifiers follow GoDoc conventions.
- Complex internal functions have a comment explaining their purpose,
  constraints, or non-obvious behavior.

### 5.2 TypeScript example

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

### 5.3 Go example

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
- Prefer direct imports over re-export chains.
- Do not use imports to hide an architectural dependency.
- Keep import boundaries aligned with the module's responsibility.

---

## 7. Functions and Methods

- A function has one clear responsibility.
- Keep functions short enough to understand without excessive scrolling.
- Extract logic when a function starts handling multiple responsibilities.
- Use descriptive parameters.
- Prefer an options/input object when a function needs many related
  parameters.
- Keep side effects visible.
- Do not mix business logic and presentation concerns in one function.
- Handle asynchronous and I/O errors.
- Export functions only when they are part of a module's intended public
  API.

Do not extract a function only to reduce line count. Extract code when the
new unit has a meaningful responsibility or improves testability.

---

## 8. Types and Interfaces

### 8.1 TypeScript

- Prefer precise types over `any`.
- Use `unknown` for data whose type is not yet known, then narrow it.
- Avoid unnecessary type assertions (`as`).
- Avoid non-null assertions (`!`) unless the invariant is guaranteed and
  clear.
- Define domain types explicitly.
- Keep API/transport types separate from domain types when their
  responsibilities differ.
- Do not duplicate the same type definition across modules.

### 8.2 Go

- Use domain-specific types when they improve correctness or readability.
- Keep transport (request/response) structures separate from domain
  structures where appropriate.
- Do not leak database-specific structures into the domain layer.

---

## 9. Constants

- Replace repeated or meaningful literals with named constants.
- A constant's name communicates the meaning of the value.
- Keep constants close to where they are used.
- Do not create a global constant merely to avoid writing a literal once.

Example:

```ts
const MAX_RESOURCE_NAME_LENGTH = 100;
```

---

## 10. Error Handling

- Handle errors at the appropriate boundary.
- Do not silently ignore errors.
- Preserve useful error context.
- Do not expose internal implementation details through API errors.
- Use the stable error codes defined by the API contract.
- Do not use errors as normal control flow when a simpler result fits.

### 10.1 TypeScript

- Handle rejected promises.
- Validate external data before using it.
- Avoid broad `catch` blocks that hide the original problem.

### 10.2 Go

- Return errors instead of using `panic` for expected runtime failures.
- Wrap errors with context when crossing meaningful boundaries.
- Preserve the original error with `%w` where appropriate.
- Do not discard returned errors with `_` without a documented reason.
- Pass `context.Context` first to functions that perform I/O or may need
  cancellation.

Example:

```go
return fmt.Errorf("create resource: %w", err)
```

The full backend error flow is in
`docs/07_backend/BACKEND_ERROR_HANDLING.md`.

---

## 11. Comments

Comments explain **why**, constraints, or non-obvious behavior.

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

**Do not cite a `docs/*.md` file, its filename, or a section number in a
source-code comment** (e.g. `// per docs/07_backend/BACKEND_ARCHITECTURE.md
section 4`). Explain the reasoning in the comment itself, so a reader can
act on it without leaving the file. The reverse is fine: `docs/*.md` files
may reference source files, and `README.md` files may link to `docs/*.md`.

---

## 12. TypeScript Rules

- Use strict TypeScript settings.
- Avoid `any`.
- Prefer explicit return types for exported functions.
- Narrow external input before using it.
- Avoid unnecessary type assertions and unjustified non-null assertions.
- Keep API calls in the data-access layer (`api/`, called through hooks).
- Keep business rules out of reusable presentation components.
- Use existing project utilities before creating duplicates.

---

## 13. React Rules

### 13.1 Components

- Components use `PascalCase`.
- Keep components focused on presentation and interaction.
- Extract reusable logic into hooks.
- Avoid large components with multiple unrelated responsibilities.
- Do not place API/data-access logic directly in presentational
  components.

### 13.2 State

Server state uses **TanStack Query**; local UI state uses React `useState`
/ `useReducer`. Do not copy server state into local state, and do not use
`useEffect` plus `useState` as a substitute for a query. Details are in
`docs/06_frontend/FRONTEND_STATE.md`.

### 13.3 Hooks

- Custom hooks use the `useCamelCase` convention.
- A hook represents one coherent piece of reusable behavior.
- Keep side effects inside the hook that owns them.

### 13.4 Lists

- Use stable, meaningful keys.
- Do not use array indexes as keys for dynamic lists unless the list is
  static and its order cannot change.

### 13.5 Map

Only code inside `components/resource-map/map-adapter/` may import
`maplibre-gl` or call MapLibre APIs. Feature components such as
`ResourceMap.tsx` use the adapter's interface. See
`docs/06_frontend/FRONTEND_ARCHITECTURE.md` section 8.

---

## 14. Go Rules

- Follow idiomatic Go.
- Run `gofmt` on Go source files.
- Keep packages cohesive and small.
- Export only identifiers that need to be part of the package API.
- Add GoDoc comments to exported identifiers.
- Keep handlers thin; business rules belong in the application/domain
  layer.
- Keep database access inside the repository boundary.
- Avoid global mutable state.
- Pass context explicitly for request-scoped operations and I/O.
- Return meaningful errors instead of panicking for expected failures.

---

## 15. Tests

### 15.1 General

- Test observable behavior and business rules, not implementation
  details.
- Test success paths and the relevant failure paths.
- Tests must be deterministic.
- Avoid arbitrary sleeps and timing-dependent assertions.
- Mock or isolate external boundaries where appropriate.

### 15.2 Frontend

Vitest and React Testing Library, colocated `*.test.ts(x)` files, and
user-facing assertions. See `docs/06_frontend/FRONTEND_TESTING.md`.

### 15.3 Backend

Go's standard `testing` package, with application/domain behavior tested
independently of infrastructure where practical. See
`docs/07_backend/BACKEND_TESTING.md`.

The overall test strategy is in `TESTING_STRATEGY.md`.

---

## 16. Formatting and Static Checks

The formatter, linter, type-check, build, and test commands a change must
pass are defined in `docs/09_quality/QUALITY_GATES.md` section 3.

- Do not suppress lint or type errors without a documented reason.
- Formatting and static-analysis settings come from the shared project
  configuration, not individual editor preferences.

---

## 17. Code Review Checklist

Code-level checks for every changed file:

- [ ] Every changed source file has the header from section 3.
- [ ] Names describe their purpose.
- [ ] Exported/public APIs are documented where required.
- [ ] Complex logic has explanatory comments.
- [ ] Functions have one clear responsibility.
- [ ] No unnecessary abstraction was introduced.
- [ ] No commented-out code remains.
- [ ] No unexplained magic values were introduced.
- [ ] Errors are handled, not ignored.
- [ ] Types are precise; `any` and unnecessary assertions are avoided.
- [ ] Server state uses TanStack Query.
- [ ] `maplibre-gl` is imported only inside the map adapter.

Tests, quality gates, documentation, and pull-request requirements are in
`docs/12_workflow/DEFINITION_OF_DONE.md`.
