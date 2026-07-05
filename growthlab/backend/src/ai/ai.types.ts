export const LEAD_CATEGORIES = [
  'интерес',
  'не интересно',
  'цена',
  'созвон',
  'перезвоните позже',
] as const;

export type LeadCategory = (typeof LEAD_CATEGORIES)[number];

export type AiChannel = 'email' | 'sms' | 'whatsapp' | 'telegram' | 'phone_script';

export interface AiModuleOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface GenerateMessageInput {
  product: string;
  audience?: string;
  goal?: string;
  channel?: AiChannel;
  tone?: string;
  contactName?: string;
  companyName?: string;
  context?: string;
  maxLength?: number;
}

export interface GenerateMessageResult {
  subject?: string;
  body: string;
}

export interface EvaluateResponseInput {
  originalMessage?: string;
  response: string;
  goal?: string;
}

export interface EvaluateResponseResult {
  score: number;
  category: LeadCategory;
  summary: string;
  nextAction: string;
}

export interface ImproveTextInput {
  text: string;
  goal?: string;
  tone?: string;
  maxLength?: number;
}

export interface ImproveTextResult {
  text: string;
}

export interface ClassifyLeadInput {
  message: string;
  context?: string;
}

export interface ClassifyLeadResult {
  category: LeadCategory;
  confidence: number;
  reason: string;
}
