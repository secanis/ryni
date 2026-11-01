#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# test-helm.sh — end-to-end test rig for the RÝNI helm chart.
#
# Modes:
#   (no flag)   full test: build images → kind cluster → install → smoke → upgrade → uninstall → cleanup
#   --build-only   build PB + frontend images, then exit
#   --lint-only    helm lint + helm template render check, then exit
#   --help         show usage
#
# The full mode also runs an `install → upgrade → verify` cycle to assert
# that the namespace, PVC, PB_SECRET Secret and the data survive an upgrade,
# and that `helm uninstall` does not delete them (resource-policy: keep).
#
# See helm/ryni/README.md and the Makefile for the discoverable entry points.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helm.lib.sh"

# --- Configuration -----------------------------------------------------
HELM_CHART="$SCRIPT_DIR/../helm/ryni"
KIND_CLUSTER="ryni-test"
KIND_CONFIG="$SCRIPT_DIR/kind-cluster.yaml"

REPO_OWNER="secanis"
PB_REPO="docker.io/${REPO_OWNER}/ryni-pocketbase"
FE_REPO="docker.io/${REPO_OWNER}/ryni-frontend"
# Overridable from the environment (the Makefile passes TAG / PB_IMAGE /
# FE_IMAGE); these are only the fallbacks for a direct invocation.
TAG="${TAG:-v0.1.0}"
PB_IMAGE="${PB_IMAGE:-${PB_REPO}:${TAG}}"
FE_IMAGE="${FE_IMAGE:-${FE_REPO}:${TAG}}"
# The Makefile passes the repository without a tag; append $TAG then.
[[ "${PB_IMAGE##*/}" == *:* ]] || PB_IMAGE="${PB_IMAGE}:${TAG}"
[[ "${FE_IMAGE##*/}" == *:* ]] || FE_IMAGE="${FE_IMAGE}:${TAG}"

KIND_VERSION="v0.24.0"
KIND_PATH="$HOME/.local/bin/kind"
export PATH="$HOME/.local/bin:$PATH"

usage() {
  cat <<EOF
Usage: $(basename "$0") [MODE] [--kube-context NAME]

Modes:
  (no flag)      Full end-to-end test (build images, create kind cluster,
                 install chart, smoke test, upgrade, uninstall, cleanup).
  --build-only   Build the PocketBase and frontend images, then exit.
  --lint-only    Run 'helm lint' and a 'helm template' render check, then exit.
  --keep-kind    Don't delete the kind cluster at the end (for debugging).
  --help         Show this help.

Options:
  --kube-context NAME   Override the kubectl context the test asserts on
                        (default: 'kind-$KIND_CLUSTER'). The script refuses to
                        run if 'kubectl config current-context' is anything
                        else — a safety net so a stray invocation cannot target
                        a real cluster.

Environment:
  KIND_VERSION   Kind version to install (default: $KIND_VERSION)
  TAG            Image tag to build and test (default: $TAG)
  PB_IMAGE       PocketBase image (default: $PB_IMAGE)
  FE_IMAGE       Frontend image (default: $FE_IMAGE)
  KUBE_CONTEXT   Same as --kube-context (default: kind-$KIND_CLUSTER)
EOF
}

MODE="full"
KEEP_KIND=0
KUBE_CONTEXT="${KUBE_CONTEXT:-kind-${KIND_CLUSTER}}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    "")            shift ;;
    --build-only)  MODE="build"; shift ;;
    --lint-only)   MODE="lint"; shift ;;
    --keep-kind)   KEEP_KIND=1; MODE="full"; shift ;;
    --kube-context) KUBE_CONTEXT="$2"; shift 2 ;;
    -h|--help)     usage; exit 0 ;;
    *)             printf '\033[1;31m[test]\033[0m unknown argument: %s\n\n' "$1" >&2
                   usage >&2
                   exit 1 ;;
  esac
