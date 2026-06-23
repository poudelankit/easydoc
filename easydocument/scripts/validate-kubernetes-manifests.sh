#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFESTS=(
  "$ROOT_DIR/infra/kubernetes/configmap.yaml"
  "$ROOT_DIR/infra/kubernetes/secrets.example.yaml"
  "$ROOT_DIR/infra/kubernetes/external-secrets.example.yaml"
  "$ROOT_DIR/infra/kubernetes/api-deployment.yaml"
  "$ROOT_DIR/infra/kubernetes/admin-deployment.yaml"
  "$ROOT_DIR/infra/kubernetes/ingress.yaml"
)

if command -v kubectl >/dev/null 2>&1; then
  for manifest in "${MANIFESTS[@]}"; do
    echo "Validating $(basename "$manifest") with kubectl client dry-run"
    kubectl apply --dry-run=client --validate=false -f "$manifest" >/dev/null
  done
else
  echo "kubectl not found; falling back to YAML syntax validation."
  python3 - "$ROOT_DIR" <<'PY'
import pathlib
import sys
import yaml

root = pathlib.Path(sys.argv[1])
manifests = [
    root / "infra/kubernetes/configmap.yaml",
    root / "infra/kubernetes/secrets.example.yaml",
    root / "infra/kubernetes/external-secrets.example.yaml",
    root / "infra/kubernetes/api-deployment.yaml",
    root / "infra/kubernetes/admin-deployment.yaml",
    root / "infra/kubernetes/ingress.yaml",
]

for manifest in manifests:
    list(yaml.safe_load_all(manifest.read_text()))
    print(f"YAML ok {manifest.name}")
PY
fi

echo "Kubernetes manifest validation completed."
