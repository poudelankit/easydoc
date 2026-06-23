# Observability

Phase 11 adds a lightweight metrics export point and documents the Prometheus, Grafana, and Loki expectations. Structured JSON logs were introduced in Phase 10.

## Metrics Endpoint

The backend exposes:

```text
GET /metrics
```

The endpoint returns Prometheus text format with foundation metrics:

- `easydocument_api_up`
- `easydocument_api_uptime_seconds`
- `easydocument_api_memory_heap_used_bytes`
- `easydocument_api_metrics_generated_at`

This is intentionally minimal. Business metrics and per-route latency histograms should be added after the production monitoring stack is selected.

## Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: easydocument-api
    metrics_path: /metrics
    static_configs:
      - targets:
          - api.easydocument.example
```

For Kubernetes, prefer service discovery and scrape the API service or pod annotations once the cluster monitoring operator is chosen.

## Grafana Dashboard Expectations

Create dashboards for:

- API liveness and readiness status.
- HTTP request volume, latency, and 4xx/5xx rate.
- PostgreSQL availability, connection saturation, slow queries, and backup status.
- Redis availability, memory, and command latency.
- MinIO bucket usage, request errors, and latency.
- Rate-limit rejections by workflow.
- Audit log event counts for sensitive actions.

## Loki Log Shipping Expectations

Ship backend JSON logs to Loki with stable labels:

- `service`
- `environment`
- `level`
- `event`

Keep user IDs, task IDs, dispute IDs, and request IDs in the log body rather than Loki labels to avoid high-cardinality indexing.

## Alert Baseline

- API readiness failing for more than 5 minutes.
- 5xx error rate over 2 percent for 10 minutes.
- PostgreSQL unavailable or backup failed.
- Redis unavailable.
- MinIO unavailable or bucket near capacity.
- Sustained OTP rate-limit spikes.
- Repeated failed admin authorization attempts.

