const LOCAL_DEVELOPMENT_JWT_SECRET = "replace-with-strong-local-secret";
const PRODUCTION_LIKE_ENVS = ["production", "staging"];
const PLACEHOLDER_VALUES = new Set([
  "",
  "replace-me",
  "replace-with-strong-local-secret",
  "minioadmin",
  "minioadmin123",
  "easydoc_dev_password"
]);

export interface RuntimeEnvironmentValidation {
  nodeEnv: string;
  warnings: string[];
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV ?? "development";
}

export function isProductionLikeEnv(): boolean {
  return PRODUCTION_LIKE_ENVS.includes(getNodeEnv());
}

export function shouldReturnDevOtp(): boolean {
  const nodeEnv = getNodeEnv();
  return nodeEnv === "development" || nodeEnv === "local";
}

export function resolveJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (isProductionLikeEnv() && (!jwtSecret || jwtSecret === LOCAL_DEVELOPMENT_JWT_SECRET)) {
    throw new Error("JWT_SECRET must be configured with a strong value outside local development.");
  }

  return jwtSecret ?? LOCAL_DEVELOPMENT_JWT_SECRET;
}

export function resolveCorsOrigin(): string[] | boolean {
  const corsOrigin = process.env.CORS_ORIGIN;
  const origins = corsOrigin
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (isProductionLikeEnv() && (!origins || origins.length === 0)) {
    throw new Error("CORS_ORIGIN must be configured outside local development.");
  }

  return origins && origins.length > 0 ? origins : true;
}

export function validateRuntimeEnvironment(): RuntimeEnvironmentValidation {
  const nodeEnv = getNodeEnv();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    resolveJwtSecret();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    const corsOrigin = resolveCorsOrigin();
    if (Array.isArray(corsOrigin) && isProductionLikeEnv() && corsOrigin.includes("*")) {
      errors.push("CORS_ORIGIN must not include '*' outside local development.");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  validateUrl("DATABASE_URL", ["postgresql:", "postgres:"], errors, warnings, true);
  validateUrl("REDIS_URL", ["redis:", "rediss:"], errors, warnings, true);
  validatePositiveInteger("PORT", errors, warnings);
  validatePositiveInteger("MINIO_PORT", errors, warnings);

  if (isProductionLikeEnv()) {
    requirePresent("DATABASE_URL", errors);
    requirePresent("REDIS_URL", errors);
    requirePresent("MINIO_ENDPOINT", errors);
    requirePresent("MINIO_ACCESS_KEY", errors);
    requirePresent("MINIO_SECRET_KEY", errors);
    requirePresent("MINIO_BUCKET_KYC", errors);
    requirePresent("MINIO_BUCKET_CHAT", errors);
    requirePresent("MINIO_BUCKET_EXPORTS", errors);
    requireNonPlaceholder("JWT_SECRET", errors);
    requireNonPlaceholder("MINIO_ACCESS_KEY", errors);
    requireNonPlaceholder("MINIO_SECRET_KEY", errors);

    if (process.env.SMS_PROVIDER === "local-mock") {
      warnings.push("SMS_PROVIDER is local-mock; production OTP delivery still needs a real provider.");
    }
    if (process.env.FCM_SERVER_KEY === "replace-me") {
      warnings.push("FCM_SERVER_KEY is a placeholder; push delivery is not enabled.");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(" ")}`);
  }

  return { nodeEnv, warnings };
}

function requirePresent(name: string, errors: string[]) {
  if (!process.env[name]?.trim()) {
    errors.push(`${name} is required outside local development.`);
  }
}

function requireNonPlaceholder(name: string, errors: string[]) {
  const value = process.env[name]?.trim() ?? "";
  if (PLACEHOLDER_VALUES.has(value)) {
    errors.push(`${name} must not use a local placeholder outside local development.`);
  }
}

function validateUrl(
  name: string,
  protocols: string[],
  errors: string[],
  warnings: string[],
  requiredInProduction: boolean
) {
  const value = process.env[name];
  if (!value) {
    if (requiredInProduction && isProductionLikeEnv()) {
      errors.push(`${name} is required outside local development.`);
    }
    return;
  }

  try {
    const parsed = new URL(value);
    if (!protocols.includes(parsed.protocol)) {
      errors.push(`${name} must use one of: ${protocols.join(", ")}`);
    }
  } catch {
    errors.push(`${name} must be a valid URL.`);
  }

  if (!isProductionLikeEnv() && value.includes("localhost")) {
    warnings.push(`${name} is using localhost for local development.`);
  }
}

function validatePositiveInteger(name: string, errors: string[], warnings: string[]) {
  const value = process.env[name];
  if (!value) {
    return;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    errors.push(`${name} must be a valid TCP port.`);
  } else if (!isProductionLikeEnv()) {
    warnings.push(`${name} is configured for local development.`);
  }
}
