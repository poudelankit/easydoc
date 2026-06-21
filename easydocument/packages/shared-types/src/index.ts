export type UserRole = "CUSTOMER" | "AGENT" | "ADMIN" | "OPS" | "FINANCE" | "SUPPORT";

export type UserStatus = "PENDING_OTP" | "ACTIVE" | "SUSPENDED" | "DELETED";

export type AgentStatus = "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export type TaskStatus = "CREATED" | "ACCEPTED";

export interface AuthUser {
  id: string;
  phoneNumber: string;
  fullName: string;
  addressText: string | null;
  role: UserRole;
  status: UserStatus;
  profileComplete: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
