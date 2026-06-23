# Local Demo Data

This demo seed is for local development only. It does not add product features and must not be run against staging or production.

## Seed

```bash
./scripts/start-local-infra.sh
DATABASE_URL=postgresql://easydoc:easydoc_dev_password@localhost:55432/easydocument ./scripts/validate-migrations.sh
./scripts/seed-local-demo-data.sh
```

The script refuses `NODE_ENV=staging`, refuses `NODE_ENV=production`, and refuses non-local `DATABASE_URL` values.

## Accounts

- Admin: `+9779800000001`
- Customer: `+9779800000100`
- Agent: `+9779800000200`
- Local mock OTP: `123456`

## Demo Records

- Verified agent near Kathmandu: Bikash Demo Agent
- Completed accepted task: `82000000-0000-4000-8000-000000000001`
- Task name: `SITA DEMO CUSTOMER-CITIZENSHIP-CDAO KATHMANDU`
- Communication room with two messages
- One document attachment metadata placeholder
- One ended audio call session
- Timeline from `CREATED` through `COMPLETED`
- One resolved dispute
- One customer review
- In-app notifications for customer, agent, and admin

The task is completed so the review endpoint and admin review screen have a valid record. The timeline still contains the accepted and deal-confirmed states for the full lifecycle demo.

## Admin Portal

1. Start the backend:

   ```bash
   npm run build --workspace @easydocument/api
   NODE_ENV=development \
   PORT=3000 \
   CORS_ORIGIN=http://localhost:5173 \
   DATABASE_URL=postgresql://easydoc:easydoc_dev_password@localhost:55432/easydocument \
   REDIS_URL=redis://localhost:6379 \
   MINIO_ENDPOINT=localhost \
   MINIO_PORT=9000 \
   MINIO_ACCESS_KEY=minioadmin \
   MINIO_SECRET_KEY=minioadmin123 \
   MINIO_USE_SSL=false \
   MINIO_BUCKET_KYC=easydocument-kyc \
   MINIO_BUCKET_CHAT=easydocument-chat \
   MINIO_BUCKET_EXPORTS=easydocument-exports \
   JWT_SECRET=replace-with-strong-local-secret \
   SMS_PROVIDER=local-mock \
   PUSH_PROVIDER=placeholder \
   GOOGLE_MAPS_API_KEY=replace-me \
   node services/api/dist/main.js
   ```

2. Start the admin portal:

   ```bash
   npm run dev --workspace @easydocument/admin
   ```

3. Open `http://localhost:5173`.
4. Send OTP for `+9779800000001`.
5. Enter OTP `123456`.
6. View:
   - Dashboard: task, room, and call counts
   - Tasks: open the completed CDAO task and inspect timeline plus communication audit
   - Disputes: open the resolved timing clarification
   - Reviews: view the customer review
   - Notifications: view admin notification summary

## Customer And Agent API Login

The Flutter app is currently a local shell with placeholders, not a live API client. To inspect the seeded customer and agent data through the backend, use local mock OTP:

```bash
curl -sS -X POST http://localhost:3000/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+9779800000100","purpose":"LOGIN"}'

curl -sS -X POST http://localhost:3000/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+9779800000100","purpose":"LOGIN","otp":"123456"}'
```

Use the returned customer access token with:

- `GET /v1/tasks/me`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001/room`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001/messages`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001/timeline`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001/disputes`
- `GET /v1/customers/me/reviews`
- `GET /v1/notifications`

Repeat login for agent `+9779800000200` and use the returned agent token with:

- `GET /v1/tasks/me`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001/room`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001/messages`
- `GET /v1/tasks/82000000-0000-4000-8000-000000000001/calls`
- `GET /v1/agents/me/reviews`
- `GET /v1/notifications`

## Flutter Shell

Run:

```bash
cd apps/mobile
flutter run -d linux
```

Use the bottom navigation to view the current placeholders:

- OTP: enter `+9779800000100` or `+9779800000200` and local OTP `123456`
- Customer: profile placeholder
- Tasks: create task, task detail, timeline, review, dispute, call, and chat placeholders
- Agent Work: nearby request, accepted task, progress, reviews, dispute, call, and chat placeholders
- Alerts: notification placeholder

Because the mobile app is still a shell, it does not yet fetch the seeded PostgreSQL records directly.
