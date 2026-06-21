# EasyDocument Admin

React + TypeScript admin portal for EasyDocument operations.

## Planned Scope

- Admin authentication.
- Agent verification queue.
- User and task monitoring.
- Audit log search.
- Later dispute mediation, analytics, settings, and moderation.

## Current State

This folder contains the Phase 1 React + TypeScript admin shell. It includes the admin login surface and operational readiness placeholders only.

## Local Setup

```bash
npm install
npm run dev --workspace @easydocument/admin
```

If the dev server fails with `ENOSPC: System limit for number of file watchers reached`, raise the OS watcher limit and rerun the command. The production build is the validation source for Phase 1 when this environment limit is hit.

Run tests:

```bash
npm run test --workspace @easydocument/admin
```
