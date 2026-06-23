export type StructuredLogLevel = "debug" | "info" | "warn" | "error";

const REDACTED_KEYS = ["authorization", "password", "secret", "token", "otp", "cookie"];

export function writeStructuredLog(
  level: StructuredLogLevel,
  event: string,
  details: Record<string, unknown> = {}
) {
  const safeDetails = redact(details) as Record<string, unknown>;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: "easydocument-api",
    environment: process.env.NODE_ENV ?? "development",
    event,
    ...safeDetails
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const lowered = key.toLowerCase();
      if (REDACTED_KEYS.some((redactedKey) => lowered.includes(redactedKey))) {
        return [key, "[REDACTED]"];
      }
      return [key, redact(entry)];
    })
  );
}
