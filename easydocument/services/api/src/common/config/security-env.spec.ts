import {
  resolveCorsOrigin,
  resolveJwtSecret,
  shouldReturnDevOtp,
  validateRuntimeEnvironment
} from "./security-env";

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

  it("validates production runtime dependencies", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "phase-10-production-grade-secret";
    process.env.CORS_ORIGIN = "https://admin.easydocument.example";
    process.env.DATABASE_URL = "postgresql://easydoc:strong-password@postgres.example/easydocument";
    process.env.REDIS_URL = "rediss://redis.example:6379";
    process.env.MINIO_ENDPOINT = "minio.example";
    process.env.MINIO_PORT = "9000";
    process.env.MINIO_ACCESS_KEY = "prod-access-key";
    process.env.MINIO_SECRET_KEY = "prod-secret-key";
    process.env.MINIO_BUCKET_KYC = "easydocument-kyc";
    process.env.MINIO_BUCKET_CHAT = "easydocument-chat";
    process.env.MINIO_BUCKET_EXPORTS = "easydocument-exports";

    expect(validateRuntimeEnvironment()).toMatchObject({ nodeEnv: "production" });
  });

  it("rejects placeholder production storage credentials", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "phase-10-production-grade-secret";
    process.env.CORS_ORIGIN = "https://admin.easydocument.example";
    process.env.DATABASE_URL = "postgresql://easydoc:strong-password@postgres.example/easydocument";
    process.env.REDIS_URL = "redis://redis.example:6379";
    process.env.MINIO_ENDPOINT = "minio.example";
    process.env.MINIO_ACCESS_KEY = "minioadmin";
    process.env.MINIO_SECRET_KEY = "minioadmin123";
    process.env.MINIO_BUCKET_KYC = "easydocument-kyc";
    process.env.MINIO_BUCKET_CHAT = "easydocument-chat";
    process.env.MINIO_BUCKET_EXPORTS = "easydocument-exports";

    expect(() => validateRuntimeEnvironment()).toThrow("MINIO_ACCESS_KEY must not use");
  });
});
