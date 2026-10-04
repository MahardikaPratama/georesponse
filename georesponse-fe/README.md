# GeoResponse Frontend

GeoResponse is a geospatial resource management application for disaster
response. This package is the React + TypeScript frontend: it shows
resources on a map and lets users search, filter, view, create, update,
delete, and relocate them through the GeoResponse API.

This README covers how to run and work on the frontend. For product and
architecture background, see [`docs/`](../docs).

## Implementation Status

The frontend is fully runnable and implements every functional
requirement, with the partial items (for example, no pagination control
and no narrow-viewport layout) listed in
[`docs/01_product/SCOPE.md` section 11](../docs/01_product/SCOPE.md#11-implementation-status-at-submission).

## Prerequisites

- Node.js (LTS) and npm
- The GeoResponse backend ([`georesponse-be`](../georesponse-be)) running
  and reachable, or its API base URL configured (see
  [Environment Variables](#environment-variables))

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

Produces a production build in `dist/`.

## Test

```sh
npm run test
```

Runs the Vitest + React Testing Library suite. Tests are colocated with
their source files; see
[`FRONTEND_TESTING.md`](../docs/06_frontend/FRONTEND_TESTING.md).

## Lint

```sh
npm run lint
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Base URL of the GeoResponse backend, e.g. `http://localhost:8080/api/v1` |
| `MAP_TILE_URL` | Raster tile URL template for the base map; if unset or empty, the build falls back to the provider URL in `.env.example` |
| `LOG_LEVEL` | Frontend log level (default `debug`) |

Copy `.env.example` to `.env` (not committed) or set the variables in your
shell before `npm run dev` / `npm run build`. The names have no `VITE_`
prefix because the build tool is Rspack. The values are inlined into the
bundle at build time by Rspack's `DefinePlugin`
([`rspack.config.js`](rspack.config.js)), so changing them requires a
rebuild. Defaults and per-environment values are in
[`ENVIRONMENT_MANAGEMENT.md` section 5](../docs/11_devops/ENVIRONMENT_MANAGEMENT.md#5-variables-that-differ-per-environment).

## Tech Stack

| Area | Technology |
|---|---|
| Framework | React + TypeScript |
| Build tool | Rspack |
| Map | MapLibre GL JS |
| Server state | TanStack Query |
| Client state | React `useState` / `useReducer` only (no Redux, Zustand, or other global state library) |
| Styling | Tailwind CSS v4 via PostCSS; utility classes in JSX, palette in `src/utils/colors.ts` and `tailwind.config.js` |
| Testing | Vitest + React Testing Library |

The reasons for each choice are in
[`TECHNOLOGY_SELECTION.md`](../docs/05_engineering/TECHNOLOGY_SELECTION.md).
The map library was chosen through a performance benchmark against Leaflet
and OpenLayers in [`geo-map-benchmark/`](../geo-map-benchmark).

## Project Structure

```text
src/
├── App.tsx, main.tsx, index.css
├── common/       # Shared presentational primitives (Alert, Button, Card, Modal, Tabs, ...)
├── components/   # Feature components (app shell, resource map, list, detail, forms, role management, audit log, ...)
├── hooks/        # Shared hooks (one per query/mutation, plus utilities)
├── store/        # Reserved; empty
├── api/          # Data-access layer, the only place that talks to the backend
├── types/        # Shared domain types
├── constants/    # Shared application constants
├── utils/        # Shared, framework-agnostic utilities
└── assets/       # Fonts
```

All MapLibre-specific code stays behind the map adapter in
`src/components/resource-map/map-adapter/`; feature components never call
MapLibre APIs directly.

Further reading:

- [`FRONTEND_ARCHITECTURE.md`](../docs/06_frontend/FRONTEND_ARCHITECTURE.md):
  full folder structure, layers, and data flow
- [`FRONTEND_NAMING.md`](../docs/06_frontend/FRONTEND_NAMING.md): file and
  folder naming
- [`FRONTEND_STATE.md`](../docs/06_frontend/FRONTEND_STATE.md): state
  management
- [`FRONTEND_UI_UX.md`](../docs/06_frontend/FRONTEND_UI_UX.md): UI/UX
  conventions

## Docker

Build the frontend image (the API and tile URLs are passed as build
arguments):

```sh
../scripts/docker/build.sh --fe-only
# Windows: ..\scripts\docker\build.ps1 -FeOnly
```

Image design, build arguments, and the nginx runtime are described in
[`CONTAINERIZATION.md`](../docs/11_devops/CONTAINERIZATION.md). To run the
whole stack, see the root [`README.md`](../README.md).
