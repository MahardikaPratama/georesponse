# GeoResponse — Frontend

GeoResponse is a geospatial resource management application for disaster response. This package is the React + TypeScript frontend: it displays resources on a map, and lets users search, filter, view, create, update, and relocate them through the GeoResponse API.

For the product and architecture background, see `../docs`. This README covers only how to run and work on the frontend.

---

## Implementation Status

This package does not yet have a `package.json`, build configuration, or a
runnable application — only a handful of scaffolding files exist under
`src/`. The commands below describe the intended setup once implementation
is complete; they will not run against the repository in its current state.
See the root [`README.md`](../README.md#implementation-status) for the
overall project status.

---

## Prerequisites

- Node.js (LTS) and npm
- The GeoResponse backend (`georesponse-be`) running and reachable, or its API base URL configured (see [Environment Variables](#environment-variables))

## Install

```sh
npm install
```

## Run the Dev Server

```sh
npm run dev
```

Starts the Rspack development server with hot reload.

## Build

```sh
npm run build
```

Produces a production build.

## Test

```sh
npm run test
```

Runs the test suite with Vitest + React Testing Library. Tests are colocated with their source files (`Component.test.tsx`, `module.test.ts`) — see `docs/06_frontend/FRONTEND_TESTING.md`.

## Lint

```sh
npm run lint
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Base URL of the GeoResponse backend, e.g. `http://localhost:8080/api/v1` |

Set these in a local `.env` file (not committed) or through your shell before running `npm run dev` / `npm run build`.

---

## Tech Stack

| Area | Technology |
|---|---|
| Framework | React + TypeScript |
| Build tool | Rspack |
| Map | MapLibre GL JS |
| Server state | TanStack Query |
| Client state | React `useState` / `useReducer`, plus a small Zustand-style store for cross-cutting UI state |
| Styling | Plain CSS |
| Testing | Vitest + React Testing Library |

Each decision, and why it was made, is documented in `../docs/05_engineering/TECHNOLOGY_SELECTION.md`. The map library specifically was chosen through a dedicated performance benchmark against Leaflet and OpenLayers — see `../geo-map-benchmark`.

---

## Project Structure

```text
src/
├── App.tsx, main.tsx, index.css
├── common/       # Shared presentational primitives (Card, StatusIndicator, Tabs, ...)
├── components/   # Feature components (resource map, resource list, dashboard, ...)
├── hooks/        # Shared, reusable hooks
├── store/        # Cross-cutting client UI state (e.g. useAlertStore)
├── api/          # Data-access layer — the only place that talks to the backend
├── types/        # Shared domain/application types
├── constants/    # Shared application constants
├── utils/        # Shared, framework-agnostic utilities
└── assets/
```

MapLibre-specific code stays behind a map adapter inside the relevant feature component's directory; feature components never call MapLibre APIs directly.

For the full architecture and data-flow explanation, see `../docs/06_frontend/FRONTEND_ARCHITECTURE.md`. For file/folder naming conventions, see `../docs/06_frontend/FRONTEND_NAMING.md`. For state-management conventions, see `../docs/06_frontend/FRONTEND_STATE.md`. For UI/UX conventions, see `../docs/06_frontend/FRONTEND_UI_UX.md`.

---

## Docker

A `Dockerfile` is provided for containerized builds/serving. See `Dockerfile` in this directory.
