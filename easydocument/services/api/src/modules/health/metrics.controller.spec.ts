import { MetricsController } from "./metrics.controller";

describe("MetricsController", () => {
  it("returns Prometheus-compatible placeholder metrics", () => {
    const controller = new MetricsController();
    const metrics = controller.metrics();

    expect(metrics).toContain("# TYPE easydocument_api_up gauge");
    expect(metrics).toContain("easydocument_api_up 1");
    expect(metrics).toContain("easydocument_api_uptime_seconds");
    expect(metrics).toContain("easydocument_api_memory_heap_used_bytes");
  });
});
