# Kubernetes

Sample production-oriented manifests for the EasyDocument API and admin portal.

## Files

- `configmap.yaml`: non-secret runtime configuration.
- `secrets.example.yaml`: example secret keys; replace every value before applying.
- `external-secrets.example.yaml`: placeholder External Secrets Operator mapping for a real secret manager.
- `api-deployment.yaml`: backend API deployment, service, liveness, and readiness probes.
- `admin-deployment.yaml`: React admin deployment and service.
- `ingress.yaml`: host-based ingress for API and admin portal.
- `dependencies.md`: production notes for PostgreSQL/PostGIS, Redis, and MinIO/S3.

## Apply Order

```bash
kubectl apply -f configmap.yaml
kubectl apply -f secrets.example.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f admin-deployment.yaml
kubectl apply -f ingress.yaml
```

`secrets.example.yaml` is not a real secret manifest for production. Create the secret through your cluster secret manager or encrypted manifest flow.

If the External Secrets Operator is installed, adapt `external-secrets.example.yaml` to your provider and apply it instead of storing literal Kubernetes Secret values in Git.
