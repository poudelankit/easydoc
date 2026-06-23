# Seeds

Local and development seed data lives here.

Current seed:

- `001_local_admin.sql`: creates `+9779800000001` as an `ADMIN` user for local OTP login.
- `002_local_demo_flow.sql`: local-only demo flow seed used by `scripts/seed-local-demo-data.sh`.

## Local Demo Flow

Run from the repository root:

```bash
./scripts/start-local-infra.sh
DATABASE_URL=postgresql://easydoc:easydoc_dev_password@localhost:55432/easydocument ./scripts/validate-migrations.sh
./scripts/seed-local-demo-data.sh
```

The demo seed refuses `NODE_ENV=staging` and `NODE_ENV=production`, and the wrapper refuses database URLs that are not local.

Seeded local accounts:

- Admin: `+9779800000001`
- Customer: `+9779800000100`
- Agent: `+9779800000200`
- Local mock OTP: `123456`

Seeded demo IDs:

- Task: `82000000-0000-4000-8000-000000000001`
- Dispute: `87000000-0000-4000-8000-000000000001`
- Review: `88000000-0000-4000-8000-000000000001`
