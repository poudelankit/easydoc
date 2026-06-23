type AdminEnvironment = Record<string, string | boolean | undefined>;

export interface AdminEnvironmentValidation {
  apiBaseUrl: string;
  socketUrl: string;
  mode: string;
  warnings: string[];
}

export function validateAdminEnvironment(
  env: AdminEnvironment = import.meta.env as unknown as AdminEnvironment
): AdminEnvironmentValidation {
  const mode = String(env.MODE ?? "development");
  const strict = env.VITE_STRICT_ENV === "true";
  const apiBaseUrl = String(env.VITE_API_BASE_URL ?? "http://localhost:3000/v1");
  const socketUrl = String(env.VITE_SOCKET_URL ?? "http://localhost:3000");
  const warnings: string[] = [];

  validateHttpUrl("VITE_API_BASE_URL", apiBaseUrl, strict);
  validateHttpUrl("VITE_SOCKET_URL", socketUrl, strict);

  if (isProductionLike(mode) && apiBaseUrl.includes("localhost")) {
    warnings.push("VITE_API_BASE_URL points to localhost in a production-like admin build.");
    if (strict) {
      throw new Error("VITE_API_BASE_URL must not point to localhost in strict production validation.");
    }
  }
  if (isProductionLike(mode) && socketUrl.includes("localhost")) {
    warnings.push("VITE_SOCKET_URL points to localhost in a production-like admin build.");
    if (strict) {
      throw new Error("VITE_SOCKET_URL must not point to localhost in strict production validation.");
    }
  }

  return { apiBaseUrl, socketUrl, mode, warnings };
}

export const adminEnvironment = validateAdminEnvironment();
export const apiBaseUrl = adminEnvironment.apiBaseUrl;
export const socketUrl = adminEnvironment.socketUrl;

export const adminNavigationItems = [
  { label: "Dashboard", path: "/" },
  { label: "Agent Verification", path: "/agents" },
  { label: "Task Monitoring", path: "/tasks" },
  { label: "Disputes", path: "/disputes" },
  { label: "Reviews", path: "/reviews" },
  { label: "Notifications", path: "/notifications" }
] as const;

export const taskStatusOptions = [
  "CREATED",
  "ACCEPTED",
  "DEAL_CONFIRMED",
  "IN_PROGRESS",
  "DOCUMENT_REQUESTED",
  "VISITED_ORGANIZATION",
  "DOCUMENT_COLLECTED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED"
] as const;

export const disputeStatusOptions = [
  "OPEN",
  "UNDER_REVIEW",
  "CUSTOMER_ACTION_REQUIRED",
  "AGENT_ACTION_REQUIRED",
  "RESOLVED",
  "REJECTED",
  "CANCELLED"
] as const;

function isProductionLike(mode: string) {
  return mode === "production" || mode === "staging";
}

function validateHttpUrl(name: string, value: string, strict: boolean) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`${name} must use http or https.`);
    }
  } catch (error) {
    if (strict) {
      throw error instanceof Error ? error : new Error(`${name} must be a valid URL.`);
    }
  }
}
