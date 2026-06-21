import { resolveCorsOrigin, resolveJwtSecret, shouldReturnDevOtp } from "./security-env";

describe("security environment helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CORS_ORIGIN;
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects missing or local JWT secrets outside local development", () => {
    process.env.NODE_ENV = "production";
    expect(() => resolveJwtSecret()).toThrow("JWT_SECRET must be configured");

    process.env.JWT_SECRET = "replace-with-strong-local-secret";
    expect(() => resolveJwtSecret()).toThrow("JWT_SECRET must be configured");

    process.env.JWT_SECRET = "phase-1-production-grade-secret";
    expect(resolveJwtSecret()).toBe("phase-1-production-grade-secret");
  });

  it("requires explicit CORS origins outside local development", () => {
    process.env.NODE_ENV = "staging";
    expect(() => resolveCorsOrigin()).toThrow("CORS_ORIGIN must be configured");

    process.env.CORS_ORIGIN = "https://admin.easydocument.example, https://ops.easydocument.example";
    expect(resolveCorsOrigin()).toEqual([
      "https://admin.easydocument.example",
      "https://ops.easydocument.example"
    ]);
  });

  it("only returns dev OTPs in local development environments", () => {
    process.env.NODE_ENV = "development";
    expect(shouldReturnDevOtp()).toBe(true);

    process.env.NODE_ENV = "local";
    expect(shouldReturnDevOtp()).toBe(true);

    process.env.NODE_ENV = "staging";
    expect(shouldReturnDevOtp()).toBe(false);

    process.env.NODE_ENV = "production";
    expect(shouldReturnDevOtp()).toBe(false);
  });
});
