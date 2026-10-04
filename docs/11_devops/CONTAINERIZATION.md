# Containerization

## 1. Purpose

This document describes how the GeoResponse frontend and backend are
packaged as container images: one image per application, each built from a
Dockerfile in the application's own directory. It covers the build stages,
image tagging, and what must stay out of an image. It does not cover a
registry or publishing pipeline (images are built locally or in CI for
verification only, see `CI_CD.md`), orchestrators beyond Docker Compose
(see `docs/05_engineering/TECHNOLOGY_SELECTION.md` section 17), or image
scanning beyond using official upstream base images.

---

## 2. Files

These files are what `docker-compose.yml`, `scripts/docker/build.sh` /
`.ps1`, and the CI `docker-build` job build:

- `georesponse-fe/Dockerfile`, with `georesponse-fe/nginx.conf` as the
  runtime server block and `georesponse-fe/.dockerignore`.
- `georesponse-be/Dockerfile`, with `georesponse-be/.dockerignore`.

The Dockerfiles and their header comments are the source of truth; the
sections below summarize them.

---

## 3. Multi-Stage Build Strategy

Both images use a two-stage build. The build stage holds the full
toolchain and produces the output; the runtime stage copies only that
output forward. Source code, dev dependencies, build caches, and test files
never reach the runtime image.

---

## 4. Frontend Image

### 4.1 Stages

| Stage | Base image | What it does |
| --- | --- | --- |
| `build` | `node:20-alpine` | `npm ci`, then `npm run build` with `NODE_ENV=production` (Rspack) |
| `runtime` | `nginx:1.27-alpine` | Serves `/app/dist` from `/usr/share/nginx/html` with `nginx.conf`; exposes port 80 |

`nginx.conf` serves the app as a single-page application (unknown paths
fall back to `index.html`), caches content-hashed assets for a year, keeps
`index.html` uncached, and enables gzip. It does not proxy the API: the
browser calls the backend directly at `API_BASE_URL`.

The image defines a `HEALTHCHECK` that runs `wget` against
`http://127.0.0.1:80/`. It uses `127.0.0.1` rather than `localhost`
because busybox `wget` resolves `localhost` to `::1` first and nginx only
listens on IPv4.

### 4.2 Build-Time Configuration

The frontend is a static SPA. Rspack's `DefinePlugin` inlines
`API_BASE_URL`, `MAP_TILE_URL`, and `LOG_LEVEL` into the bundle at build
time, so the Dockerfile takes them as build-stage `ARG`s:

```dockerfile
ARG API_BASE_URL=http://localhost:8080/api/v1
ARG MAP_TILE_URL=
ARG LOG_LEVEL=info
```

`docker-compose.yml` passes them from the root `.env` through `build.args`,
and `scripts/docker/build.sh` / `.ps1` pass them as `--build-arg`. A
frontend image is therefore tied to the backend address it was built for.
Reusing one frontend image across backend addresses would need a config
file injected at runtime next to the assets, which the current scope does
not need. Variable details are in `ENVIRONMENT_MANAGEMENT.md` section 5.1.

---

## 5. Backend Image

### 5.1 Stages

| Stage | Base image | What it does |
| --- | --- | --- |
| `build` | `golang:1.26-alpine` | `go mod download` (cached layer), then `CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w"` of `./cmd/api` |
| `runtime` | `alpine:3.21` | Installs `ca-certificates`, adds a non-root `georesponse` user, copies the binary to `/usr/local/bin/georesponse-be`; exposes port 8080 |

All configuration is read from environment variables at start-up; nothing
environment-specific is baked into the image.

### 5.2 Runtime Base Image

The runtime stage uses Alpine rather than distroless because the compose
healthcheck runs `wget` inside the container against `/health`, and
distroless has no shell or `wget`. Alpine's busybox provides `wget`, and
`ca-certificates` allows outbound HTTPS to BMKG.

Migration files are not bundled into the image. The compose file
bind-mounts `database/migrations` read-only at `/migrations` and sets
`MIGRATIONS_DIR` (see `DATABASE_MIGRATIONS.md` section 4.2).

---

## 6. Image Naming and Tagging

| Image | Tags |
| --- | --- |
| `georesponse-fe` | `latest` for local dev (`docker compose up --build`); git short SHA from `scripts/docker/build.sh` / `deploy.sh`; `ci` in the CI `docker-build` job |
| `georesponse-be` | Same as above |

Images are not pushed to a registry, so no registry prefix is defined.

Tags other than `latest` should be immutable per build (a commit SHA or a
version), so that `DEPLOYMENT.md`'s rollback by redeploying a previous tag
works.

---

## 7. What Must Not Be Baked Into Images

Per NFR-SEC-004 (credential protection) and NFR-DEP-003 (configuration
separation):

- **Secrets** such as the database password and `TOKEN_SECRET` (the HMAC
  key for authentication tokens). These are supplied as environment
  variables at container start, never copied into the image or hardcoded in
  a Dockerfile.
- **Backend environment-specific configuration** such as the database
  host, CORS origins, and log level. The backend reads these at runtime.
  The frontend's three values are the exception: they are public, non-secret
  build arguments (section 4.2).
- **`.env` files.** Both `.dockerignore` files exclude `.env` and
  `.env.*`, so they never end up in an image layer.
- **Development-only files.** Between them, the `.dockerignore` files also
  exclude `node_modules`, `dist`/`build`, `coverage`, `*.log`, `.git`,
  local binaries, and test output (`*.test`, `*.out`), and the multi-stage
  build only copies compiled output forward.

How secrets and `.env` files are handled overall is in
`ENVIRONMENT_MANAGEMENT.md` section 6.

---

## 8. Build Scripts

- `scripts/docker/build.sh` / `build.ps1`: build both images, or one with
  `--fe-only` / `--be-only` (`-FeOnly` / `-BeOnly`). Each image is tagged
  `<name>:<tag>` and `<name>:latest`, where `<tag>` defaults to the git
  short SHA and can be overridden with `--tag` / `-Tag` or `IMAGE_TAG`.
  Frontend build arguments come from the environment or the root `.env`.
- `scripts/docker/clean.sh` / `clean.ps1`: stop the compose stack's
  containers, remove every `georesponse-fe:*` and `georesponse-be:*` image,
  and prune dangling build layers. The database volume is kept unless
  `--volumes` / `-Volumes` is passed.

`docker compose up --build` (and `./run.sh`) build the same Dockerfiles
directly. The scripts are for building and tagging outside compose, for
example before `scripts/deployment/deploy.sh`.
