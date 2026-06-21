import { describe, expect, it } from "vitest";
import { phaseOneAdminModules } from "../app/config";

describe("Phase 1 admin shell config", () => {
  it("keeps the admin scope focused on Phase 1", () => {
    expect(phaseOneAdminModules).toContain("Admin authentication");
    expect(phaseOneAdminModules).not.toContain("Admin mediation");
  });
});
