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
    delete process.env.SMS_PROVIDER;
    delete process.env.PUSH_PROVIDER;
    delete process.env.SMS_PROVIDER_ENDPOINT;
    delete process.env.SMS_PROVIDER_API_KEY;
    delete process.env.SMS_PROVIDER_SENDER_ID;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_MAPS_API_KEY;
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
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-gateway.easydocument.internal/send";
    process.env.SMS_PROVIDER_API_KEY = "prod-sms-provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-production";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    process.env.GOOGLE_MAPS_API_KEY = "prod-google-maps-key";

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
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-gateway.easydocument.internal/send";
    process.env.SMS_PROVIDER_API_KEY = "prod-sms-provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-production";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    process.env.GOOGLE_MAPS_API_KEY = "prod-google-maps-key";

    expect(() => validateRuntimeEnvironment()).toThrow("MINIO_ACCESS_KEY must not use");
  });

  it("rejects local delivery providers outside local development", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "phase-12-production-grade-secret";
    process.env.CORS_ORIGIN = "https://admin.easydocument.example";
    process.env.DATABASE_URL = "postgresql://easydoc:strong-password@postgres.example/easydocument";
    process.env.REDIS_URL = "rediss://redis.example:6379";
    process.env.MINIO_ENDPOINT = "minio.example";
    process.env.MINIO_ACCESS_KEY = "prod-access-key";
    process.env.MINIO_SECRET_KEY = "prod-secret-key";
    process.env.MINIO_BUCKET_KYC = "easydocument-kyc";
    process.env.MINIO_BUCKET_CHAT = "easydocument-chat";
    process.env.MINIO_BUCKET_EXPORTS = "easydocument-exports";
    process.env.SMS_PROVIDER = "local-mock";
    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-gateway.easydocument.internal/send";
    process.env.SMS_PROVIDER_API_KEY = "prod-sms-provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    process.env.PUSH_PROVIDER = "placeholder";
    process.env.FIREBASE_PROJECT_ID = "easydocument-production";
    process.env.FIREBASE_SERVICE_ACCOUNT_SECRET_NAME = "easydocument/firebase-service-account";
    process.env.GOOGLE_MAPS_API_KEY = "prod-google-maps-key";

    expect(() => validateRuntimeEnvironment()).toThrow("SMS_PROVIDER must not be local-mock");
  });

  it("requires production-like provider connection details", () => {
    process.env.NODE_ENV = "staging";
    process.env.JWT_SECRET = "phase-13-staging-grade-secret";
    process.env.CORS_ORIGIN = "https://staging-admin.easydocument.example";
    process.env.DATABASE_URL = "postgresql://easydoc:strong-password@postgres.example/easydocument";
    process.env.REDIS_URL = "rediss://redis.example:6379";
    process.env.MINIO_ENDPOINT = "minio.example";
    process.env.MINIO_ACCESS_KEY = "staging-access-key";
    process.env.MINIO_SECRET_KEY = "staging-secret-key";
    process.env.MINIO_BUCKET_KYC = "easydocument-kyc";
    process.env.MINIO_BUCKET_CHAT = "easydocument-chat";
    process.env.MINIO_BUCKET_EXPORTS = "easydocument-exports";
    process.env.SMS_PROVIDER = "real-sms-provider";
    process.env.SMS_PROVIDER_API_KEY = "staging-sms-provider-key";
    process.env.SMS_PROVIDER_SENDER_ID = "EasyDoc";
    process.env.PUSH_PROVIDER = "firebase";
    process.env.FIREBASE_PROJECT_ID = "easydocument-staging";
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = "/var/run/secrets/firebase/service-account.json";
    process.env.GOOGLE_MAPS_API_KEY = "staging-google-maps-key";

    expect(() => validateRuntimeEnvironment()).toThrow("SMS_PROVIDER_ENDPOINT is required");

    process.env.SMS_PROVIDER_ENDPOINT = "https://sms-gateway.easydocument.internal/send";
    expect(validateRuntimeEnvironment()).toMatchObject({ nodeEnv: "staging" });
  });
});
