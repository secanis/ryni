# Helm values schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `helm/ryni/values.schema.json` so Artifact Hub renders a documented values table, and guard it against drifting from `values.yaml`.

**Architecture:** A hand-written draft-07 schema describes every key in `values.yaml` (types, descriptions, defaults, closed enums) without `additionalProperties: false` or `required`. Helm validates user values against it on lint/template. A small Python script renders the chart's values to JSON via a throwaway chart and asserts every leaf path exists in the schema with a matching `default`; it runs from `scripts/test-helm.sh --lint-only`.

**Tech Stack:** Helm 4 (chart + schema validation), Python 3 stdlib (`json`, `subprocess`, `tempfile`), bash (`scripts/test-helm.sh`), Markdown docs (Starlight site).

**Spec:** `docs/superpowers/specs/2026-11-24-helm-values-schema-design.md`

## Global Constraints

- JSON Schema **draft-07** only: `"$schema": "http://json-schema.org/draft-07/schema#"`, no comments, no trailing commas. Helm 4 rejects anything it cannot parse, which breaks `make lint-helm`.
- **Lenient**: never `additionalProperties: false`, never `required`. A values file carrying unknown keys (umbrella-chart `global:`, operator extras) must still install exactly as today.
- Schema `default`s are documentation for Artifact Hub. They must equal `values.yaml`; they must never introduce a value the templates would otherwise not see.
- No template and no `values.yaml` changes. Rendered output of `helm template ryni helm/ryni` must be byte-identical before and after.
- No new tooling: `helm` and `python3` are already required by `scripts/test-helm.sh`.

## Review Focus

- **Empty-string enums**: `image.pullPolicy`, `pocketbase.image.pullPolicy`, `frontend.image.pullPolicy` default to `""` (inherit). A schema enum without `""` makes `helm lint` fail on the chart's own defaults.
- **Free-form blocks**: `networkPolicy.pocketbase.extraFrom` and any `type: object` passthrough must not be walked as if their sub-keys were part of the chart's contract — extra keys there stay legal.
- **Array paths**: `ingress.hosts[].paths[].pathType` and `persistence.accessModes[]` are list items; a schema that only nests under `properties` will mis-validate and mis-describe them.
- **Defaults validation**: Helm validates the merged values (chart defaults included), so any schema `default` that disagrees with `values.yaml` is invisible at lint time but misleads Artifact Hub users — the drift check catches it instead.
- **Packaging**: the file must land inside the `.tgz` (`helm package`), otherwise Artifact Hub never sees it even though CI is green.

---

### Task 1: Write `values.schema.json`

**Files:**
- Create: `helm/ryni/values.schema.json`
- Test: none new (Helm is the test runner)

**Interfaces:**
- Consumes: nothing.
- Produces: a draft-07 schema at the chart root; Task 2 reads it from `<chart>/values.schema.json`.

- [ ] **Step 1: Capture the current render as a baseline**

```bash
helm template ryni helm/ryni --set ingress.hosts[0].host=ryni.example.com > /tmp/render-before.yaml
```

- [ ] **Step 2: Write `helm/ryni/values.schema.json`**

Top-level `properties` must mirror `values.yaml` exactly, in this shape:

