export type Role = "admin" | "associate" | "clerk" | "client";
export type CaseType = "civil" | "criminal" | "family" | "writ" | "appeal";
export type CaseStatus = "active" | "decided" | "dormant";
export type DocStatus = "draft" | "review" | "filed";
export type Urgency = "normal" | "urgent";

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email?: string;
  clientId?: string; // for role=client
}

export interface Court {
  id: string;
  type: "SC" | "HC" | "district-civil" | "sessions" | "family" | "tribunal";
  name: string;
  bench?: string;
  city: string;
  room?: string;
}

export interface ClientParty {
  id: string;
  name: string;
  cnic?: string;
  phone: string;
  address?: string;
  languagePref: "en" | "ur";
}

export interface Case {
  id: string;
  matterThreadId: string;
  number: string;
  type: CaseType;
  courtId: string;
  stage: string;
  title: string;
  parties: { plaintiff: string; defendant: string };
  clientId: string;
  assignedUserIds: string[];
  status: CaseStatus;
  firNo?: string;
  policeStation?: string;
  sections?: string[];
  filedOn: string; // ISO date
  decidedOn?: string; // ISO date, when judgment/decree passed
  limitationDate?: string; // manual limitation/deadline override
  linkedCaseId?: string; // matter thread predecessor
}

export interface Hearing {
  id: string;
  caseId: string;
  date: string; // ISO date
  time?: string;
  purpose: string;
  outcomeNote?: string;
  nextDate?: string;
  readiness: "ready" | "pending" | "na";
  enteredBy: string;
  enteredAt: string;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  kind: "generated" | "uploaded";
  templateType?: string;
  title: string;
  status: DocStatus;
  visibility: "firm" | "shared";
  body?: string; // generated content
  createdBy: string;
  createdAt: string;
}

export interface FeeEntry {
  id: string;
  caseId: string;
  kind: "agreed" | "received" | "adjustment";
  amount: number;
  method?: "cash" | "bank" | "gateway";
  date: string;
  note?: string;
  enteredBy: string;
}

export interface Inquiry {
  id: string;
  channel: "webchat" | "whatsapp" | "voice";
  callerName: string;
  phone: string;
  matterType: string;
  summary: string;
  urgency: Urgency;
  callbackSlot?: string;
  status: "new" | "contacted" | "consulted" | "converted" | "closed";
  transcript: { from: "caller" | "assistant"; text: string }[];
  createdAt: string;
}

export interface NotificationRec {
  id: string;
  recipient: string;
  channel: "sms" | "whatsapp" | "in-app";
  template: string;
  payload: string;
  status: "queued" | "sent" | "delivered" | "failed";
  note?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  userId?: string;
  userName?: string;
  action: "login" | "view" | "download" | "edit" | "create";
  entityType: string;
  entityId: string;
  detail?: string;
  at: string;
}

export interface DB {
  firm: { name: string; nameUrdu: string; tagline: string };
  users: User[];
  courts: Court[];
  clients: ClientParty[];
  cases: Case[];
  hearings: Hearing[];
  documents: CaseDocument[];
  fees: FeeEntry[];
  inquiries: Inquiry[];
  notifications: NotificationRec[];
  audit: AuditEvent[];
}
