# Monitoring

Phase 10 uses structured JSON logs and health endpoints as the monitoring foundation.

## Logs

Backend logs are JSON lines with:

- `timestamp`
- `level`
- `service`
- `environment`
- `event`
- request or domain metadata

Important event names:

- `http.request.started`
- `http.request.completed`
- `http.request.failed`
- `audit.action`
- `notification.created`
- `rate_limit.checked`
- `api.started`

Recommended Loki labels:

- `service`
- `environment`
- `level`
- `event`

Avoid high-cardinality labels such as user IDs and task IDs; keep those in log body fields.

## Metrics

The backend exposes a Phase 11 metrics foundation at:

```text
GET /metrics
```

Prometheus/Grafana setup should track:

- API pod restarts and readiness failures.
- HTTP 4xx/5xx rate by route.
- Request latency p50/p95/p99.
- PostgreSQL connection saturation and query latency.
- Redis command latency and memory.
- MinIO bucket usage, request errors, and latency.
- Rate-limit rejection counts from `rate_limit.checked`.

Detailed scrape config, dashboard expectations, and Loki guidance live in `docs/observability.md`.

## Alerts

Suggested alerts:

- API readiness failure for more than 5 minutes.
- Any 5xx error rate over 2 percent for 10 minutes.
- PostgreSQL backup failure.
- Redis unavailable.
- MinIO unavailable or bucket near capacity.
- Repeated JWT/CORS environment validation failure on deployment.
