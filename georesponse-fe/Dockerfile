# georesponse-fe/Dockerfile
#
# Author       : Mahardika Pratama
# Version      : 1.0.0
# Created Date : 2026-09-20
# Description  : Multi-stage image for the React + TypeScript frontend.
#                The build stage runs `npm ci` and the Rspack production
#                build; the runtime stage is nginx serving only the built
#                static assets (no source, no node_modules, no toolchain).
#                The frontend is a static SPA, so the values Rspack's
#                DefinePlugin inlines (API_BASE_URL, MAP_TILE_URL,
#                LOG_LEVEL) are fixed per build and are passed in as build
#                arguments — never read from a .env file inside the image
#                (.env is excluded by .dockerignore).
#
# Changelog:
# - 1.0.0 (2026-09-20): Initial creation.
# - 1.0.1 (2026-09-20): HEALTHCHECK targets 127.0.0.1 instead of localhost:
#                        busybox wget resolves localhost to ::1 first, and
#                        nginx only listens on IPv4, so the check always
#                        failed with "connection refused".

# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time configuration (see rspack.config.js definedEnv). Defaults match
# the local docker-compose topology; override with --build-arg or the
# docker-compose build.args block.
ARG API_BASE_URL=http://localhost:8080/api/v1
ARG MAP_TILE_URL=
ARG LOG_LEVEL=info

RUN NODE_ENV=production \
    API_BASE_URL="${API_BASE_URL}" \
    MAP_TILE_URL="${MAP_TILE_URL}" \
    LOG_LEVEL="${LOG_LEVEL}" \
    npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
