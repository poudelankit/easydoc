import { ttlToDate } from "./ttl.util";

describe("ttlToDate", () => {
  it("converts minute TTL strings", () => {
    const now = new Date("2026-06-19T00:00:00.000Z");
    expect(ttlToDate("15m", now).toISOString()).toBe("2026-06-19T00:15:00.000Z");
  });

  it("converts day TTL strings", () => {
    const now = new Date("2026-06-19T00:00:00.000Z");
    expect(ttlToDate("30d", now).toISOString()).toBe("2026-07-19T00:00:00.000Z");
  });
});
