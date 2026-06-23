import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WAMessage,
  WAMessageUpdate,
} from '@whiskeysockets/baileys';
import { join } from 'path';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import {
  WhatsappConnectionState,
  WhatsappMessageRecord,
  WhatsappSendResult,
} from './types/whatsapp.types';

type WhatsappSocket = ReturnType<typeof makeWASocket>;

@Injectable()
export class WhatsappService implements OnModuleDestroy {
  private socket?: WhatsappSocket;
  private connectPromise?: Promise<WhatsappConnectionState>;
  private readonly messages = new Map<string, WhatsappMessageRecord>();
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
    this.state.status = 'disconnected';
    this.state.qr = undefined;

    return this.getStatus();
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
      this.messages.set(message.key.id, {
        id: message.key.id,
        chatId,
        fromMe: true,
        direction: 'outgoing',
        text: sendMessageDto.text,
        timestamp: Number(message.messageTimestamp ?? Date.now()),
        status: 'sent',
      });
    }

    return {
      id: message?.key?.id,
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

    const authDir =
      process.env.WHATSAPP_AUTH_DIR ?? join(process.cwd(), 'storage', 'whatsapp', 'auth');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
    });

    this.socket = socket;
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
      timestamp: Number(message.messageTimestamp ?? Date.now()),
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
    this.messages.set(id, {
      id,
      chatId,
      fromMe: Boolean(update.key.fromMe),
      direction: update.key.fromMe ? 'outgoing' : 'incoming',
      text: previous?.text,
      timestamp: previous?.timestamp,
      status: String(update.update.status ?? previous?.status ?? 'updated'),
    });
  }

  private extractText(message: WAMessage): string | undefined {
    return (
      message.message?.conversation ??
      message.message?.extendedTextMessage?.text ??
      message.message?.imageMessage?.caption ??
      message.message?.videoMessage?.caption
    );
  }

  private toChatId(to: string): string {
    if (to.includes('@')) {
      return to;
    }

    const digits = to.replace(/\D/g, '');
    return `${digits}@s.whatsapp.net`;
  }

  private getDisconnectStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const output = (error as { output?: { statusCode?: number } }).output;
    return output?.statusCode;
  }
}
