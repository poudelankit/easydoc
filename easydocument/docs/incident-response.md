# Production Incident Response

## Severity Guide

- `SEV1`: production unavailable, data loss risk, or widespread security issue.
- `SEV2`: major workflow broken for many users.
- `SEV3`: degraded workflow with workaround.
- `SEV4`: minor issue or documentation gap.

## First 15 Minutes

- Assign incident lead.
- Record start time, impact, and suspected release tag.
- Check health endpoints, readiness, logs, and dashboards.
- Decide whether to roll back.
- Open a communication channel for updates.

## Investigation Checklist

- API readiness and liveness.
- PostgreSQL, Redis, and MinIO health.
- Recent deployments and migrations.
- Error logs by `event` and `requestId`.
- Audit logs for sensitive workflow changes.
- Rate-limit spikes.

## Resolution

- Roll back, forward-fix, or disable the broken operational path.
- Run deployment smoke tests.
- Confirm key workflows manually in staging or production as appropriate.
- Keep communication open until metrics stabilize.

## Post-Incident

- Write a brief timeline.
- Document root cause and contributing factors.
- Add tests, alerts, or runbook updates for the missing guardrail.
- Track action items separately from the incident record.

