# Manual / API tests

Scripts for exercising a running Rýni instance by hand — separate from the
automated suites in `frontend/` (Vitest unit) and `pocketbase/tests/`
(Vitest integration against a throwaway container).

## simulate-tracking.sh

Fires fake tracking traffic at the ingest endpoint so the dashboard fills
with realistic data (views, unique visitors, referrers, browser/OS/device/
screen breakdowns, durations, bounces, live visitors).

```bash
SITE=<tracking_id> ./test/simulate-tracking.sh
SITE=<tracking_id> VISITS=200 POOL=40 ./test/simulate-tracking.sh
```

- `SITE` — the site's tracking id (required).
- `BASE_URL` — Rýni origin, default `http://localhost:3000` (frontend proxy).
  Use `http://127.0.0.1:8090` to hit PocketBase directly.
- `VISITS` — sessions to simulate (default 50).
- `POOL` — distinct visitor ids (default 15); keep it below `VISITS` so
  unique visitors < views.
- `ORIGIN` — set to an origin to exercise Variant A (must be in the site's
  allowed_origins); leave unset for Variant B.
- `DELAY` — seconds between requests (default 0.05); raise it to watch the
  live counter tick up in real time.

Requires `curl` and `bash`.

## Adding more

Drop more scripts here for manual checks that aren't part of the CI suite —
load tests, ad-hoc curl recipes, import/export drills, etc. Keep them
self-contained and documented at the top.
