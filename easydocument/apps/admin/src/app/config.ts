export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/v1";

export const phaseOneAdminModules = [
  "Admin authentication",
  "Role-based access control",
  "Agent verification queue placeholder",
  "Audit readiness"
] as const;
