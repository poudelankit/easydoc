import { describe, expect, it } from "vitest";
import { adminNavigationItems, disputeStatusOptions, taskStatusOptions } from "../app/config";

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
});
