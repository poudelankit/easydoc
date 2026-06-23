import { describe, expect, it } from "vitest";
import {
  adminNavigationItems,
  disputeStatusOptions,
  taskStatusOptions,
  validateAdminEnvironment
} from "../app/config";

describe("Phase 9 admin shell config", () => {
  it("exposes notification summary without payment/refund scope", () => {
    expect(adminNavigationItems.map((item) => item.label)).toEqual([
      "Dashboard",
      "Agent Verification",
      "Task Monitoring",
      "Disputes",
      "Reviews",
      "Notifications"
    ]);
    expect(taskStatusOptions).toContain("ACCEPTED");
    expect(disputeStatusOptions).toContain("UNDER_REVIEW");
    expect(adminNavigationItems.map((item) => item.label)).not.toContain("Payments");
  });

  it("validates production admin endpoints in strict mode", () => {
    expect(
      validateAdminEnvironment({
        MODE: "production",
        VITE_STRICT_ENV: "true",
        VITE_API_BASE_URL: "https://api.easydocument.example/v1",
        VITE_SOCKET_URL: "https://api.easydocument.example"
      })
    ).toMatchObject({
      apiBaseUrl: "https://api.easydocument.example/v1",
      socketUrl: "https://api.easydocument.example"
    });

    expect(() =>
      validateAdminEnvironment({
        MODE: "production",
        VITE_STRICT_ENV: "true",
        VITE_API_BASE_URL: "http://localhost:3000/v1",
        VITE_SOCKET_URL: "http://localhost:3000"
      })
    ).toThrow("must not point to localhost");
  });
});
