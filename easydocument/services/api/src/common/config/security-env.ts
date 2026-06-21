const LOCAL_DEVELOPMENT_JWT_SECRET = "replace-with-strong-local-secret";

export function getNodeEnv(): string {
  return process.env.NODE_ENV ?? "development";
}

export function isProductionLikeEnv(): boolean {
  return getNodeEnv() === "production" || getNodeEnv() === "staging";
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
