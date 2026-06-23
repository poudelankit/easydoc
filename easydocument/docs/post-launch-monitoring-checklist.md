# Post-Launch Monitoring Checklist

Monitor these signals for at least the first 60 minutes after production cutover.

## API

- `/health/live`
- `/health/ready`
- `/health/database`
- `/health/redis`
- `/health/minio`
- `/metrics`
- HTTP 5xx rate
- request latency p95/p99

## Providers

- `/health/otp-provider`
- `/health/push-provider`
- OTP send rate and rejection rate
- SMS provider error logs
- Push provider placeholder logs until real Firebase sending is enabled

## Data Stores

- PostgreSQL connections and slow queries.
- Redis memory and command latency.
- MinIO request errors and bucket usage.

## Product Workflows

- OTP login.
- Customer registration.
- Agent registration.
- Task creation and acceptance.
- Messaging room access.
- Admin login and dashboard.

## Incident Watch

- Audit log errors.
- Rate-limit spikes.
- Repeated unauthorized admin access.
- Notification creation failures.

