# RÝNI Helm Chart

Privacy-preserving, self-hosted web analytics — PocketBase backend + SolidJS
frontend served by nginx.

- **No cookies**, honors Do Not Track, no raw IP logging.
- Two tracking variants: direct (CORS-gated) and same-origin proxy.

## Install

```bash
# From the Helm repo (index.yaml published to gh-pages on release):
helm repo add ryni https://secanis.github.io/ryni/
helm repo update
helm install ryni ryni/ryni \
  --set ingress.hosts[0].host=analytics.example.com \
  --set pocketbase.persistence.storageClass=longhorn
```

Or from a local checkout:

```bash
helm install ryni ./helm/ryni \
  --set ingress.hosts[0].host=analytics.example.com \
  --set pocketbase.persistence.storageClass=longhorn
```

## First login

On first boot the chart auto-creates a superuser from the generated Secret
(`<release>-pocketbase-superuser`). Fetch the credentials:

```bash
kubectl get secret -n ryni ryni-pocketbase-superuser \
  -o jsonpath='{.data.PB_SUPERUSER_EMAIL}' | base64 -d; echo
kubectl get secret -n ryni ryni-pocketbase-superuser \
  -o jsonpath='{.data.PB_SUPERUSER_PASSWORD}' | base64 -d; echo
```

Then sign in at `https://<host>/login`. The `/setup` page is a fallback for
when `PB_SUPERUSER_*` was not supplied; with the headless upsert it is not
needed.

## Important notes

- **Namespace creation**: pick ONE of `namespace.create: true` (default) or
  `helm install --create-namespace`. Using both can race.
- **Data safety**: the PVC, `PB_SECRET` Secret, superuser Secret and Namespace
  are all annotated `helm.sh/resource-policy: keep` so `helm uninstall` does
  not destroy them. Re-installs re-read the same `PB_SECRET` and decrypt the
  existing `data.db`.
- **StorageClass reclaim policy**: `resource-policy: keep` protects the PVC
  from Helm. Protecting the underlying *PV* (survive PVC deletion) requires
  the StorageClass's `reclaimPolicy: Retain` — set that cluster-side.
- **`PB_SECRET` must never rotate**: it is the AES key for the encrypted
  `data.db`. The chart pins it via `lookup` on upgrade.

## Parameters

See `values.yaml` for the full, commented list. The commonly-overridden ones:

| Key | Default | Description |
| --- | --- | --- |
| `ingress.enabled` | `true` | Create an Ingress |
| `ingress.hosts[0].host` | `ryni.example.com` | Public hostname |
| `pocketbase.persistence.storageClass` | `longhorn` | StorageClass for `pb_data` |
| `pocketbase.persistence.size` | `5Gi` | PVC size |
| `pocketbase.superuser.existingSecret` | `""` | Bring your own superuser Secret |
| `pocketbase.secret.existingSecret` | `""` | Bring your own `PB_SECRET` Secret |
| `frontend.replicaCount` | `2` | Frontend replicas |

## Testing

```bash
make lint-helm    # helm lint + helm template render check
make test-helm    # full kind-based end-to-end test (builds images, installs, smokes)
```
