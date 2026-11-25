# Helm values schema — small design

Date: 2026-11-24
Status: draft, awaiting approval

## Intent & why

Artifact Hub renders a chart's "Default values" tab from a
`values.schema.json` inside the chart package: documented keys, types,
defaults and descriptions instead of a raw YAML blob. That is how users
find out which knobs exist without cloning the repo.

Requested by Matthias: "integrate a values schema for the helm chart values
and provide that so that artifact hub also can see that and helps users".

Secondary benefit: Helm validates user values (install/upgrade/template)
against the schema, so a typo'd `--set` path fails early with a clear
message instead of rendering a broken manifest.

## Goals

- `helm/ryni/values.schema.json` (JSON Schema draft-07 — what Helm 3/4
  validate against and what Artifact Hub understands) covering every key in
  `values.yaml`.
- Every property: `type`, `description` (lifted from the existing YAML
  comments), `default` (matching `values.yaml`), and `enum` where the value
  set is genuinely closed (`image.pullPolicy`, service `type`, ingress
  `pathType`, `seccompProfile.type`, PVC `accessModes` items).
- Lenient: no `additionalProperties: false`, no `required` lists. Unknown
  keys keep being ignored exactly as today, so no existing values file or
  umbrella-chart `global:` block breaks.
- Drift guard: a tiny check in `make lint-helm` that every leaf path in
  `values.yaml` exists in the schema, so the two cannot silently diverge.

## Non-goals / anti-goals

- No strict validation (no `additionalProperties: false`, no `required`).
  Can be flipped later; the design leaves the shape ready for it.
- No template changes, no `values.yaml` renames, no behaviour change.
- No new runtime/services. Tooling stays within what CI already has
  (`helm`, `python3`).
- Not modelling free-form Kubernetes passthrough blocks beyond the keys we
  actually use (`resources`, `podSecurityContext`,
  `containerSecurityContext`, `networkPolicy.pocketbase.extraFrom` stay
  `type: object` / `items: {type: object}`).

## Approaches considered

- **A (chosen)** — one hand-written `values.schema.json` + a small drift check
  script wired into `scripts/test-helm.sh --lint-only`. Zero build steps, the
  file ships in the package as-is, Artifact Hub picks it up on the next
  release. Cost: one more file to keep in sync — which the drift check covers.
- **B** — generate the schema from `values.yaml` comments with
  `helm-schema`/`helm-values-schema-json` in a build step. Removes hand-sync
  entirely, but adds a tool (Go/npm binary) to CI and to every contributor's
  machine, and the generator's output is noisier than a curated file.
- **C** — Bitnami-style strict schema with `additionalProperties: false` and
  `required` lists. Best typo protection, but turns previously-ignored keys
  into failed installs on an already-published chart (v0.1.0).

## Decisions (with Matthias)

- Lenient first (option A + lenient properties). Strict stays available later
  as a follow-up change.

## Design detail

- **File**: `helm/ryni/values.schema.json`,
  `"$schema": "http://json-schema.org/draft-07/schema#"`,
  `title`/`description` describing the chart, `type: object`, `properties`
  mirroring `values.yaml` top-level keys:
  `nameOverride`, `fullnameOverride`, `namespace`, `image`,
  `serviceAccount`, `pocketbase`, `frontend`, `networkPolicy`, `ingress`.
- **Enums**:
  - `image.pullPolicy` and the per-image `pullPolicy`s: `""` (inherit),
    `Always`, `IfNotPresent`, `Never`.
  - `pocketbase.service.type` / `frontend.service.type`: `ClusterIP`,
    `NodePort`, `LoadBalancer`, `ExternalName`.
  - `ingress.hosts[].paths[].pathType`: `Prefix`, `Exact`,
    `ImplementationSpecific`.
  - `*.podSecurityContext.seccompProfile.type` /
    `*.containerSecurityContext.seccompProfile.type`: `RuntimeDefault`,
    `Localhost`, `Unconfined`.
  - `pocketbase.persistence.accessModes[]`: `ReadWriteOnce`,
    `ReadOnlyMany`, `ReadWriteMany`, `ReadWriteOncePod`.
- **No constraints that can reject a sane config**: no `minimum` on
  `replicaCount` beyond `0`, no patterns on nginx rate strings
  (`240r/m`), no pattern on storage quantities (`5Gi`) or CPU/memory
  (`50m`, `128Mi`) — plain `type: string` there, matching Helm's own
  lack of validation.
- **Drift check**: `scripts/check-values-schema.py`
  - Reads `values.yaml` by asking Helm for it as JSON: writes a one-template
    throwaway chart to a temp dir (Chart.yaml + `{{ .Values | toJson }}`),
    renders it with `helm template`, parses with `python3`'s stdlib `json` —
    no PyYAML dependency, `python3` is already a required tool in
    `scripts/test-helm.sh`.
  - Walks every leaf path (dict keys and list items) and asserts the schema
    has a matching path, treating `items` of an array and the free-form
    `type: object` blocks correctly.
  - Fails with the missing paths; called from `scripts/test-helm.sh` in
    `--lint-only` mode so `make lint-helm` and CI `lint-helm` both run it.
- **Release path**: `helm package` includes the file automatically; the chart
  package published by `release.yml` carries it, Artifact Hub picks it up on
  its next scan and renders the values table. No `Chart.yaml` change needed.
- **Docs**: one line in `helm/ryni/README.md` (and the mirrored
  `site/` docs page) noting the schema exists and is validated in CI.

## What's left to the builder

- Exact description wording (reuse the YAML comments verbatim where they are
  already good).
- Whether `resources`, `podSecurityContext`, `containerSecurityContext` get
  their known sub-keys spelled out (preferred: yes, they are stable) or stay
  bare `object`.
- Whether the drift check also asserts `default` values match `values.yaml`
  (preferred: yes, cheap once the values JSON is in hand).

## Tests

- `make lint-helm` must pass: `helm lint`, `helm template`, plus the new
  drift check.
- Manual negative check: `helm template ryni helm/ryni --set
  pocketbase.service.type=Bogus` fails with a schema validation error.
- Manual sanity check: `helm template ryni helm/ryni` renders byte-identical
  output before and after the schema is added (schema must not change
  rendering).
- Artifact Hub rendering can only be confirmed after the next release; the
  file's presence in the packaged chart is checked locally with
  `helm package` + `tar tzf`.
