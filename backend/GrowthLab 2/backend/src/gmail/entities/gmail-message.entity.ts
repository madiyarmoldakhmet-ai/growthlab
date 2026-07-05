export type GmailMessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface GmailSendResult {
  id: string;
  gmailMessageId?: string;
  threadId?: string;
  status: GmailMessageStatus;
  sentAt?: Date;
}

export interface GmailReplySyncResult {
  scanned: number;
  created: number;
  skipped: number;
}

export interface GmailOAuthUrlResult {
  url: string;
  redirectUri?: string;
  scopes: string[];
}

export interface GmailOAuthCallbackResult {
  configured: boolean;
  authorizedEmail?: string;
  hasRefreshToken: boolean;
}

export interface GmailStatus {
  configured: boolean;
  userId: string;
  hasRefreshToken: boolean;
  hasAccessToken: boolean;
  authorizedEmail?: string;
  source: 'env' | 'missing_env';
}
