import { describe, expect, it } from "vitest";
import { adminNavigationItems, disputeStatusOptions, taskStatusOptions } from "../app/config";

describe("Phase 8 admin shell config", () => {
  it("exposes review monitoring without payment/refund scope", () => {
    expect(adminNavigationItems.map((item) => item.label)).toEqual([
      "Dashboard",
      "Agent Verification",
      "Task Monitoring",
      "Disputes",
      "Reviews"
    ]);
    expect(taskStatusOptions).toContain("ACCEPTED");
    expect(disputeStatusOptions).toContain("UNDER_REVIEW");
    expect(adminNavigationItems.map((item) => item.label)).not.toContain("Payments");
  });
});