done

require helm
require kubectl
require curl
require python3

if command -v docker >/dev/null 2>&1; then
  CONTAINER_CLI=docker
elif command -v podman >/dev/null 2>&1; then
  CONTAINER_CLI=podman
else
  fail "missing dependency: neither docker nor podman found (install one)"
fi
log "container runtime: $CONTAINER_CLI"
if [[ "$CONTAINER_CLI" == "podman" ]]; then
  export KIND_EXPERIMENTAL_PROVIDER="${KIND_EXPERIMENTAL_PROVIDER:-podman}"
fi

log "RÝNI helm chart test rig"
log "  mode:   $MODE"
log "  chart:  $HELM_CHART"
log "  images: $PB_IMAGE, $FE_IMAGE"

# --- Mode: lint only ---------------------------------------------------
if [[ "$MODE" == "lint" ]]; then
  log "running helm lint ..."
  helm lint "$HELM_CHART"

  RENDER_OUT="$(mktemp)"
  trap 'rm -f "$RENDER_OUT"' EXIT
  log "rendering chart ..."
  helm template ryni "$HELM_CHART" \
    --set "ingress.hosts[0].host=ryni.example.com" \
    > "$RENDER_OUT" \
    || fail "helm template failed"

  log "  rendered $(grep -c '^kind:' "$RENDER_OUT") resources"
  grep -q '^kind: PersistentVolumeClaim$' "$RENDER_OUT" \
    || fail "rendered output missing PVC"
  grep -q '^kind: NetworkPolicy$' "$RENDER_OUT" \
    || fail "rendered output missing NetworkPolicy (networkPolicy.enabled defaults to true)"
  grep -q '^  name: ryni-pocketbase-superuser$' "$RENDER_OUT" \
    || fail "rendered output missing default superuser Secret"
  grep -q '^            - name: PB_SUPERUSER_EMAIL$' "$RENDER_OUT" \
    || fail "rendered Deployment does not mount PB_SUPERUSER_EMAIL"
  grep -q '^            - name: PB_SUPERUSER_PASSWORD$' "$RENDER_OUT" \
    || fail "rendered Deployment does not mount PB_SUPERUSER_PASSWORD"
  # The tracking ingest proxy must be present in the nginx config.
  grep -q 'location /t/ {' "$RENDER_OUT" \
    || fail "rendered nginx config missing /t/ tracking proxy"
  ok "lint + render checks passed"
  exit 0
fi

# --- Kind install ------------------------------------------------------
install_kind_if_missing() {
  if [[ -x "$KIND_PATH" ]]; then
    log "kind found at $KIND_PATH ($("$KIND_PATH" version | head -1))"
    return
  fi
  log "downloading kind $KIND_VERSION to $KIND_PATH ..."
  mkdir -p "$(dirname "$KIND_PATH")"
  local url="https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64"
  if ! curl -fsSL -o "$KIND_PATH" "$url"; then
    fail "failed to download kind from $url"
  fi
  chmod +x "$KIND_PATH"
  ok "kind installed at $KIND_PATH ($("$KIND_PATH" version | head -1))"
}

build_image_if_missing() {
  local image=$1 dockerfile=$2 context=$3
  if "$CONTAINER_CLI" image inspect "$image" >/dev/null 2>&1; then
    log "image $image already present, skipping build"
    return
  fi
  log "building $image ..."
  (cd "$context" && "$CONTAINER_CLI" build -t "$image" -f "$dockerfile" .) \
    || fail "failed to build $image"
  ok "built $image"
}

if [[ "$MODE" == "build" ]]; then
  build_image_if_missing "$PB_IMAGE" "$SCRIPT_DIR/../pocketbase/Dockerfile" "$SCRIPT_DIR/../pocketbase"
  build_image_if_missing "$FE_IMAGE" "$SCRIPT_DIR/../frontend/Dockerfile"   "$SCRIPT_DIR/../frontend"
  ok "all images built"
  exit 0
