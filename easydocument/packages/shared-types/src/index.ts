export type UserRole = "CUSTOMER" | "AGENT" | "ADMIN" | "OPS" | "FINANCE" | "SUPPORT";

export type UserStatus = "PENDING_OTP" | "ACTIVE" | "SUSPENDED" | "DELETED";

export type AgentStatus = "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export type TaskStatus =
  | "CREATED"
  | "ACCEPTED"
  | "DEAL_CONFIRMED"
  | "IN_PROGRESS"
  | "DOCUMENT_REQUESTED"
  | "VISITED_ORGANIZATION"
  | "DOCUMENT_COLLECTED"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type CallType = "AUDIO" | "VIDEO";

export type CallStatus =
  | "REQUESTED"
  | "RINGING"
  | "ACCEPTED"
  | "DECLINED"
  | "MISSED"
  | "ENDED"
  | "FAILED";

export interface CallStatusHistoryEntry {
  id: string;
  actorUserId: string;
  actorRole: UserRole;
  fromStatus: CallStatus | null;
  toStatus: CallStatus;
  note: string | null;
  signalingEvent: string | null;
  createdAt: string;
}

export interface RtcConfiguration {
  iceServers: Array<Record<string, unknown>>;
}

export interface CallSession {
  id: string;
  taskId: string;
  roomId: string;
  callType: CallType;
  status: CallStatus;
  initiatedBy: {
    userId: string;
    fullName: string;
    phoneNumber: string;
  };
  rtcConfiguration: RtcConfiguration;
  statusHistory: CallStatusHistoryEntry[];
  startedAt: string | null;
  acceptedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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
