# Manual / API tests

Scripts for exercising the running Rýni HTTP API by hand — separate from the
automated suites in `frontend/` (Vitest unit) and `pocketbase/tests/`
(Vitest integration against a throwaway container).

## api-smoke.sh

Hits the API end-to-end: superuser login, site create, tracking ingest
(view / heartbeat / session-end), stats aggregation, user search, backups.

```bash
SUPERUSER_EMAIL=admin@example.com \
SUPERUSER_PASSWORD=secret123 \
BASE_URL=http://127.0.0.1:8090 \
./test/api-smoke.sh
```

- `BASE_URL` defaults to `http://127.0.0.1:8090` (PocketBase directly).
  Point it at the frontend (`http://localhost:3000`) to exercise the nginx
  proxy instead.
- Requires `curl` and `jq`.

## Adding more

Drop more `*.sh` (or other) scripts here for manual checks that aren't part
of the CI suite — load tests, ad-hoc curl recipes, import/export drills, etc.
Keep them self-contained and documented at the top.
