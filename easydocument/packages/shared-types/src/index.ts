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

export type AgentVerificationDecision = "APPROVED" | "REJECTED";

export interface AdminDashboardResponse {
  agentVerification: {
    pending: number;
    verified: number;
    rejected: number;
  };
  tasks: {
    total: number;
    active: number;
    byStatus: Array<{
      status: TaskStatus;
      count: number;
    }>;
  };
  communication: {
    roomCount: number;
    callCount: number;
  };
}

export interface AdminAgentVerificationSummary {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    addressText: string | null;
  };
  citizenshipNumber: string;
  permanentAddressText: string;
  permanentLocation: {
    latitude: number;
    longitude: number;
  };
  status: AgentStatus;
  isAvailable: boolean;
  verification: {
    decision: AgentVerificationDecision | null;
    decidedByAdminUserId: string | null;
    decidedByAdminName: string | null;
    decidedAt: string | null;
    reason: string | null;
  };
  citizenshipFiles: AdminCitizenshipFileMetadata[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminCitizenshipFileMetadata {
  fileId: string;
  kind: "CITIZENSHIP_FRONT" | "CITIZENSHIP_BACK" | "SELFIE" | "KYC";
  objectKey: string;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: string | number;
  status: string;
  createdAt: string;
}

export type AdminAgentVerificationDetail = AdminAgentVerificationSummary;

export interface AdminTaskSummary {
  id: string;
  taskName: string;
  documentType: string;
  organizationName: string;
  organizationAddress: string;
  organizationLocation: {
    latitude: number;
    longitude: number;
  };
  requestDescription?: string;
  status: TaskStatus;
  customer: {
    userId: string;
    fullName: string;
    phoneNumber: string;
  };
  assignedAgent: {
    userId: string;
    fullName: string | null;
    phoneNumber: string | null;
  } | null;
  acceptedAt: string | null;
  expectedCompletionDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type AdminTaskDetail = AdminTaskSummary & {
  requestDescription: string;
};

export interface AdminTaskTimelineResponse {
  taskId: string;
  currentStatus: TaskStatus;
  expectedCompletionDate: string | null;
  events: Array<{
    id: string;
    eventType: "STATUS_CHANGE" | "EXPECTED_DATE_UPDATED";
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    note: string | null;
    expectedCompletionDate: string | null;
    actor: {
      userId: string;
      role: string;
      fullName: string;
      phoneNumber: string;
    };
    createdAt: string | null;
  }>;
}

export interface AdminCommunicationAuditResponse {
  taskId: string;
  roomExists: boolean;
  roomId: string | null;
  roomCreatedAt: string | null;
  messageCount: number;
  attachmentCount: number;
  callCount: number;
  lastActivityAt: string | null;
  rawMessageBodyVisible: false;
}
