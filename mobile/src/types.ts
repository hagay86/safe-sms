export type Role = "CONSUMER" | "COMPANY" | "ADMIN";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DeliveryStatus = "DELIVERED" | "BLOCKED_UNKNOWN_SENDER" | "BLOCKED_UNAPPROVED_TEMPLATE";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName?: string | null;
  phone?: string | null;
}

export interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  website?: string | null;
  description?: string | null;
  status: ApprovalStatus;
  reviewNote?: string | null;
  createdAt: string;
  _count?: { senderIds: number; templates: number };
}

export interface SenderId {
  id: string;
  companyId: string;
  value: string;
  status: ApprovalStatus;
  reviewNote?: string | null;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  companyId: string;
  senderIdId: string;
  body: string;
  placeholders: string[];
  status: ApprovalStatus;
  reviewNote?: string | null;
  createdAt: string;
  senderId?: { value: string; status: ApprovalStatus };
}

export interface InboxMessage {
  id: string;
  body: string;
  claimedSender: string;
  status: DeliveryStatus;
  verified: boolean;
  companyName: string | null;
  createdAt: string;
}

export interface PendingQueue {
  companies: Company[];
  senderIds: (SenderId & { company: { id: string; name: string; status: ApprovalStatus } })[];
  templates: (MessageTemplate & {
    company: { id: string; name: string; status: ApprovalStatus };
    senderId: { id: string; value: string; status: ApprovalStatus };
  })[];
}

export type Decision = "APPROVE" | "REJECT";