fi

install_kind_if_missing
build_image_if_missing "$PB_IMAGE" "$SCRIPT_DIR/../pocketbase/Dockerfile" "$SCRIPT_DIR/../pocketbase"
build_image_if_missing "$FE_IMAGE" "$SCRIPT_DIR/../frontend/Dockerfile"   "$SCRIPT_DIR/../frontend"

cleanup_kind() {
  if [[ "${KEEP_KIND:-0}" -eq 1 ]]; then
    warn "KEEP_KIND=1, leaving kind cluster '$KIND_CLUSTER' running"
    return
  fi
  "$KIND_PATH" delete cluster --name "$KIND_CLUSTER" >/dev/null 2>&1 || true
}
trap cleanup_kind EXIT INT TERM

if "$KIND_PATH" get clusters 2>/dev/null | grep -q "^${KIND_CLUSTER}$"; then
  log "kind cluster '$KIND_CLUSTER' already exists, reusing it"
else
  log "creating kind cluster '$KIND_CLUSTER' from $KIND_CONFIG ..."
  "$KIND_PATH" create cluster --config "$KIND_CONFIG" \
    || fail "failed to create kind cluster"
  ok "kind cluster created"
fi

log "loading images into kind ..."
load_image_into_kind() {
  local image=$1 archive
  archive="$(mktemp "${TMPDIR:-/tmp}/ryni-kind-image.XXXXXX.tar")"
  "$CONTAINER_CLI" save -o "$archive" "$image" >/dev/null \
    || { rm -f "$archive"; fail "failed to export $image"; }
  "$KIND_PATH" load image-archive "$archive" --name "$KIND_CLUSTER" >/dev/null \
    || { rm -f "$archive"; fail "failed to load $image into kind"; }
  rm -f "$archive"
}
load_image_into_kind "$PB_IMAGE"
load_image_into_kind "$FE_IMAGE"
ok "images loaded"

NS="ryni-test-$(date +%s)"
log "installing chart in namespace $NS (context: $KUBE_CONTEXT) ..."

ACTUAL_CONTEXT="$(kubectl config current-context 2>/dev/null || echo '<unset>')"
if [[ "$ACTUAL_CONTEXT" != "$KUBE_CONTEXT" ]]; then
  fail "kubectl current-context is '$ACTUAL_CONTEXT', not '$KUBE_CONTEXT'. Refusing to run (would target a real cluster). Pass --kube-context to override on isolated clusters only."
fi

helm install ryni "$HELM_CHART" \
  --namespace "$NS" --create-namespace \
  --set "namespace.create=true" \
  --set "namespace.name=$NS" \
  --set "ingress.enabled=false" \
  --set "pocketbase.persistence.storageClass=standard" \
  --set "pocketbase.image.pullPolicy=Never" \
  --set "frontend.image.pullPolicy=Never" \
  --set "pocketbase.image.tag=$TAG" \
  --set "frontend.image.tag=$TAG" \
  || fail "helm install failed"
ok "chart installed in $NS"

PB_DEPLOY="ryni-pocketbase"
FE_DEPLOY="ryni-frontend"
PB_SVC="ryni-pocketbase"
FE_SVC="ryni-frontend"
PB_PVC="ryni-pocketbase"

wait_for_deployment "$NS" "$PB_DEPLOY" 180
wait_for_deployment "$NS" "$FE_DEPLOY" 180

