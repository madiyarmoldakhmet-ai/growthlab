import { ChannelType } from '@prisma/client';

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}

export type SendStatus = 'sent' | 'dry_run' | 'failed';

export interface SendResult {
  status: SendStatus;
  provider: string;
  providerMessageId?: string;
  reason?: string;
}

/** Adapter behind a delivery channel (email now; TG/WhatsApp official APIs later). */
export interface ChannelSender {
  readonly channelType: ChannelType;
  /** When true, send() never contacts the provider. */
  readonly dryRun: boolean;
  send(email: OutboundEmail): Promise<SendResult>;
}

export const CHANNEL_SENDER = Symbol('CHANNEL_SENDER');
