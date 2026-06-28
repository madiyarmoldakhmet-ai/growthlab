// Mock data types — shaped like the FUTURE backend API responses so screens can be
// swapped from mock to real fetch without changing the UI.
import type { StatusKey } from "../statuses";

export type Channel = "email" | "whatsapp";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface Campaign {
  id: string;
  name: string;
  goal: string;
  channel: Channel | "multi";
  status: CampaignStatus;
  sent: number;
  replied: number;
  qualified: number;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  status: StatusKey;
  quality: string;
}

export interface Offer {
  id: string;
  product: string;
  audience: string;
  price: string;
  benefit: string;
  nextStep: string;
}

export interface MessageVersion {
  id: string;
  channel: Channel;
  name: string;
  version: string;
  subject?: string;
  body: string;
}

export interface QueueItem {
  id: string;
  to: string;
  company: string;
  channel: Channel;
  status: Extract<StatusKey, "queued" | "sending" | "sent" | "failed">;
  error?: string;
}

export interface Dialogue {
  id: string;
  contact: string;
  company: string;
  channel: Channel;
  status: StatusKey;
  lastAt: string;
  messages: { from: "us" | "them"; text: string }[];
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  status: Extract<StatusKey, "replied" | "interested" | "qualified">;
  reasons: string[];
}

export interface Sale {
  id: string;
  company: string;
  stage: "созвон" | "follow-up" | "закрыто";
  amount: number;
  note: string;
}

export interface AutoResearchInsight {
  worked: string[];
  failed: string[];
  improve: string[];
  proposal: { current: string; next: string };
}