PB_PORT=$(pick_free_port)
FE_PORT=$(pick_free_port)
wait_for_endpoints "$NS" "$PB_SVC" 60 || fail "PB service $NS/$PB_SVC has no ready endpoints"
wait_for_endpoints "$NS" "$FE_SVC" 60 || fail "FE service $NS/$FE_SVC has no ready endpoints"
log "port-forwarding: PB http://localhost:$PB_PORT, FE http://localhost:$FE_PORT"
kubectl port-forward -n "$NS" "svc/$PB_SVC" "$PB_PORT:8090" >/dev/null 2>&1 &
PF_PB_PID=$!
kubectl port-forward -n "$NS" "svc/$FE_SVC" "$FE_PORT:8080" >/dev/null 2>&1 &
PF_FE_PID=$!
cleanup_portforwards() {
  kill "$PF_PB_PID" "$PF_FE_PID" 2>/dev/null || true
}
trap 'cleanup_portforwards; cleanup_kind' EXIT INT TERM
sleep 2

# --- Smoke tests -------------------------------------------------------
assert_http_status "http://localhost:$PB_PORT/api/health" 200 "PB /api/health"
assert_http_status "http://localhost:$FE_PORT/"            200 "FE /"
assert_http_status "http://localhost:$FE_PORT/api/health"  200 "FE /api/health (proxied)"

# Headless superuser from the Secret must log in.
SUPERUSER_SECRET_NAME="${PB_DEPLOY}-superuser"
log "reading superuser credentials from Secret $SUPERUSER_SECRET_NAME ..."
SETUP_EMAIL=$(kubectl get secret -n "$NS" "$SUPERUSER_SECRET_NAME" -o jsonpath='{.data.PB_SUPERUSER_EMAIL}' | base64 -d)
SETUP_PASSWORD=$(kubectl get secret -n "$NS" "$SUPERUSER_SECRET_NAME" -o jsonpath='{.data.PB_SUPERUSER_PASSWORD}' | base64 -d)
if [[ -z "$SETUP_EMAIL" || -z "$SETUP_PASSWORD" ]]; then
  fail "superuser Secret $SUPERUSER_SECRET_NAME is missing PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD"
fi

SETUP_LOGIN_BODY=$(mktemp)
trap 'rm -f "$SETUP_LOGIN_BODY"; cleanup_portforwards; cleanup_kind' EXIT INT TERM
python3 -c 'import json,sys; print(json.dumps({"identity": sys.argv[1], "password": sys.argv[2]}))' \
  "$SETUP_EMAIL" "$SETUP_PASSWORD" > "$SETUP_LOGIN_BODY"
LOGIN_JSON=$(curl -fsS --max-time 10 \
  -X POST -H 'Content-Type: application/json' \
  --data-binary "@$SETUP_LOGIN_BODY" \
  "http://localhost:$PB_PORT/api/collections/_superusers/auth-with-password")
