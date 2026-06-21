import { normalizeNepalPhone } from "./phone.util";

describe("normalizeNepalPhone", () => {
  it("keeps valid E.164 Nepal mobile numbers", () => {
    expect(normalizeNepalPhone("+9779800000000")).toBe("+9779800000000");
  });

  it("normalizes local Nepal mobile numbers", () => {
    expect(normalizeNepalPhone("9800000000")).toBe("+9779800000000");
  });

  it("rejects non-Nepal mobile numbers", () => {
    expect(() => normalizeNepalPhone("+15555555555")).toThrow();
  });
});
