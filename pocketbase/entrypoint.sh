#!/bin/sh
set -e

# RÝNI PocketBase entrypoint for v0.40+
#
# PB v0.40 moved superusers into the _superusers auth collection. With an empty
# pb_data directory PocketBase prints a one-time install URL and waits; this
# script creates the initial superuser automatically so the container can start
# headless.

# PB_SECRET must be exactly 32 characters (AES-256 key).
ENCRYPTION_FLAG=""
if [ -n "$PB_SECRET" ]; then
    if [ "${#PB_SECRET}" -ne 32 ]; then
        echo "FATAL: PB_SECRET must be exactly 32 characters (PocketBase AES-256 key)." >&2
        echo "       got ${#PB_SECRET} characters; refusing to start with encryption disabled." >&2
        echo "       Generate with: openssl rand -hex 16" >&2
        exit 1
    fi
    ENCRYPTION_FLAG="--encryptionEnv PB_SECRET"
fi

# Extra arguments:
#   - none                     -> `pocketbase serve` with the flags below
#   - first arg is a flag (-x) -> appended to `pocketbase serve`
#   - first arg is `serve`     -> dropped, remaining args appended to serve
#   - anything else            -> exec'd as-is (e.g. `sh`)
if [ "$#" -gt 0 ]; then
    case "$1" in
        serve) shift ;;
        -*) ;;
        *) exec "$@" ;;
    esac
fi

PB_HTTP_ADDR="${PB_HTTP_ADDR:-0.0.0.0:8090}"

# A superuser email without a real password is a misconfigured deployment.
if [ -n "$PB_SUPERUSER_EMAIL" ]; then
    case "$PB_SUPERUSER_PASSWORD" in
        ""|changeme|password|admin|admin123|12345678)
            echo "FATAL: PB_SUPERUSER_EMAIL is set but PB_SUPERUSER_PASSWORD is empty or a placeholder." >&2
            echo "       Set a real password (>= 8 characters) in the environment / .env, or unset" >&2
            echo "       PB_SUPERUSER_EMAIL." >&2
            exit 1
            ;;
    esac
    if [ "${#PB_SUPERUSER_PASSWORD}" -lt 8 ]; then
        echo "FATAL: PB_SUPERUSER_PASSWORD must be at least 8 characters (got ${#PB_SUPERUSER_PASSWORD})." >&2
        exit 1
    fi
fi

# Create the first superuser automatically on a fresh data directory.
if [ -n "$PB_SUPERUSER_EMAIL" ] && [ -n "$PB_SUPERUSER_PASSWORD" ] && [ ! -f /app/pb_data/.superuser-bootstrapped ]; then
    if /app/pocketbase superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" \
            --dir /app/pb_data \
            --hooksDir /app/pb_hooks \
            --automigrate="${PB_AUTOMIGRATE:-true}" \
            $ENCRYPTION_FLAG; then
        touch /app/pb_data/.superuser-bootstrapped
    fi
fi

# Apply superuser IP whitelist on every start so the env var stays authoritative.
IPS="${PB_SUPERUSER_IPS:-}"
if [ -n "$IPS" ] && [ "$IPS" != "0.0.0.0/0" ]; then
    /app/pocketbase superuser ips $IPS \
        --dir /app/pb_data \
        --hooksDir /app/pb_hooks \
        --automigrate="${PB_AUTOMIGRATE:-true}" \
        $ENCRYPTION_FLAG || true
fi

# shellcheck disable=SC2086 # ENCRYPTION_FLAG is intentionally word-split
exec /app/pocketbase serve \
    --http "$PB_HTTP_ADDR" \
    --dir /app/pb_data \
    --hooksDir /app/pb_hooks \
    --automigrate="${PB_AUTOMIGRATE:-true}" \
    $ENCRYPTION_FLAG \
    "$@"
