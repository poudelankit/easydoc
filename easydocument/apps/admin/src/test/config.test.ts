import { describe, expect, it } from "vitest";
import { adminNavigationItems, taskStatusOptions } from "../app/config";

describe("Phase 6 admin shell config", () => {
  it("exposes the operational admin screens without mediation scope", () => {
    expect(adminNavigationItems.map((item) => item.label)).toEqual([
      "Dashboard",
      "Agent Verification",
      "Task Monitoring"
    ]);
    expect(taskStatusOptions).toContain("ACCEPTED");
    expect(adminNavigationItems.map((item) => item.label)).not.toContain("Admin Mediation");
  });
});
