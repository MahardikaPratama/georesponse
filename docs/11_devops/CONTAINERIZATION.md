# Containerization

## 1. Purpose

This document defines how GeoResponse's frontend and backend applications are packaged into container images.

The application is a modular monolith with exactly two runnable applications (frontend, backend) plus a database. Containerization strategy follows that shape directly: one image per application, built from a dedicated Dockerfile in each application's own directory.

---

## 2. Scope Boundary

In scope:

- One Dockerfile for `georesponse-fe` and one for `georesponse-be`.
- Multi-stage builds that separate build-time tooling from the runtime image.
- Image naming and tagging convention.
- What must NOT be baked into an image (secrets, environment-specific config).

Out of scope:

- A container registry / image publishing pipeline (not required for a take-home submission; images are built locally or in CI for verification only, per `CI_CD.md`).
- Kubernetes manifests, Helm charts, or any orchestrator beyond docker-compose (excluded explicitly in `docs/05_engineering/TECHNOLOGY_SELECTION.md` section 17).
- Base-image hardening/scanning processes beyond using official, minimal upstream images.

---

## 3. Current State

Both Dockerfiles exist in the repository as empty scaffolding, to be filled in as implementation artifacts:

- `georesponse-fe/Dockerfile` — empty, intended to build the React + TypeScript frontend.
- `georesponse-be/Dockerfile` — empty, intended to build the Go backend.

This document describes the intended content and structure of those files. Nothing below should be read as "already implemented" — it is the target design these Dockerfiles should be written to.

---

## 4. Frontend Containerization

### 4.1 Strategy

The frontend is a static site once built (Rspack output is a set of HTML/CSS/JS assets with no server-side runtime requirement). The image therefore uses a two-stage build:

1. **Build stage** — a Node image with the full `georesponse-fe` toolchain, running `npm ci` and `npm run build` to produce static assets.
2. **Runtime stage** — a minimal static file server (for example `nginx:alpine` or a lightweight Node static server) that only contains the built assets, not the source code, `node_modules` dev dependencies, or the build toolchain.

```text
┌─────────────────────────┐      ┌─────────────────────────┐
│  Stage 1: build          │      │  Stage 2: runtime        │
│  node:20-alpine           │      │  nginx:alpine (or similar)│
│                           │      │                           │
│  COPY package*.json       │      │  COPY --from=build         │
│  RUN npm ci                │ ──▶ │    /app/dist → /usr/share/ │
│  COPY . .                  │      │    nginx/html              │
│  RUN npm run build          │      │  EXPOSE 80                 │
└─────────────────────────┘      └─────────────────────────┘
```

### 4.2 Illustrative Dockerfile

```dockerfile
# georesponse-fe/Dockerfile (illustrative target design)

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

The `API base URL` the frontend calls is injected at runtime (see `ENVIRONMENT_MANAGEMENT.md`), not baked into the built JS bundle, so the same image can be reused across environments where the backend address differs.

---

## 5. Backend Containerization

### 5.1 Strategy

Go compiles to a single static binary, which makes a minimal runtime image straightforward:

1. **Build stage** — a Go image with the full toolchain, running `go build` to produce a statically linked binary.
2. **Runtime stage** — a minimal base image (`gcr.io/distroless/static` or `alpine`) containing only the compiled binary and any required runtime files (e.g. CA certificates for outbound HTTPS, migration files if bundled).

```text
┌─────────────────────────┐      ┌─────────────────────────┐
│  Stage 1: build          │      │  Stage 2: runtime        │
│  golang:1.22-alpine       │      │  gcr.io/distroless/static │
│                           │      │  (or alpine)               │
│  COPY go.mod go.sum        │      │                           │
│  RUN go mod download        │ ──▶ │  COPY --from=build         │
│  COPY . .                  │      │    /app/georesponse-be     │
│  RUN CGO_ENABLED=0 go build │      │  EXPOSE 8080                │
└─────────────────────────┘      └─────────────────────────┘
```

### 5.2 Illustrative Dockerfile

```dockerfile
# georesponse-be/Dockerfile (illustrative target design)

# ---- Build stage ----
FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/georesponse-be ./cmd/api

# ---- Runtime stage ----
FROM gcr.io/distroless/static-debian12 AS runtime
COPY --from=build /out/georesponse-be /georesponse-be
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/georesponse-be"]
```

A `HEALTHCHECK` instruction is omitted from the distroless runtime stage because distroless images have no shell/`wget`/`curl` to run it with; instead, container orchestration (docker-compose) performs the health check externally against the backend's HTTP `/health` endpoint (see `DEPLOYMENT.md`).

---

## 6. Image Naming and Tagging Convention

| Component | Image Name (illustrative) | Tag Convention |
|---|---|---|
| Frontend | `georesponse-fe` | `latest` for local dev; `<git-short-sha>` for CI-built verification images |
| Backend | `georesponse-be` | `latest` for local dev; `<git-short-sha>` for CI-built verification images |

Since this take-home does not push images to a registry, no registry namespace prefix (e.g. `ghcr.io/<org>/`) is defined yet. If a registry were introduced, images would be namespaced as `ghcr.io/<org>/georesponse-fe:<tag>` and `ghcr.io/<org>/georesponse-be:<tag>` following standard convention, but this is not implemented.

Tags should be immutable per build (prefer a commit SHA or semantic version over reusing `latest` for anything beyond local development), so that `DEPLOYMENT.md`'s rollback-by-redeploying-a-previous-tag approach is possible.

---

## 7. What Must NOT Be Baked Into Images

Per NFR-SEC-004 (credential protection) and NFR-DEP-003 (configuration separation):

- **Secrets** — database passwords, API keys, JWT signing secrets. These are supplied at container start via environment variables, never `COPY`'d into the image or hardcoded in the Dockerfile.
- **Environment-specific configuration** — API base URLs, database hostnames, log levels. These differ between local dev and any future environment and must be read from environment variables at runtime, not compiled or copied into the image at build time.
- **`.env` files** — local `.env` files are excluded from the build context via `.dockerignore` so they can never accidentally end up inside an image layer.
- **Development-only files** — test files, `node_modules` dev dependencies, Go build cache, and local tooling configuration are left out of the final runtime stage by virtue of the multi-stage build only copying the compiled output forward.

A `.dockerignore` file in each application directory (frontend and backend) is part of the intended implementation, excluding at minimum: `node_modules`, `.env*`, `dist`, `*.log`, `.git`, and test artifacts.

---

## 8. Local Build Entry Points

Two placeholder script pairs exist to standardize image builds without requiring each developer to remember raw `docker build` invocations:

- `scripts/docker/build.sh` / `scripts/docker/build.ps1` — intended to build both the frontend and backend images with the naming convention above.
- `scripts/docker/clean.sh` / `scripts/docker/clean.ps1` — intended to remove locally built GeoResponse images and dangling build cache.

These scripts are currently empty placeholders and are implementation artifacts still to be written; this document defines the contract they are expected to fulfill (build both images consistently; clean them up without touching unrelated Docker resources on the developer's machine).

---

## 9. Principle

> An image should be able to run identically in any environment; only the environment variables around it should change.

Keeping build-time artifacts and runtime configuration strictly separated is what allows a single built image to be promoted or redeployed without being rebuilt — the basis for the rollback strategy described in `DEPLOYMENT.md`.
