# Buildkit auto-injects these from the `platforms:` list in release.yml.
# BUILDPLATFORM is the runner's native arch (always linux/amd64); TARGETPLATFORM
# is the arch of the image leg being produced (amd64 or arm64).
ARG BUILDPLATFORM
ARG TARGETPLATFORM

# Stage 1: Build.
#
# Pinned to BUILDPLATFORM (amd64) so the node toolchain — `npm ci`, tsc,
# esbuild and `vite build` — always runs NATIVELY and exactly once. The JS
# bundle in dist/ is arch-independent, so there is nothing to gain from
# running it per-target; before this pin the arm64 leg ran the whole build
# under QEMU user-mode emulation, which stretched this single step to ~15
# minutes (the release that shipped v0.0.2 hit 25+ and counting).
FROM --platform=$BUILDPLATFORM docker.io/node:24-alpine AS builder

# Build metadata stamped into the bundle (see vite.config.ts). The Docker
# context is frontend/, so there is no .git for the git-describe fallback;
# release.yml always passes RYNI_VERSION and RYNI_COMMIT.
ARG RYNI_VERSION=dev
ARG RYNI_COMMIT=local

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with nginx-unprivileged (non-root, port 8080). Built for the
# target platform so amd64 and arm64 users each get a native base image; the
# arch-independent dist/ is copied straight in from the builder.
FROM --platform=$TARGETPLATFORM docker.io/nginxinc/nginx-unprivileged:1.31-alpine

# The base image lags behind Alpine's security point releases, and Artifact
# Hub/Trivy scans the published image (critical + high CVEs in brotli, curl,
# libexpat, libxslt, musl and zlib). Upgrade the OS packages at build time so
# the image always ships the patched versions. The base image runs as uid 101,
# so switch to root for apk and back afterwards.
USER root
RUN apk upgrade --no-cache
USER 101

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Writes /tmp/ryni/config.js (served as /config.js) from PB_URL at start.
COPY --chmod=755 docker/40-ryni-config.sh /docker-entrypoint.d/40-ryni-config.sh

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
