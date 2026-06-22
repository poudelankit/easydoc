export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/v1";

export const adminNavigationItems = [
  { label: "Dashboard", path: "/" },
  { label: "Agent Verification", path: "/agents" },
  { label: "Task Monitoring", path: "/tasks" }
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
