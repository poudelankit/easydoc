# Documentation

Engineering documentation for EasyDocument.

## Phase 10-12 Runbooks

- `deployment.md`: production deployment flow, Docker images, Kubernetes, and health probes.
- `backup-restore.md`: PostgreSQL and MinIO/S3 backup and restore notes.
- `monitoring.md`: structured logging, metrics, and alerting guidance.
- `security-checklist.md`: deployment security checklist.
- `production-readiness-checklist.md`: final readiness checklist.
- `ci-cd.md`: GitHub Actions validation and manual deployment gate.
- `secrets-management.md`: required secrets, secret-manager placeholders, and rotation notes.
- `observability.md`: metrics endpoint, Prometheus scrape config, Grafana expectations, and Loki guidance.
- `deployment-smoke-tests.md`: smoke test script usage and expected checks.
- `rollback-procedure.md`: release rollback and restore decision flow.
- `release-checklist.md`: release validation, rollout, and post-release checklist.
- `migration-deployment-checklist.md`: migration preflight, deploy, and rollback checklist.
- `incident-response.md`: production incident response runbook.
- `staging-deployment.md`: staging deployment process.
- `environment-promotion.md`: local to staging to production promotion flow.
- `registry-promotion.md`: container image tag and promotion strategy.
- `launch-credentials.md`: exact credentials and secret-manager entries required before launch.
- `release-drill.md`: staging deployment, migration, smoke validation, production promotion, and rollback drill.
- `production-rollback-rehearsal.md`: rollback rehearsal steps and success criteria.
- `database-migration-rollback-policy.md`: migration rollback decision policy.
- `production-launch-checklist.md`: final production launch checklist.
- `post-launch-monitoring-checklist.md`: first-hour monitoring checklist.
- `incident-escalation-matrix.md`: launch incident roles and escalation guide.
- `production-cutover-runbook.md`: staging-to-production cutover runbook.
