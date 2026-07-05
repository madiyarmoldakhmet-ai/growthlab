import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { WAMessage, WAMessageUpdate } from '@whiskeysockets/baileys';
import { rm } from 'fs/promises';
import { join } from 'path';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import {
  WhatsappConnectionState,
  WhatsappMessageRecord,
  WhatsappSendResult,
} from './types/whatsapp.types';

type WhatsappSocket = {
  end: (error?: Error) => void;
  requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>;
  sendMessage: (chatId: string, content: { text: string }) => Promise<any>;
  ev: {
    on: (event: string, handler: (...args: any[]) => void) => void;
  };
};

type LongLike = {
  toNumber?: () => number;
};

@Injectable()
export class WhatsappService implements OnModuleDestroy {
  private socket?: WhatsappSocket;
  private connectPromise?: Promise<WhatsappConnectionState>;
  private readonly messages = new Map<string, WhatsappMessageRecord>();
  private readonly messageStatusWaiters = new Map<
    string,
    (record: WhatsappMessageRecord) => void
  >();
  private readonly state: WhatsappConnectionState = {
    status: 'disconnected',
  };

  async connect(): Promise<WhatsappConnectionState> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    if (this.socket && this.state.status === 'connected') {
      return this.getStatus();
    }

    this.connectPromise = this.createSocket();