- `nameOverride`, `fullnameOverride`: `{"type": "string"}`, defaults `""`.
- `namespace`: object with `create` (boolean, default `true`) and `name` (string, default `"ryni"`).
- `image`: `pullSecrets` (`type: array`, `items: {"type": "string"}`, default `[]`), `pullPolicy` (string, enum `["", "Always", "IfNotPresent", "Never"]`, default `"IfNotPresent"`).
- `serviceAccount`: `create` (boolean), `name` (string).
- `pocketbase`: `replicaCount` (integer, default `1`), `image` (`repository`, `tag`, `pullPolicy` string enum as above with `""` default), `service` (`type` enum `["ClusterIP", "NodePort", "LoadBalancer", "ExternalName"]`, `port` integer), `persistence` (`enabled` boolean, `size` string `"5Gi"`, `storageClass` string `"longhorn"`, `accessModes` array of string enum `["ReadWriteOnce", "ReadOnlyMany", "ReadWriteMany", "ReadWriteOncePod"]`), `resources` (object with `requests`/`limits` objects holding `cpu`/`memory` as `type: string`), `healthcheck` (`path` string), `startupProbe` (`periodSeconds`, `failureThreshold` integers), `superuserIps` (string), `automigrate` (boolean), `secret` (`existingSecret`, `existingSecretKey` strings), `superuser` (`existingSecret`, `existingSecretEmailKey`, `existingSecretPasswordKey` strings), `podSecurityContext` and `containerSecurityContext` (objects; spell out the keys actually used: `runAsUser`, `runAsGroup`, `fsGroup` integer, `runAsNonRoot` boolean, `seccompProfile` object `{type: enum ["RuntimeDefault","Localhost","Unconfined"]}`, `allowPrivilegeEscalation` boolean, `readOnlyRootFilesystem` boolean, `capabilities` object `{drop: array of string}`).
- `frontend`: same pattern — `replicaCount`, `image`, `service`, `resources`, `podSecurityContext` (`runAsNonRoot`, `runAsUser`, `runAsGroup`, `seccompProfile`), `containerSecurityContext`, `rateLimit` (`enabled` boolean, `realIpFrom` array of string, `realIpHeader` string, `ingestRate` string, `ingestBurst` integer).
- `networkPolicy`: `enabled` boolean, `pocketbase` object with `extraFrom`: `{"type": "array", "items": {"type": "object"}}`.
- `ingress`: `enabled` boolean, `className` string, `annotations` `{"type": "object", "additionalProperties": {"type": "string"}}` (this `additionalProperties` map is a value schema, not a strictness toggle — keep it), `hosts` array of objects `{host: string, paths: array of {path: string, pathType: string enum ["Prefix","Exact","ImplementationSpecific"]}}`, `tls` array of objects `{hosts: array of string, secretName: string}`.

Every property gets a `description` lifted from the matching comment in `values.yaml` (shorten long ones; keep warnings about StorageClass reclaim policy, `PB_SECRET` rotation, and the fixed container port 8090). Also set `"title"` and `"description"` at the root; mention RÝNI and the Artifact Hub purpose.

- [ ] **Step 3: Verify the schema parses and the chart still lints**

```bash
helm lint helm/ryni
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 4: Verify rendering is unchanged**

```bash
helm template ryni helm/ryni --set ingress.hosts[0].host=ryni.example.com > /tmp/render-after.yaml
diff /tmp/render-before.yaml /tmp/render-after.yaml && echo IDENTICAL
```

Expected: `IDENTICAL`.

- [ ] **Step 5: Verify the schema rejects a bad value on a known key**

```bash
helm template ryni helm/ryni --set pocketbase.service.type=Bogus 2>&1 | tail -3
```

Expected: `Error: values don't meet the specifications of the schema(s)` and `at '/pocketbase/service/type': value must be one of 'ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'`.

- [ ] **Step 6: Verify unknown keys are still ignored (leniency)**

```bash
helm template ryni helm/ryni --set global.foo=bar --set someUnknownKey=1 >/dev/null && echo LENIENT_OK
```

Expected: `LENIENT_OK`.

- [ ] **Step 7: Verify the file lands in the package**

```bash
helm package helm/ryni -d /tmp && tar tzf /tmp/ryni-0.1.0.tgz | grep values.schema.json
```

Expected: `ryni/values.schema.json`.

- [ ] **Step 8: Commit**

```bash
git add helm/ryni/values.schema.json docs/superpowers/specs/2026-11-24-helm-values-schema-design.md docs/superpowers/plans/2026-11-24-helm-values-schema.md
git commit -m "feat(helm): add a values schema for Artifact Hub"
```

---

### Task 2: Drift check wired into `make lint-helm`

**Files:**
- Create: `scripts/check-values-schema.py`
- Modify: `scripts/test-helm.sh` (the `MODE == "lint"` block, after `helm lint`)
- Test: the script itself, exercised against the real chart plus one mutated copy

**Interfaces:**
- Consumes: `helm/ryni/values.schema.json` from Task 1.
- Produces: `python3 scripts/check-values-schema.py <chart-dir>` — exit `0` when every leaf in `values.yaml` has a schema path and every schema `default` matches; exit `1` printing `missing schema path: a.b.c` / `default mismatch at a.b: values.yaml=<x> schema=<y>` lines.

- [ ] **Step 1: Write the script**

`scripts/check-values-schema.py`, stdlib only:

1. `chart_dir = sys.argv[1]` (default `helm/ryni`).
2. `with tempfile.TemporaryDirectory() as tmp:` write `Chart.yaml` (`apiVersion: v2`, `name: values-dump`, `version: 0.0.0`), copy `<chart>/values.yaml` to `<tmp>/values.yaml`, write `<tmp>/templates/dump.yaml` containing exactly `{{ .Values | toJson }}`.
3. `out = subprocess.run(["helm", "template", "values-dump", tmp], capture_output=True, text=True, check=True).stdout`; pick the line that starts with `{`; `values = json.loads(...)`.
4. `schema = json.load(open(<chart>/values.schema.json))`.
5. `walk(values, schema, path)`: for a dict, for each key assert `key in schema.get("properties", {})` else record `missing schema path`; recurse into `schema["properties"][key]`. For a list, recurse each element into `schema.get("items", {})`. For a scalar, if `"default" in schema` and `values_node != schema["default"]`, record `default mismatch`.
6. Print the collected problems, one per line; `sys.exit(1)` if any, else print `values schema is in sync with values.yaml` and exit `0`.

- [ ] **Step 2: Run it against the real chart**

```bash
python3 scripts/check-values-schema.py helm/ryni
```

Expected: `values schema is in sync with values.yaml`, exit 0. Any `missing schema path` line is a schema gap from Task 1 — fix the schema, not the check.

- [ ] **Step 3: Prove it fails when the schema drifts**

```bash
cp -r helm/ryni /tmp/ryni-drift
python3 - <<'PY'
import json, pathlib
p = pathlib.Path("/tmp/ryni-drift/values.schema.json")
s = json.loads(p.read_text())
s["properties"]["ingress"]["properties"]["hosts"]["items"]["properties"].pop("paths")
p.write_text(json.dumps(s, indent=2))
PY
python3 scripts/check-values-schema.py /tmp/ryni-drift; echo "exit=$?"
```

Expected: a `missing schema path: ingress.hosts[0].paths` line and `exit=1`.

- [ ] **Step 4: Prove it fails on a default mismatch**

```bash
python3 - <<'PY'
import json, pathlib
p = pathlib.Path("/tmp/ryni-drift/values.schema.json")
s = json.loads(p.read_text())
s["properties"]["frontend"]["properties"]["replicaCount"]["default"] = 9
p.write_text(json.dumps(s, indent=2))
PY
python3 scripts/check-values-schema.py /tmp/ryni-drift; echo "exit=$?"; rm -rf /tmp/ryni-drift
```

Expected: `default mismatch at frontend.replicaCount: values.yaml=2 schema=9` and `exit=1`.

- [ ] **Step 5: Wire it into the lint mode**

In `scripts/test-helm.sh`, inside the `if [[ "$MODE" == "lint" ]]` block, right after `helm lint "$HELM_CHART"`:

```bash
  log "checking values schema is in sync ..."
  python3 "$SCRIPT_DIR/check-values-schema.py" "$HELM_CHART" || fail "values.schema.json is out of sync with values.yaml"
  ok "values schema in sync"
```

- [ ] **Step 6: Run the whole lint target**

```bash
make lint-helm
```

Expected: ends with `lint + render checks passed` (and the existing resource greps still pass).

- [ ] **Step 7: Commit**

```bash
git add scripts/check-values-schema.py scripts/test-helm.sh
git commit -m "test(helm): fail lint when values.schema.json drifts from values.yaml"
```

---

### Task 3: Document the schema

**Files:**
- Modify: `helm/ryni/README.md` (under "Important notes" or a new "Values schema" section)
- Modify: the mirrored docs page in `site/` that mirrors `helm/ryni/README.md` (find it: `grep -rl "First login" site/src`)

**Interfaces:**
- Consumes: Task 1's file, Task 2's `make lint-helm` target.
- Produces: nothing code-facing.

- [ ] **Step 1: Add the README section**

Two or three sentences: `helm/ryni/values.schema.json` describes every value (types, defaults, enums), Artifact Hub renders it as the chart's value table, Helm rejects out-of-enum values on install/upgrade, and `make lint-helm` fails if the schema drifts from `values.yaml`. Keep it factual — no promises about Artifact Hub uptime or scan timing.

- [ ] **Step 2: Mirror it in the site docs page**

Same wording, adjusted for the page's headings; the repo README explicitly says the two must stay in sync.

- [ ] **Step 3: Verify the site still builds**

```bash
cd site && npm run build
```

Expected: build succeeds, no broken-link warnings introduced.

- [ ] **Step 4: Commit**

```bash
git add helm/ryni/README.md site/src
git commit -m "docs(helm): mention the values schema"
```
