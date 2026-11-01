#!/bin/sh
# Generate the runtime config (/config.js) from the environment at container
# start, so one image can point at a different PocketBase without a rebuild.
#
#   PB_URL  PocketBase origin, e.g. https://pb.example.com. Leave empty (the
#           default) when nginx proxies /api on the same origin.
set -eu

OUT_DIR="${RYNI_CONFIG_DIR:-/tmp/ryni}"
PB_URL="${PB_URL:-}"

esc=$(printf '%s' "$PB_URL" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g')

if mkdir -p "$OUT_DIR" 2>/dev/null &&
  printf 'window.__RYNI_CONFIG__ = { pbUrl: "%s" };\n' "$esc" > "$OUT_DIR/config.js.tmp" 2>/dev/null &&
  mv "$OUT_DIR/config.js.tmp" "$OUT_DIR/config.js"; then
  echo "40-ryni-config.sh: wrote $OUT_DIR/config.js (pbUrl=${PB_URL:-<same origin>})"
else
  echo "40-ryni-config.sh: WARNING: cannot write $OUT_DIR/config.js; using built-in defaults" >&2
fi
