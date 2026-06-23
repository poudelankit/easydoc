import { apiBaseUrl } from "./config";
import type {
  AdminAgentVerificationDetail,
  AdminAgentVerificationSummary,
  AdminCommunicationAuditResponse,
  AdminDashboardResponse,
  AdminDisputeDetail,
  AdminDisputeSummary,
  AdminReviewSummary,
  AdminTaskDetail,
  AdminTaskSummary,
  AdminTaskTimelineResponse,
  AuthResponse,
  AuthUser,
  DisputeStatus,
  TaskStatus
} from "@easydocument/shared-types";

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const sessionStorageKey = "easydocument.admin.session";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function loadStoredSession(): AdminSession | null {
  const rawSession = window.localStorage.getItem(sessionStorageKey);
  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as AdminSession;
    return session.user?.role === "ADMIN" ? session : null;
  } catch {
    return null;
  }
}

export function storeSession(session: AdminSession) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(sessionStorageKey);
}

export async function sendOtp(phoneNumber: string) {
  return apiRequest<{ success: boolean; retryAfterSeconds: number; devOtp?: string }>("/auth/otp/send", {
    method: "POST",
    body: { phoneNumber, purpose: "LOGIN" }
  });
}

export async function verifyOtp(phoneNumber: string, otp: string) {
  const auth = await apiRequest<AuthResponse>("/auth/otp/verify", {
    method: "POST",
    body: { phoneNumber, otp, purpose: "LOGIN" }
  });

  if (auth.user.role !== "ADMIN") {
    throw new ApiError("Only admin users can access the admin portal", 403);
  }

  return auth;
}

export function getAdminMe(token: string) {
  return apiRequest<AuthUser>("/admin/me", { token });
}

export function getDashboard(token: string) {
  return apiRequest<AdminDashboardResponse>("/admin/dashboard", { token });
}

export function getPendingAgents(token: string) {
  return apiRequest<AdminAgentVerificationSummary[]>("/admin/agents/pending", { token });
}

export function getAgent(token: string, agentId: string) {
  return apiRequest<AdminAgentVerificationDetail>(`/admin/agents/${agentId}`, { token });
}

export function approveAgent(token: string, agentId: string) {
  return apiRequest<AdminAgentVerificationDetail>(`/admin/agents/${agentId}/approve`, {
    method: "POST",
    token
  });
}

export function rejectAgent(token: string, agentId: string, reason: string) {
  return apiRequest<AdminAgentVerificationDetail>(`/admin/agents/${agentId}/reject`, {
    method: "POST",
    token,
    body: { reason }
  });
}

export function getTasks(token: string, status?: TaskStatus | "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<AdminTaskSummary[]>(`/admin/tasks${query}`, { token });
}

export function getTask(token: string, taskId: string) {
  return apiRequest<AdminTaskDetail>(`/admin/tasks/${taskId}`, { token });
}

export function getTaskTimeline(token: string, taskId: string) {
  return apiRequest<AdminTaskTimelineResponse>(`/admin/tasks/${taskId}/timeline`, { token });
}

export function getCommunicationAudit(token: string, taskId: string) {
  return apiRequest<AdminCommunicationAuditResponse>(
    `/admin/tasks/${taskId}/communication-audit`,
    { token }
  );
}

export function getDisputes(token: string, status?: DisputeStatus | "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<AdminDisputeSummary[]>(`/admin/disputes${query}`, { token });
}

export function getDispute(token: string, disputeId: string) {
  return apiRequest<AdminDisputeDetail>(`/admin/disputes/${disputeId}`, { token });
}

export function getAdminReviews(token: string) {
  return apiRequest<AdminReviewSummary[]>("/admin/reviews", { token });
}

export function addMediationNote(token: string, disputeId: string, note: string) {
  return apiRequest<AdminDisputeDetail>(`/admin/disputes/${disputeId}/notes`, {
    method: "POST",
    token,
    body: { note }
  });
}

export function updateDisputeStatus(
  token: string,
  disputeId: string,
  status: DisputeStatus,
  note?: string
) {
  return apiRequest<AdminDisputeDetail>(`/admin/disputes/${disputeId}/status`, {
    method: "POST",
    token,
    body: { status, note }
  });
}

export function resolveDispute(token: string, disputeId: string, resolutionSummary: string) {
  return apiRequest<AdminDisputeDetail>(`/admin/disputes/${disputeId}/resolve`, {
    method: "POST",
    token,
    body: { resolutionSummary }
  });
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    token?: string;
  } = {}
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(data?.message ?? "Request failed", response.status);
  }

  return data as T;
}
