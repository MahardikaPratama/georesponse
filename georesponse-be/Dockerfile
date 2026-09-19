# georesponse-be/Dockerfile
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : Multi-stage image for the Go backend. The build stage
#                compiles a static binary; the runtime stage is a minimal
#                Alpine image holding only that binary, CA certificates
#                (outbound HTTPS to BMKG) and busybox wget (used by the
#                docker-compose healthcheck). No secret or environment-
#                specific value is baked in: everything is read from
#                environment variables at start-up. Migration files are
#                not bundled; docker-compose bind-mounts database/migrations
#                read-only at /migrations and sets MIGRATIONS_DIR.
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.

# ---- Build stage ----
FROM golang:1.26-alpine AS build

WORKDIR /app

# Dependencies first so the module download layer is cached across source
# changes.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/georesponse-be ./cmd/api

# ---- Runtime stage ----
FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates \
    && addgroup -S georesponse \
    && adduser -S -G georesponse georesponse

COPY --from=build /out/georesponse-be /usr/local/bin/georesponse-be

USER georesponse:georesponse

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/georesponse-be"]
