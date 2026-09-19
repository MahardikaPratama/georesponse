# Frontend Naming

## 1. Purpose

This document defines the naming and file-structure conventions used inside `georesponse-fe/src`.

It expands `CODING_STANDARDS.md` section 4 (Naming) into frontend-specific detail, with concrete examples. Where this document and `CODING_STANDARDS.md` overlap, `CODING_STANDARDS.md` is the source of truth; this document exists to make the convention unambiguous when applied to a real component tree.

---

## 2. Directory Naming

All directories under `src/` use `kebab-case`.

```text
common/status-indicator/
components/resource-map/
components/resource-map/map-adapter/
utils/logger/
```

This applies to feature directories, shared primitive directories, and any subfolder grouping multiple related files for a single concern (see section 6).

---

## 3. File Naming by Kind

| File kind | Convention | Example |
|---|---|---|
| React component (public API of its directory) | `PascalCase.tsx` | `ResourceCard.tsx` |
| Component-local types | `PascalCase.types.ts` | `ResourceCard.types.ts` |
| Component-local constants | `PascalCase.constants.ts` | `ResourceCard.constants.ts` |
| Component-local utility functions | `PascalCase.utils.ts` | `ResourceCard.utils.ts` |
| Component-local hook | `useCamelCase.ts` | `useResourceCardActions.ts` |
| Shared/global hook | `useCamelCase.ts` | `useResourceFilters.ts` |
| Shared/global types | `camelCase.types.ts` | `resource.types.ts` |
| Shared/global constants | `camelCase.constants.ts` | `resource.constants.ts` |
| Shared/global utility | `camelCase.ts` | `cn.ts`, `withTimeOut.ts` |
| Store | `useXStore.ts` | `useAlertStore.ts` |
| Test | colocated `*.test.ts` / `*.test.tsx` | `ResourceCard.test.tsx`, `resourceApi.test.ts` |

Constant *values* inside a `.constants.ts` file use `SCREAMING_SNAKE_CASE`, per `CODING_STANDARDS.md` section 4:

```ts
export const MAX_RESOURCE_NAME_LENGTH = 100;
export const DEFAULT_PAGE_SIZE = 20;
```

Never create a `__tests__/` directory. Tests live next to the file they cover, as already established by `utils/logger/logger.test.ts`.

---

## 4. Naming Inside Code

The base naming rules (casing per identifier kind, nouns for data/types, verbs for actions, avoiding generic names) are defined in `CODING_STANDARDS.md` section 4 and apply as-is to `georesponse-fe`. Applied to the concrete domain, that gives examples such as:

- Components: `ResourceCard`, `StatusIndicator`.
- Types/interfaces: `Resource`, `ResourceFilters`, `ResourceCardProps`.
- Functions/variables: `getResources`, `selectedResourceId`.
- Constants: `DEFAULT_PAGE_SIZE`.
- Hooks: `useResourceList`, `useAlertStore`.
- Avoid generic names (`data`, `item`, `value`, `result`) when a more specific name is available — prefer `resource`, `resourceFilters`, `selectedResource`.

---

## 5. Component Directory Layout and Encapsulation

Every component that has more than a single file gets its own `kebab-case` directory. The directory's public API is the single file matching the component's `PascalCase` name; everything else in the directory is private to that component.

Example for a hypothetical `resource-card` component:

```text
components/resource-card/
├── ResourceCard.tsx              # Public API — imported by other modules
├── ResourceCard.types.ts         # Props, local types — private
├── ResourceCard.constants.ts     # e.g. status → label mapping — private
├── useResourceCardActions.ts     # Local hook (edit/delete handlers) — private
└── ResourceCard.test.tsx         # Colocated test
```

Correct import from outside the directory:

```ts
import ResourceCard from "@components/resource-card/ResourceCard";
```

Incorrect — never reach into a component's private files from outside it:

```ts
import { ResourceCardProps } from "@components/resource-card/ResourceCard.types";
```

### 5.1 Promotion Rule

A private file is promoted out of a component directory only when a second, unrelated component genuinely needs it:

| Private file | Promoted to | New name |
|---|---|---|
| `ResourceCard.types.ts` (a type also needed elsewhere) | `types/` | `resource.types.ts` |
| `ResourceCard.constants.ts` | `constants/` | `resource.constants.ts` |
| `useResourceCardActions.ts` (generalized) | `hooks/` | `useResourceActions.ts` |
| A presentational fragment reused by another feature | `common/` | `common/resource-badge/ResourceBadge.tsx` |
| Cross-cutting UI state | `store/` | `useResourceSelectionStore.ts` |

Do not promote a file speculatively. Follow `DEPENDENCY_RULES.md` section 5: shared code is created only when it is genuinely reused, not because it might be useful later.

---

## 6. Multi-File Utilities

When a single concern needs more than one file (implementation, types, tests), give it its own directory instead of prefixing files, following the existing `utils/logger/` example:

```text
utils/logger/
├── logger.ts
├── logger.types.ts
└── logger.test.ts
```

The same pattern applies to the map adapter, since it has an implementation file and may need its own types:

```text
components/resource-map/map-adapter/
├── MapAdapter.ts
└── MapAdapter.types.ts
```

---

## 7. Store Naming

A Zustand-style store lives directly under `store/` (not in its own subdirectory, unless it later grows multiple files) and is named `useXStore.ts`, matching `store/useAlertStore.ts`:

```text
store/
└── useAlertStore.ts
```

The store's default export is the hook itself (`useAlertStore`), created with a single `create<T>(...)` call. See `FRONTEND_STATE.md` for when introducing a new store is appropriate.

---

## 8. Barrel Files

Do not introduce `index.ts` barrel files purely to shorten import paths. Import directly from the file that defines the export. This keeps import boundaries aligned with the module's responsibility, per `CODING_STANDARDS.md` section 6.

---

## 9. Scope Boundary

This document does not define:

- general naming principles (`CODING_STANDARDS.md` section 4);
- the folder/layer architecture itself (`FRONTEND_ARCHITECTURE.md`);
- state-management conventions (`FRONTEND_STATE.md`);
- test-writing conventions beyond file naming (`FRONTEND_TESTING.md`);
- backend or Go naming (`CODING_STANDARDS.md` section 14).

---

## 10. Naming Principle

A file's name and location should tell another developer whether it is public or private, and whether it belongs to one component or to the whole application, without needing to open it.

> If a file is imported from outside its directory, its name says so by living in `common/`, `hooks/`, `utils/`, `types/`, `constants/`, `api/`, or `store/`. If it is only used inside one component, it stays there, prefixed with that component's name.
