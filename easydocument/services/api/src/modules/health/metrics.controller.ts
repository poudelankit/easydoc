import { Controller, Get, Header } from "@nestjs/common";

@Controller("metrics")
export class MetricsController {
  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  metrics() {
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());
    const timestamp = Date.now();

    return [
      "# HELP easydocument_api_up API process availability placeholder.",
      "# TYPE easydocument_api_up gauge",
      "easydocument_api_up 1",
      "# HELP easydocument_api_uptime_seconds API process uptime in seconds.",
      "# TYPE easydocument_api_uptime_seconds gauge",
      `easydocument_api_uptime_seconds ${uptimeSeconds}`,
      "# HELP easydocument_api_memory_heap_used_bytes API heap memory currently used.",
      "# TYPE easydocument_api_memory_heap_used_bytes gauge",
      `easydocument_api_memory_heap_used_bytes ${memory.heapUsed}`,
      "# HELP easydocument_api_metrics_generated_at Metrics generation timestamp in milliseconds.",
      "# TYPE easydocument_api_metrics_generated_at gauge",
      `easydocument_api_metrics_generated_at ${timestamp}`,
      ""
    ].join("\n");
  }
}
