# Release Checklist

Use this checklist for staging and production releases.

## Pre-Release

- Phase scope approved.
- Branch/PR validation workflow passed.
- Backend build and tests passed.
- Admin build and tests passed.
- Shared types build passed.
- Flutter analyze and tests passed.
- Docker image build validation passed.
- Kubernetes manifest validation passed.
- Migration deployment checklist completed if migrations changed.
- Required secrets exist in the target environment.
- Rollback owner identified.

## Release

- Build immutable API and admin image tags.
- Promote the same image tags from staging to production.
- Apply configuration and secret changes before application rollout.
- Roll out API first, then admin.
- Watch readiness checks during rollout.

## Post-Release

- Run deployment smoke tests.
- Confirm `/metrics` is scraped.
- Confirm logs are arriving in Loki or the selected log backend.
- Check error rate and readiness dashboards.
- Update release notes with image tags, migration files, and smoke test result.

