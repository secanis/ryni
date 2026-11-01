# ryni-frontend

RÝNI frontend — a SolidJS single-page app served by
`nginx-unprivileged`, which proxies `/api/`, `/t/`, `/api/realtime` and
`/_` to the PocketBase backend.

- Dashboard with time series and breakdown charts
- Site management with two tracking snippet variants (direct + same-origin proxy)
- OIDC SSO login, admin (users / settings / backups)

## Run

```bash
docker run -p 8080:8080 \
  -e PB_URL= \
  docker.io/secanis/ryni-frontend:v0.1.0
```

`PB_URL` (optional) points at an external PocketBase origin. Leave empty
(the default) to use the same-origin `/api` proxy.

This image is normally deployed together with `secanis/ryni-pocketbase`
(see the `ryni` Helm chart).
