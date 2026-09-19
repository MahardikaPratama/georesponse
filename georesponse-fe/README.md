# GeoResponse — Frontend

GeoResponse is a geospatial resource management application for disaster response. This package is the React + TypeScript frontend: it displays resources on a map, and lets users search, filter, view, create, update, and relocate them through the GeoResponse API.

For the product and architecture background, see `../docs`. This README covers only how to run and work on the frontend.

---

## Implementation Status

This package has a working `package.json`, Rspack/TypeScript/ESLint/
Prettier/Tailwind CSS v4/Vitest configuration, and a runnable application
under `src/` — resource list/map/detail, create/update/delete/relocate,
status and location/change history, role management, an audit trail view,
and the BMKG GeoHotspot situational-awareness overlay are all implemented.
The commands below work as documented. See the root
[`README.md`](../README.md#implementation-status) for the overall project
status across all packages.

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
| `MAP_TILE_URL` | Raster tile URL template for the map, e.g. `https://tile.example.org/{z}/{x}/{y}.png`. Left empty, the map renders with no base tiles, only resource markers. |
| `LOG_LEVEL` | Frontend log level (default `debug`) |

Copy `.env.example` to `.env` (not committed) and adjust, or set these through your shell before running `npm run dev` / `npm run build`. No `VITE_` prefix — the build tool is Rspack, not Vite. See `../docs/11_devops/ENVIRONMENT_MANAGEMENT.md` section 5.1/6.

---

## Tech Stack

| Area | Technology |
|---|---|
| Framework | React + TypeScript |
| Build tool | Rspack |
| Map | MapLibre GL JS |
| Server state | TanStack Query |
| Client state | React `useState` / `useReducer` only — no Redux/Zustand or other global state library |
| Styling | CSS (Tailwind CSS v4 via PostCSS; utility classes in JSX, palette in `src/utils/colors.ts` + `tailwind.config.js`) |
| Testing | Vitest + React Testing Library |

Each decision, and why it was made, is documented in `../docs/05_engineering/TECHNOLOGY_SELECTION.md`. The map library specifically was chosen through a dedicated performance benchmark against Leaflet and OpenLayers — see `../geo-map-benchmark`.

---

## Project Structure

```text
src/
├── App.tsx, main.tsx, index.css
├── common/       # Shared presentational primitives (Card, StatusIndicator, Tabs, ...)
├── components/   # Feature components (resource map, list, detail/CRUD forms, role management, audit log, ...)
├── hooks/        # Shared, reusable hooks
├── store/        # Reserved, currently empty — no cross-cutting store exists yet
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

The `Dockerfile` in this directory is a two-stage build: `node:20-alpine`
runs `npm ci` and the Rspack production build, then `nginx:1.27-alpine`
serves only the built static assets using `nginx.conf` (SPA fallback to
`index.html`, long-lived caching for content-hashed bundles). Because the
frontend is a static SPA, `API_BASE_URL`, `MAP_TILE_URL`, and `LOG_LEVEL`
are inlined at build time and are passed as build arguments — the root
`docker-compose.yml` feeds them from the root `.env`, and
`scripts/docker/build.sh`/`.ps1` pass them as `--build-arg`. `.env` itself
never enters the image (`.dockerignore`).

```sh
../scripts/docker/build.sh --fe-only
# Windows: ..\scripts\docker\build.ps1 -FeOnly
```

Or run the whole stack from the repository root with `./run.sh` /
`.\run.ps1`; the frontend is then served at `http://localhost:5173`. See
`../docs/11_devops/CONTAINERIZATION.md` and `../docs/11_devops/DOCKER_COMPOSE.md`.
