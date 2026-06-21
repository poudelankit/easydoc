export type UserRole = "CUSTOMER" | "AGENT" | "ADMIN" | "OPS" | "FINANCE" | "SUPPORT";

export interface AuthenticatedUser {
  id: string;
  phoneNumber: string;
  role: UserRole;
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}
