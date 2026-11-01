# ryni-pocketbase

RÝNI backend — [PocketBase](https://pocketbase.io/) v0.40 with the RÝNI
hooks and migrations baked in.

- Anonymous tracking ingest (`POST /t/{slug}`)
- Stats aggregation (`GET /api/ryni/sites/{siteId}/stats`)
- User search, OIDC registration, backups
- All RÝNI collections and API rules via migrations

## Run

```bash
docker run -p 8090:8090 \
  -e PB_SUPERUSER_EMAIL=admin@example.com \
  -e PB_SUPERUSER_PASSWORD=change-me-please \
  -v ryni-data:/app/pb_data \
  docker.io/secanis/ryni-pocketbase:v0.1.0
```

- `PB_SECRET` must be exactly 32 characters if set (AES-256 key).
- `PB_AUTOMIGRATE` defaults to `true`.
- `PB_SUPERUSER_IPS` is a space-separated IP/CIDR allowlist for the
  superuser UI; `0.0.0.0/0` disables it.

This image is normally deployed together with `secanis/ryni-frontend`
(see the `ryni` Helm chart).
