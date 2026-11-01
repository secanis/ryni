#!/usr/bin/env bash
#
# Rýni — manual API smoke test.
#
# Exercises the HTTP API against a running Rýni PocketBase instance:
#   1. superuser login
#   2. create a site
#   3. ingest a page view / heartbeat / session-end
#   4. fetch aggregated stats
#   5. user search
#   6. backup list
#
# Usage:
#   SUPERUSER_EMAIL=admin@example.com \
#   SUPERUSER_PASSWORD=secret123 \
#   [BASE_URL=http://127.0.0.1:8090] \
#   ./test/api-smoke.sh
#
# Requires: curl, jq

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8090}"
BASE_URL="${BASE_URL%/}"                      # strip trailing slash
EMAIL="${SUPERUSER_EMAIL:?set SUPERUSER_EMAIL}"
PASSWORD="${SUPERUSER_PASSWORD:?set SUPERUSER_PASSWORD}"

for bin in curl jq; do
  command -v "$bin" >/dev/null || { echo "ERROR: $bin is required" >&2; exit 1; }
done

PASS=0
FAIL=0

ok()  { echo "  ✔ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✘ $1"; FAIL=$((FAIL+1)); }

# json <method> <path> [data] — prints the response body, checks 2xx status.
json() {
  local method="$1" path="$2" data="${3:-}"
  local args=(-s -X "$method" "$BASE_URL$path")
  [ -n "$TOKEN" ] && args+=(-H "Authorization: $TOKEN")
  [ -n "$data" ] && args+=(-H "Content-Type: application/json" -d "$data")
  curl "${args[@]}"
}

echo "== Rýni API smoke test — $BASE_URL =="

# 1. Superuser login ------------------------------------------------
echo "[1] superuser login"
LOGIN=$(curl -s -X POST "$BASE_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | jq -r '.token // empty')
SUPERUSER_ID=$(echo "$LOGIN" | jq -r '.record.id // empty')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then ok "logged in as $EMAIL"; else bad "login failed: $(echo "$LOGIN" | jq -c '.')"; exit 1; fi

# 2. Create a site --------------------------------------------------
echo "[2] create site"
SITE_ID="smk$(date +%s)$RANDOM"
RESP=$(json POST /api/collections/sites/records \
  "{\"name\":\"Smoke $(date +%s)\",\"tracking_id\":\"$SITE_ID\",\"endpoint_slug\":\"$SITE_ID\",\"allowed_origins\":[],\"created_by\":\"$SUPERUSER_ID\"}")
SITE_RECORD_ID=$(echo "$RESP" | jq -r '.id // empty')
if [ -n "$SITE_RECORD_ID" ] && [ "$SITE_RECORD_ID" != "null" ]; then ok "site created (record id: $SITE_RECORD_ID, tracking_id: $SITE_ID)"; else bad "site create failed: $(echo "$RESP" | jq -c '.')"; fi

# 3. Ingest (anonymous) ---------------------------------------------
echo "[3] ingest tracking (POST /t/$SITE_ID)"
VIEW=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/t/$SITE_ID" \
  -H "Content-Type: application/json" \
  -d "{\"visitor\":\"smoke-visitor\",\"type\":\"view\",\"page\":\"/\",\"referrer\":\"https://example.com\",\"browser\":\"Chrome\",\"os\":\"Linux\",\"device\":\"Desktop\",\"screen\":\"1920x1080\"}")
[ "$VIEW" = "200" ] && ok "view ingested (200)" || bad "view ingest returned $VIEW"

HB=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/t/$SITE_ID" \
  -H "Content-Type: application/json" \
  -d "{\"visitor\":\"smoke-visitor\",\"type\":\"heartbeat\"}")
[ "$HB" = "200" ] && ok "heartbeat ingested (200)" || bad "heartbeat ingest returned $HB"

END=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/t/$SITE_ID" \
  -H "Content-Type: application/json" \
  -d "{\"visitor\":\"smoke-visitor\",\"type\":\"end\",\"duration\":12}")
[ "$END" = "200" ] && ok "session end ingested (200)" || bad "end ingest returned $END"

UNKNOWN=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/t/does-not-exist" \
  -H "Content-Type: application/json" -d "{\"visitor\":\"x\"}")
[ "$UNKNOWN" = "404" ] && ok "unknown slug → 404" || bad "unknown slug returned $UNKNOWN"

# 4. Stats ----------------------------------------------------------
echo "[4] stats"
FROM="$(date -u +%Y-%m-%d)T00:00:00.000Z"
# Far-future upper bound so the record we just ingested is always in range.
# A "now" timestamp truncated to the second can sit *before* a record created
# later in that same second (19:18:51.121 vs 19:18:51.000) and exclude it.
TO="2099-01-01T00:00:00.000Z"
STATS=$(json GET "/api/ryni/sites/$SITE_RECORD_ID/stats?from=$FROM&to=$TO")
VIEWS=$(echo "$STATS" | jq -r '.views // empty')
if [ -n "$VIEWS" ] && [ "$VIEWS" != "null" ]; then ok "stats: views=$VIEWS uniqueVisitors=$(echo "$STATS" | jq -r '.uniqueVisitors') current=$(echo "$STATS" | jq -r '.currentVisitors')"; else bad "stats failed: $(echo "$STATS" | jq -c '.')"; fi

# 5. User search ----------------------------------------------------
echo "[5] user search"
USERS=$(json GET "/api/ryni/users/search?q=$EMAIL")
if echo "$USERS" | jq -e '.users' >/dev/null 2>&1; then ok "user search returned $(echo "$USERS" | jq '.users | length') result(s)"; else bad "user search failed: $(echo "$USERS" | jq -c '.')"; fi

# 6. Backup list ----------------------------------------------------
echo "[6] backups"
BACKUPS=$(json GET /api/backups)
if echo "$BACKUPS" | jq -e 'type == "array"' >/dev/null 2>&1; then ok "backups listed ($(echo "$BACKUPS" | jq 'length') existing)"; else bad "backup list failed: $(echo "$BACKUPS" | jq -c '.')"; fi

echo ""
echo "== result: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ] || exit 1
