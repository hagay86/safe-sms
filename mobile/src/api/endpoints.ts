/**
 * Typed wrappers for every endpoint we call. Keeping these in one file makes it
 * obvious when the backend contract changes.
 */
import { apiRequest } from "./client";
import type {
  AuthUser,
  Company,
  Decision,
  InboxMessage,
  MessageTemplate,
  PendingQueue,
  Role,
  SenderId,
} from "../types";

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export const auth = {
  login: (email: string, password: string) =>
    apiRequest<AuthResult>("/auth/login", { method: "POST", body: { email, password } }),
  register: (params: { email: string; password: string; role?: Role; displayName?: string; phone?: string }) =>
    apiRequest<AuthResult>("/auth/register", { method: "POST", body: params }),
  me: (token: string) => apiRequest<AuthUser>("/auth/me", { token }),
};

export const company = {
  list: (token: string) => apiRequest<Company[]>("/companies", { token }),
  create: (token: string, payload: { name: string; legalName?: string; website?: string; description?: string }) =>
    apiRequest<Company>("/companies", { method: "POST", body: payload, token }),
  listSenders: (token: string, companyId: string) =>
    apiRequest<SenderId[]>(`/companies/${companyId}/sender-ids`, { token }),
  createSender: (token: string, companyId: string, value: string) =>
    apiRequest<SenderId>(`/companies/${companyId}/sender-ids`, {
      method: "POST",
      body: { value },
      token,
    }),
  listTemplates: (token: string, companyId: string) =>
    apiRequest<MessageTemplate[]>(`/companies/${companyId}/templates`, { token }),
  createTemplate: (token: string, companyId: string, payload: { senderIdId: string; body: string }) =>
    apiRequest<MessageTemplate>(`/companies/${companyId}/templates`, { method: "POST", body: payload, token }),
};

export const messages = {
  send: (
    token: string,
    payload: {
      companyId: string;
      senderIdId: string;
      templateId: string;
      recipientPhone: string;
      variables?: Record<string, string>;
    },
  ) => apiRequest("/messages/send", { method: "POST", body: payload, token }),
  inbox: (token: string) => apiRequest<InboxMessage[]>("/inbox", { token }),
};

export const admin = {
  pending: (token: string) => apiRequest<PendingQueue>("/admin/pending", { token }),
  decideCompany: (token: string, id: string, decision: Decision, note?: string) =>
    apiRequest(`/admin/companies/${id}/decision`, { method: "POST", body: { decision, note }, token }),
  decideSender: (token: string, id: string, decision: Decision, note?: string) =>
    apiRequest(`/admin/sender-ids/${id}/decision`, { method: "POST", body: { decision, note }, token }),
  decideTemplate: (token: string, id: string, decision: Decision, note?: string) =>
    apiRequest(`/admin/templates/${id}/decision`, { method: "POST", body: { decision, note }, token }),
};
