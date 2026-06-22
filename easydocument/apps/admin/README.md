# EasyDocument Admin

React + TypeScript admin portal for EasyDocument operations.

## Planned Scope

- Admin authentication.
- Agent verification queue.
- User and task monitoring.
- Communication audit summaries.
- Later dispute mediation, analytics, settings, and moderation.

## Current State

This folder contains the Phase 6 React + TypeScript admin portal foundation. It includes OTP login/session storage, dashboard navigation, pending agent verification, agent profile/KYC metadata detail, approval/rejection actions, task monitoring, task detail, timeline, and communication audit summaries.

## Local Setup

```bash
npm install
npm run dev --workspace @easydocument/admin
```

If the dev server fails with `ENOSPC: System limit for number of file watchers reached`, raise the OS watcher limit and rerun the command. The production build is the validation source for Phase 6 when this environment limit is hit.
Use the seeded local admin phone `+9779800000001` with the local mock OTP when `SMS_PROVIDER=local-mock`.

Run tests:

```bash
npm run test --workspace @easydocument/admin
```