    try {
      return await this.connectPromise;
    } finally {
      this.connectPromise = undefined;
    }
  }

  async disconnect(): Promise<WhatsappConnectionState> {
    this.socket?.end(undefined);
    this.socket = undefined;
    this.messageStatusWaiters.clear();
    this.state.status = 'disconnected';
    this.state.qr = undefined;

    return this.getStatus();
  }

  async resetSession(): Promise<WhatsappConnectionState> {
    await this.disconnect();
    await rm(this.getAuthDir(), { recursive: true, force: true });
    this.state.lastDisconnectReason = undefined;
    this.messages.clear();

    return this.connect();
  }

  async getPairingCode(phoneNumber: string): Promise<{ code: string; phoneNumber: string }> {
    if (!this.socket || ['disconnected', 'logged_out'].includes(this.state.status)) {
      await this.resetSession();
    }

    const socket = this.socket;

    if (!socket) {
      throw new ServiceUnavailableException('WhatsApp socket is not ready');
    }

    const normalizedPhoneNumber = this.normalizePhoneDigits(phoneNumber);
    const code = await socket.requestPairingCode(normalizedPhoneNumber);

    return {
      code,
      phoneNumber: normalizedPhoneNumber,
    };
  }

  getStatus(): WhatsappConnectionState {
    return { ...this.state };
  }

  getQr(): { qr?: string; status: WhatsappConnectionState['status'] } {
    return {
      qr: this.state.qr,
      status: this.state.status,
    };
  }

  async sendMessage(
    sendMessageDto: SendWhatsappMessageDto,
  ): Promise<WhatsappSendResult> {
    const socket = this.requireConnectedSocket();
    const chatId = this.toChatId(sendMessageDto.to);
    const message = await socket.sendMessage(chatId, {
      text: sendMessageDto.text,
    });

    if (message?.key?.id) {
      const record: WhatsappMessageRecord = {
        id: message.key.id,
        chatId,
        fromMe: true,
        direction: 'outgoing',
        text: sendMessageDto.text,
        timestamp: Number(message.messageTimestamp ?? Date.now()),
        status: 'sent',
      };
      this.messages.set(message.key.id, record);

      const updatedRecord = await this.waitForImmediateStatus(message.key.id, 3_000);

      if (updatedRecord?.status === 'failed') {
        return {
          id: updatedRecord.id,
          chatId: updatedRecord.chatId,
          status: 'failed',
          errorCode: updatedRecord.errorCode,
          errorDetail: updatedRecord.errorDetail,
        };
      }
    }

    return {
      id: message?.key?.id ?? undefined,
      chatId,
      status: 'sent',
    };
  }

  getMessages(): WhatsappMessageRecord[] {
    return Array.from(this.messages.values());
  }

  getIncomingMessages(): WhatsappMessageRecord[] {
    return this.getMessages().filter((message) => message.direction === 'incoming');
  }

  getMessageStatuses(): WhatsappMessageRecord[] {
    return this.getMessages().filter((message) => Boolean(message.status));
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async createSocket(): Promise<WhatsappConnectionState> {
    this.state.status = 'connecting';
    this.state.lastDisconnectReason = undefined;
    const {
      Browsers,
      default: makeWASocket,
      DisconnectReason,
      fetchLatestBaileysVersion,
      useMultiFileAuthState,
    } = await import('@whiskeysockets/baileys');

    const { state, saveCreds } = await useMultiFileAuthState(this.getAuthDir());
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      auth: state,
      browser: Browsers.windows('Chrome'),
      markOnlineOnConnect: false,
      version,
      printQRInTerminal: false,
      qrTimeout: 60_000,
      syncFullHistory: false,
    });

    this.socket = socket as unknown as WhatsappSocket;
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update) => {
      if (update.qr) {
        this.state.qr = update.qr;
        this.state.status = 'qr';
      }

      if (update.connection === 'open') {
        this.state.status = 'connected';
        this.state.qr = undefined;
        this.state.connectedAt = new Date();
        this.state.lastDisconnectReason = undefined;
      }

      if (update.connection === 'close') {
        const statusCode = this.getDisconnectStatusCode(update.lastDisconnect?.error);
        this.state.status =
          statusCode === DisconnectReason.loggedOut ? 'logged_out' : 'disconnected';
        this.state.qr = undefined;
        this.state.lastDisconnectReason = String(
          update.lastDisconnect?.error?.message ?? statusCode ?? 'unknown',
        );
        this.socket = undefined;

        if (statusCode === DisconnectReason.restartRequired) {
          void this.connect().catch((error) => {
            this.state.lastDisconnectReason =
              error instanceof Error ? error.message : 'WhatsApp restart failed';
          });
        }
      }
    });
    socket.ev.on('messages.upsert', ({ messages }) => {
      messages.forEach((message) => this.recordIncomingMessage(message));
    });
    socket.ev.on('messages.update', (updates) => {
      updates.forEach((update) => this.recordMessageStatus(update));
    });

    return this.getStatus();
  }

  private requireConnectedSocket(): WhatsappSocket {
    if (!this.socket || this.state.status !== 'connected') {
      throw new ServiceUnavailableException('WhatsApp is not connected');
    }

    return this.socket;
  }

  private getAuthDir(): string {
    return process.env.WHATSAPP_AUTH_DIR ?? join(process.cwd(), 'storage', 'whatsapp', 'auth');
  }

  private recordIncomingMessage(message: WAMessage): void {
    const id = message.key.id;
    const chatId = message.key.remoteJid;

    if (!id || !chatId) {
      return;
    }

    this.messages.set(id, {
      id,
      chatId,
      fromMe: Boolean(message.key.fromMe),
      direction: message.key.fromMe ? 'outgoing' : 'incoming',
      text: this.extractText(message),
      timestamp: this.toTimestamp(message.messageTimestamp),
      status: this.messages.get(id)?.status,
    });
  }

  private recordMessageStatus(update: WAMessageUpdate): void {
    const id = update.key.id;
    const chatId = update.key.remoteJid;

    if (!id || !chatId) {
      return;
    }

    const previous = this.messages.get(id);
    const errorCode = this.getMessageAckErrorCode(update);
    const record: WhatsappMessageRecord = {
      id,
      chatId,
      fromMe: Boolean(update.key.fromMe),
      direction: update.key.fromMe ? 'outgoing' : 'incoming',
      text: previous?.text,
      timestamp: previous?.timestamp,
      status: errorCode
        ? 'failed'
        : String(update.update.status ?? previous?.status ?? 'updated'),
      errorCode,
      errorDetail: errorCode ? `WhatsApp ack error ${errorCode}` : previous?.errorDetail,
    };

    this.messages.set(id, record);
    this.messageStatusWaiters.get(id)?.(record);
    this.messageStatusWaiters.delete(id);
  }

  private extractText(message: WAMessage): string | undefined {
    return (
      message.message?.conversation ??
      message.message?.extendedTextMessage?.text ??
      message.message?.imageMessage?.caption ??
      message.message?.videoMessage?.caption
    ) ?? undefined;
  }

  private toChatId(to: string): string {
    if (to.includes('@')) {
      return to;
    }

    const digits = this.normalizePhoneDigits(to);
    return `${digits}@s.whatsapp.net`;
  }

  private normalizePhoneDigits(to: string): string {
    const digits = to.replace(/\D/g, '');

    if (digits.length === 11 && digits.startsWith('8')) {
      return `7${digits.slice(1)}`;
    }

    return digits;
  }

  private toTimestamp(value: number | LongLike | null | undefined): number {
    if (typeof value === 'number') {
      return value;
    }

    return value?.toNumber?.() ?? Date.now();
  }

  private waitForImmediateStatus(
    id: string,
    timeoutMs: number,
  ): Promise<WhatsappMessageRecord | undefined> {
    const existing = this.messages.get(id);

    if (existing?.status === 'failed') {
      return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.messageStatusWaiters.delete(id);
        resolve(undefined);
      }, timeoutMs);

      this.messageStatusWaiters.set(id, (record) => {
        clearTimeout(timeout);
        resolve(record);
      });
    });
  }

  private getMessageAckErrorCode(update: WAMessageUpdate): string | undefined {
    const [errorCode] = update.update.messageStubParameters ?? [];

    return errorCode ? String(errorCode) : undefined;
  }

  private getDisconnectStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const output = (error as { output?: { statusCode?: number } }).output;
    return output?.statusCode;
  }
}
