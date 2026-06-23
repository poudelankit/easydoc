# Production Rollback Rehearsal

Rehearse rollback before launch using staging.

## Goals

- Confirm the team can revert API and admin images.
- Confirm database rollback policy is understood.
- Confirm smoke tests detect recovery.
- Confirm incident communication paths work.

## Rehearsal Steps

1. Deploy a known-good staging image tag.
2. Promote and deploy a test release candidate.
3. Simulate a failed readiness condition or select a harmless bad config.
4. Roll back API and admin image tags to the known-good tag.
5. Run smoke tests.
6. Record elapsed time and any manual gaps.

## Kubernetes Rollback Example

```bash
kubectl rollout undo deployment/easydocument-api
kubectl rollout undo deployment/easydocument-admin
kubectl rollout status deployment/easydocument-api
kubectl rollout status deployment/easydocument-admin
```

## Exit Criteria

- API readiness is green.
- Admin portal serves the previous build.
- Smoke tests pass.
- Incident lead confirms customer-impacting workflows are stable.

