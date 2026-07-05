export type WhatsappConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr'
  | 'connected'
  | 'logged_out';

export type WhatsappMessageDirection = 'incoming' | 'outgoing';

export interface WhatsappMessageRecord {
  id: string;
  chatId: string;
  fromMe: boolean;
  direction: WhatsappMessageDirection;
  text?: string;
  timestamp?: number;
  status?: string;
  errorCode?: string;
  errorDetail?: string;
}

export interface WhatsappConnectionState {
  status: WhatsappConnectionStatus;
  qr?: string;
  connectedAt?: Date;
  lastDisconnectReason?: string;
}

export interface WhatsappSendResult {
  id?: string;
  chatId: string;
  status: 'sent' | 'failed';
  errorCode?: string;
  errorDetail?: string;
}