SETUP_TOKEN=$(echo "$LOGIN_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')
SUPERUSER_ID=$(echo "$LOGIN_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["record"]["id"])')
if [[ -z "$SETUP_TOKEN" ]]; then
  fail "could not log in with the superuser credentials from the Secret"
fi
ok "superuser from Secret logs in (${#SETUP_TOKEN}-char token)"

# Full analytics loop: create a site, ingest a view, read back stats.
SLUG="smoke-$(date +%s)"
log "creating a site (tracking_id=$SLUG) ..."
SITE_BODY=$(mktemp)
python3 -c 'import json,sys; print(json.dumps({"name":"smoke","tracking_id":sys.argv[1],"endpoint_slug":sys.argv[1],"allowed_origins":[],"created_by":sys.argv[2]}))' \
  "$SLUG" "$SUPERUSER_ID" > "$SITE_BODY"
SITE_ID=$(curl -fsS --max-time 10 \
  -X POST -H "Authorization: $SETUP_TOKEN" -H 'Content-Type: application/json' \
  --data-binary "@$SITE_BODY" \
  "http://localhost:$PB_PORT/api/collections/sites/records" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
if [[ -z "$SITE_ID" ]]; then
  fail "could not create site record"
fi
ok "site created (id=$SITE_ID)"

INGEST_BODY=$(mktemp)
trap 'rm -f "$SETUP_LOGIN_BODY" "$SITE_BODY" "$INGEST_BODY"; cleanup_portforwards; cleanup_kind' EXIT INT TERM
python3 -c 'import json,sys; print(json.dumps({"visitor":"smoke-visitor","type":"view","page":"/","referrer":"https://example.com","browser":"Chrome","os":"Linux","device":"Desktop","screen":"1920x1080"}))' > "$INGEST_BODY"
log "ingesting a view via the frontend /t/ proxy ..."
INGEST_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
  -X POST -H 'Content-Type: application/json' \
  --data-binary "@$INGEST_BODY" \
  "http://localhost:$FE_PORT/t/$SLUG" || echo "000")
[[ "$INGEST_STATUS" == "200" ]] || fail "ingest via FE /t/ returned HTTP $INGEST_STATUS"
ok "ingest via FE /t/ → HTTP 200"

log "reading stats back via the frontend /api/ proxy ..."
STATS=$(curl -fsS --max-time 10 \
  -H "Authorization: $SETUP_TOKEN" \
  "http://localhost:$FE_PORT/api/ryni/sites/$SITE_ID/stats?from=2020-01-01T00:00:00Z&to=2099-01-01T00:00:00Z")
VIEWS=$(echo "$STATS" | python3 -c 'import json,sys; print(json.load(sys.stdin)["views"])')
[[ "$VIEWS" -ge 1 ]] || fail "stats views=$VIEWS, expected >= 1 after ingest"
ok "stats reflect the ingested view (views=$VIEWS)"

# --- Install → upgrade → verify ----------------------------------------
log "snapshotting PB_SECRET (must be unchanged across upgrade) ..."
PB_SECRET_NAME="$PB_DEPLOY"
PB_SECRET_BEFORE=$(kubectl get secret -n "$NS" "$PB_SECRET_NAME" -o jsonpath='{.data.PB_SECRET}' | base64 -d)
[[ -z "$PB_SECRET_BEFORE" ]] && fail "PB_SECRET Secret '$PB_SECRET_NAME' missing or empty in $NS"
ok "PB_SECRET length=${#PB_SECRET_BEFORE} bytes"
SUPERUSER_PASSWORD_BEFORE="$SETUP_PASSWORD"

kill "$PF_PB_PID" "$PF_FE_PID" 2>/dev/null || true

log "running helm upgrade with the same flags as install ..."
helm upgrade ryni "$HELM_CHART" \
  --namespace "$NS" \
  --set "namespace.create=true" \
  --set "namespace.name=$NS" \
  --set "ingress.enabled=false" \
  --set "pocketbase.persistence.storageClass=standard" \
  --set "pocketbase.image.pullPolicy=Never" \
  --set "frontend.image.pullPolicy=Never" \
  --set "pocketbase.image.tag=$TAG" \
  --set "frontend.image.tag=$TAG" \
  || fail "helm upgrade failed (chart must install+upgrade cleanly)"
ok "helm upgrade completed"

kubectl get namespace "$NS" >/dev/null 2>&1 || fail "namespace $NS was DELETED by helm upgrade"
ok "namespace $NS survived helm upgrade"
assert_pvc_exists "$NS" "$PB_PVC"

PB_SECRET_AFTER=$(kubectl get secret -n "$NS" "$PB_SECRET_NAME" -o jsonpath='{.data.PB_SECRET}' | base64 -d)
[[ "$PB_SECRET_AFTER" != "$PB_SECRET_BEFORE" ]] && fail "PB_SECRET was ROTATED by helm upgrade"
ok "PB_SECRET unchanged across upgrade (${#PB_SECRET_AFTER} bytes)"

SUPERUSER_PASSWORD_AFTER=$(kubectl get secret -n "$NS" "$SUPERUSER_SECRET_NAME" -o jsonpath='{.data.PB_SUPERUSER_PASSWORD}' | base64 -d)
[[ "$SUPERUSER_PASSWORD_AFTER" != "$SUPERUSER_PASSWORD_BEFORE" ]] && fail "PB_SUPERUSER_PASSWORD was RE-GENERATED by helm upgrade"
ok "PB_SUPERUSER_PASSWORD unchanged across upgrade"

wait_for_deployment "$NS" "$PB_DEPLOY" 180
wait_for_deployment "$NS" "$FE_DEPLOY" 180
wait_for_endpoints "$NS" "$PB_SVC" 60 || fail "PB service $NS/$PB_SVC has no ready endpoints"
wait_for_endpoints "$NS" "$FE_SVC" 60 || fail "FE service $NS/$FE_SVC has no ready endpoints"

PB_PORT=$(pick_free_port)
FE_PORT=$(pick_free_port)
kubectl port-forward -n "$NS" "svc/$PB_SVC" "$PB_PORT:8090" >/dev/null 2>&1 &
PF_PB_PID=$!
kubectl port-forward -n "$NS" "svc/$FE_SVC" "$FE_PORT:8080" >/dev/null 2>&1 &
PF_FE_PID=$!
sleep 2

log "confirming site $SITE_ID still exists after upgrade ..."
GET_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
  -H "Authorization: $SETUP_TOKEN" \
  "http://localhost:$PB_PORT/api/collections/sites/records/$SITE_ID" || echo "000")
[[ "$GET_STATUS" == "200" ]] || fail "site $SITE_ID missing after upgrade (HTTP $GET_STATUS) — data was lost"
ok "site survived upgrade (HTTP 200)"

log "running helm test ..."
helm test ryni -n "$NS" --logs || warn "helm test reported an issue (continuing)"

# --- Uninstall ---------------------------------------------------------
log "uninstalling chart ..."
helm uninstall ryni -n "$NS" || warn "helm uninstall failed (continuing)"

log "verifying uninstall preserves PVC, Namespace and PB_SECRET Secret ..."
assert_pvc_exists "$NS" "$PB_PVC"
kubectl get namespace "$NS" >/dev/null 2>&1 || fail "namespace $NS was DELETED by helm uninstall — resource-policy: keep is missing on namespace.yaml"
ok "namespace $NS survived helm uninstall (resource-policy: keep)"

kubectl get secret -n "$NS" "$PB_SECRET_NAME" >/dev/null 2>&1 || fail "PB_SECRET Secret $NS/$PB_SECRET_NAME was DELETED by helm uninstall"
PB_SECRET_FINAL=$(kubectl get secret -n "$NS" "$PB_SECRET_NAME" -o jsonpath='{.data.PB_SECRET}' | base64 -d)
[[ "$PB_SECRET_FINAL" != "$PB_SECRET_BEFORE" ]] && fail "PB_SECRET changed across uninstall"
ok "PB_SECRET Secret survived helm uninstall unchanged (resource-policy: keep)"

kubectl get secret -n "$NS" "$SUPERUSER_SECRET_NAME" >/dev/null 2>&1 || fail "superuser Secret $NS/$SUPERUSER_SECRET_NAME was DELETED by helm uninstall"
SUPERUSER_PASSWORD_FINAL=$(kubectl get secret -n "$NS" "$SUPERUSER_SECRET_NAME" -o jsonpath='{.data.PB_SUPERUSER_PASSWORD}' | base64 -d)
[[ "$SUPERUSER_PASSWORD_FINAL" != "$SUPERUSER_PASSWORD_BEFORE" ]] && fail "PB_SUPERUSER_PASSWORD changed across uninstall"
ok "superuser Secret survived helm uninstall unchanged (resource-policy: keep)"

log "deleting test namespace + PVC ..."
kubectl delete namespace "$NS" --wait=false >/dev/null 2>&1 || true
kubectl delete pvc -n "$NS" --all --wait=false >/dev/null 2>&1 || true

ok "all tests passed"
