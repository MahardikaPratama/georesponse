# Frontend Naming

## 1. Purpose

This document defines the file, directory, and suffix conventions used
inside `georesponse-fe/src`, with concrete examples. Identifier casing per
language and the general naming rules are owned by `CODING_STANDARDS.md`
section 4; this file owns the frontend file-naming and suffix list. The
folder/layer architecture is in `FRONTEND_ARCHITECTURE.md`, state
conventions in `FRONTEND_STATE.md`, test conventions in
`FRONTEND_TESTING.md`, and the backend counterpart is `BACKEND_NAMING.md`.

---

## 2. Directory Naming

All directories under `src/` use `kebab-case`.

```text
common/status-indicator/
components/resource-map/
components/resource-map/map-adapter/
utils/logger/
```

This applies to feature directories, shared primitive directories, and any
subfolder grouping related files for a single concern (see section 6).

---

## 3. File Naming by Kind

| File kind | Convention | Example |
|---|---|---|
| React component (public API of its directory) | `PascalCase.tsx` | `ResourceCard.tsx` |
| Component-local types | `PascalCase.types.ts` | `ResourceCard.types.ts` |
| Component-local constants | `PascalCase.constants.ts` | `ResourceCard.constants.ts` |
| Component-local utility functions | `PascalCase.utils.ts` | `ResourceCard.utils.ts` |
| Component-local hook | `useCamelCase.ts` | `useResourceCardActions.ts` |
| Shared/global hook | `useCamelCase.ts` | `useResources.ts`, `useDebouncedValue.ts` |
| Shared/global types | `camelCase.types.ts` | `resource.types.ts` |
| Shared/global constants | `camelCase.constants.ts` | `resourceStatus.constants.ts` |
| Shared/global utility, or any other non-component source file | `camelCase.ts` | `cn.ts`, `withTimeOut.ts` |
| API module | `<domain>Api.ts` + `<domain>Api.types.ts` + `<domain>Keys.ts` in `api/<domain>/` | `resourceApi.ts`, `resourceKeys.ts` |
| Store (none exists yet; see section 7) | `useXStore.ts` | `useAlertStore.ts` |
| Test | colocated `*.test.ts` / `*.test.tsx` | `ResourceList.test.tsx`, `httpClient.test.ts` |

Constant values inside a `.constants.ts` file use `SCREAMING_SNAKE_CASE`:

```ts
export const MAX_RESOURCE_NAME_LENGTH = 100;
export const DEFAULT_PAGE_SIZE = 20;
```

Never create a `__tests__/` directory. Tests live next to the file they
cover (see `FRONTEND_TESTING.md` section 3).

---

## 4. Naming Inside Code

Identifier casing and the general rules (nouns for data and types, verbs
for actions, no generic names) are in `CODING_STANDARDS.md` section 4.
Applied to this domain: `ResourceCard`, `ResourceFilters`,
`getResources`, `selectedResourceId`, `DEFAULT_PAGE_SIZE`,
`useRelocateResource`; prefer `resource` or `selectedResource` over
`data` or `item`.

---

## 5. Component Directory Layout and Encapsulation

Every component with more than one file gets its own `kebab-case`
directory. The directory's public API is the single file matching the
component's `PascalCase` name; everything else in the directory is private
to that component.

Example for a hypothetical `resource-card` component:

```text
components/resource-card/
├── ResourceCard.tsx              # Public API, imported by other modules
├── ResourceCard.types.ts         # Props, local types (private)
├── ResourceCard.constants.ts     # e.g. status → label mapping (private)
├── useResourceCardActions.ts     # Local hook for edit/delete handlers (private)
└── ResourceCard.test.tsx         # Colocated test
```

Correct import from outside the directory:

```ts
import ResourceCard from "@components/resource-card/ResourceCard";
```

Incorrect: never reach into a component's private files from outside it.

```ts
import { ResourceCardProps } from "@components/resource-card/ResourceCard.types";
```

### 5.1 Promotion Rule

A private file is promoted out of a component directory only when a
second, unrelated component needs it:

| Private file | Promoted to | New name |
|---|---|---|
| `ResourceCard.types.ts` (a type also needed elsewhere) | `types/` | `resource.types.ts` |
| `ResourceCard.constants.ts` | `constants/` | `resource.constants.ts` |
| `useResourceCardActions.ts` (generalized) | `hooks/` | `useResourceActions.ts` |
| A presentational fragment reused by another feature | `common/` | `common/resource-badge/ResourceBadge.tsx` |
| Cross-cutting UI state | `store/` | `useResourceSelectionStore.ts` |

Do not promote a file speculatively. Shared code is created only when it
is actually reused (`DEPENDENCY_RULES.md` section 5).

The location of a file tells the reader its reach: anything imported from
outside its directory lives in `common/`, `hooks/`, `utils/`, `types/`,
`constants/`, `api/`, or `store/`; anything used by one component stays in
that component's directory, prefixed with its name.

---

## 6. Multi-File Utilities

When a single concern needs more than one file (implementation, types,
tests), give it its own directory instead of prefixing files, as
`utils/logger/` does:

```text
utils/logger/
├── logger.ts
├── logger.types.ts
└── logger.test.ts
```

The map adapter follows the same pattern:

```text
components/resource-map/map-adapter/
├── MapAdapter.ts
├── MapAdapter.types.ts
└── MapAdapter.test.ts
```

---

## 7. Store Naming

`store/` is empty (a `.gitkeep` placeholder); no store has been needed (see
`FRONTEND_STATE.md` section 8). If one is introduced, it lives directly
under `store/` (in its own subdirectory only if it grows multiple files)
and is named `useXStore.ts`:

```text
store/
└── useAlertStore.ts
```

The store's default export is the hook itself (`useAlertStore`).

---

## 8. Barrel Files

Do not add `index.ts` barrel files to shorten import paths. Import directly
from the file that defines the export, so import boundaries match module
responsibility (`CODING_STANDARDS.md` section 6).
