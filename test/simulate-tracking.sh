#!/usr/bin/env bash
#
# Rýni — tracking simulator.
#
# Fires realistic fake traffic at a running instance's ingest endpoint, so the
# dashboard fills with views, unique visitors, referrers, browser/OS/device/
# screen breakdowns, durations, bounces and live visitors.
#
# Usage:
#   SITE=<tracking_id> ./test/simulate-tracking.sh
#   SITE=<tracking_id> VISITS=200 POOL=40 ./test/simulate-tracking.sh
#
# Env:
#   BASE_URL  Rýni origin (default http://localhost:3000 — the frontend, which
#             proxies /t/ to PocketBase; use http://127.0.0.1:8090 to hit PB
#             directly). Trailing slash is stripped.
#   SITE      The site's tracking_id / endpoint_slug (required).
#   VISITS    Number of simulated sessions (default 50).
#   POOL      Number of distinct visitor ids (default 15) — kept small so
#             "unique visitors" < "views".
#   ORIGIN    If set, sent as the Origin header (Variant A — must be in the
#             site's allowed_origins). Unset → no Origin (Variant B/trusted).
#   DELAY     Seconds between requests (default 0.05). Raise it to watch the
#             live counter tick up in real time.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"
SITE="${SITE:?set SITE (tracking_id/endpoint_slug)}"
VISITS="${VISITS:-50}"
POOL="${POOL:-15}"
DELAY="${DELAY:-0.05}"

PAGES=(/ /about /pricing /docs /docs/install /docs/tracking /blog /blog/announcing-ryni /blog/privacy /contact /signup /login)
REFERRERS=("" "" "" "" "https://www.google.com/" "https://www.google.com/" "https://twitter.com/" "https://news.ycombinator.com/")
BROWSERS=(Chrome Chrome Chrome Firefox Safari Edge "Chrome iOS")
OSES=(Windows Windows macOS macOS Linux Android iOS)
DEVICES=(Desktop Desktop Desktop Mobile Mobile Tablet)
SCREENS=("1920x1080" "1920x1080" "1366x768" "2560x1440" "390x844" "390x844" "768x1024")

# Fixed pool of visitor ids — repeated picks become returning visitors.
VISITOR_POOL=()
for ((i = 1; i <= POOL; i++)); do VISITOR_POOL+=("v$((10000 + RANDOM % 90000))"); done

CURL_ARGS=(-s -o /dev/null -X POST)
[ -n "${ORIGIN:-}" ] && CURL_ARGS+=(-H "Origin: $ORIGIN")
CURL_ARGS+=(-H "Content-Type: application/json")

ingest() {
  curl "${CURL_ARGS[@]}" "$BASE_URL/t/$SITE" -d "$1"
}

VIEWS=0
for ((n = 0; n < VISITS; n++)); do
  visitor="${VISITOR_POOL[$((RANDOM % POOL))]}"
  pages=$((1 + RANDOM % 4))      # 1-4 pages per session
  duration=""                    # no duration on the first page of a session

  for ((p = 0; p < pages; p++)); do
    page="${PAGES[$((RANDOM % ${#PAGES[@]}))]}"
    ref="${REFERRERS[$((RANDOM % ${#REFERRERS[@]}))]}"
    browser="${BROWSERS[$((RANDOM % ${#BROWSERS[@]}))]}"
    os="${OSES[$((RANDOM % ${#OSES[@]}))]}"
    device="${DEVICES[$((RANDOM % ${#DEVICES[@]}))]}"
    screen="${SCREENS[$((RANDOM % ${#SCREENS[@]}))]}"

    body="{\"visitor\":\"$visitor\",\"type\":\"view\",\"page\":\"$page\",\"referrer\":\"$ref\",\"browser\":\"$browser\",\"os\":\"$os\",\"device\":\"$device\",\"screen\":\"$screen\""
    [ -n "$duration" ] && body="$body,\"duration\":$duration"
    body="$body}"

    ingest "$body"
    VIEWS=$((VIEWS + 1))

    duration=$((3 + RANDOM % 120))   # seconds spent on this page
    sleep "$DELAY"
  done

  # Session end — applies the last page's duration.
  ingest "{\"visitor\":\"$visitor\",\"type\":\"end\",\"duration\":$duration}"

  # Occasional heartbeat → populates the live-visitor count.
  if ((RANDOM % 3 == 0)); then
    ingest "{\"visitor\":\"$visitor\",\"type\":\"heartbeat\"}"
  fi
done

echo "sent $VIEWS page views across $VISITS sessions ($POOL distinct visitors) to $BASE_URL/t/$SITE"
