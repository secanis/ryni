# Stage 1: Build
FROM docker.io/node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with nginx-unprivileged (non-root, port 8080)
FROM docker.io/nginxinc/nginx-unprivileged:1.31-alpine

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
