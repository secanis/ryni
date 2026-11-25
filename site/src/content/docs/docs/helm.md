---
title: Helm
description: Install Rýni on Kubernetes with the Helm chart.
---

A Helm chart lives in [`helm/ryni`](https://github.com/secanis/ryni/tree/main/helm/ryni):
single-replica PocketBase + nginx-served frontend, Traefik/cert-manager
Ingress, NetworkPolicies, and data-safe Secrets/PVC with
`resource-policy: keep`.

> This page mirrors the chart's own README
> ([`helm/ryni/README.md`](https://github.com/secanis/ryni/blob/main/helm/ryni/README.md)).
> The two are kept in sync by hand — update both when the chart changes.

## Install

From the Helm repo (published to `https://ryni.secanis.ch/` on release):

```bash
helm repo add ryni https://ryni.secanis.ch/
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

Then sign in at `https://<host>/login`.

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

## Values schema

[`helm/ryni/values.schema.json`](https://github.com/secanis/ryni/blob/main/helm/ryni/values.schema.json)
describes every value in `values.yaml` — type, default, description, and the
allowed values for closed sets such as `pocketbase.service.type` and
`ingress.hosts[].paths[].pathType`. Artifact Hub renders it as the chart's value
table, so the parameters are documented on the package page instead of only in
the repo.

Helm validates values against the schema on install and upgrade, which means a
typo'd enum fails immediately with a clear message. The schema is intentionally
permissive: unknown keys are still ignored and no value is required, so
existing values files keep working.

`make lint-helm` fails when a key in `values.yaml` has no matching schema path,
or when a schema `default` disagrees with `values.yaml`.

## Testing

```bash
make lint-helm    # helm lint + values-schema sync + helm template render check
make test-helm    # full kind-based end-to-end test (builds images, installs, smokes)
```
