import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { google, gmail_v1 } from 'googleapis';
import { SendGmailDto } from './dto/send-gmail.dto';
import { SyncGmailRepliesDto } from './dto/sync-gmail-replies.dto';
import { UpsertGmailOAuthDto } from './dto/upsert-gmail-oauth.dto';
import {
  GmailReplySyncResult,
  GmailSendResult,
  GmailStatus,
} from './entities/gmail-message.entity';
import { GmailPrismaService } from './gmail-prisma.service';

const GMAIL_CHANNEL = 'gmail';
const OAUTH_SETTING_KEY = 'gmail.oauth';
const MESSAGE_SETTING_PREFIX = 'gmail.message.';
const DEFAULT_REPLY_QUERY = 'in:inbox newer_than:30d';

interface GmailOAuthMarker {
  configuredAt?: string;
  authorizedEmail?: string;
  note?: string;
}

interface GmailEnvConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  refreshToken: string;
}

interface GoogleApiErrorLike {
  code?: number;
  status?: number;
  response?: {
    status?: number;
  };
}

interface LegacyGmailOAuthSetting {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  refreshToken?: string;
  accessToken?: string;
}

interface StoredGmailMessage {
  messageId: string;
  gmailMessageId?: string | null;
  threadId?: string | null;
  rfcMessageId: string;
  to: string;
  subject: string;
  sentAt: string;
}

@Injectable()
export class GmailService {
  constructor(private readonly prisma: GmailPrismaService) {}

  async upsertOAuth(dto: UpsertGmailOAuthDto): Promise<GmailStatus> {
    this.getEnvConfig();

    const next: GmailOAuthMarker = {
      configuredAt: new Date().toISOString(),
      authorizedEmail: dto.authorizedEmail,
      note: dto.note,
    };

    await this.prisma.setting.upsert({
      where: { userId_key: { userId: dto.userId, key: OAUTH_SETTING_KEY } },
      create: { userId: dto.userId, key: OAUTH_SETTING_KEY, value: this.toJsonObject(next) },
      update: { value: this.toJsonObject(next) },
    });

    return this.getStatus(dto.userId);
  }

  async getStatus(userId: string): Promise<GmailStatus> {
    const configured = this.isEnvConfigured();
    const marker = await this.getOAuthMarker(userId);

    return {
      configured,
      userId,
      hasRefreshToken: configured,
      hasAccessToken: false,
      authorizedEmail: marker.authorizedEmail,
      source: configured ? 'env' : 'missing_env',
    };
  }

  async send(dto: SendGmailDto): Promise<GmailSendResult> {
    const message = await this.prisma.message.create({
      data: {
        userId: dto.userId,
        campaignId: dto.campaignId,
        contactId: dto.contactId,
        channel: GMAIL_CHANNEL,
        subject: dto.subject,
        body: dto.body,
        status: 'queued',
      },
    });

    try {
      const gmail = await this.getGmailClient(dto.userId);
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const rfcMessageId = `<growthlab-${message.id}@gmail.growthlab.local>`;
      const raw = this.createRawEmail({
        from: profile.data.emailAddress,
        to: dto.to,
        cc: dto.cc,
        bcc: dto.bcc,
        subject: dto.subject,
        body: dto.body,
        rfcMessageId,
        internalMessageId: message.id,
      });

      const sent = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      const sentAt = new Date();

      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'sent', sentAt },
      });

      await this.storeGmailMessage(dto.userId, {
        messageId: message.id,
        gmailMessageId: sent.data.id ?? null,
        threadId: sent.data.threadId ?? null,
        rfcMessageId,
        to: dto.to,
        subject: dto.subject,
        sentAt: sentAt.toISOString(),
      });

      return {
        id: message.id,
        gmailMessageId: sent.data.id ?? undefined,
        threadId: sent.data.threadId ?? undefined,
        status: 'sent',
        sentAt,
      };
    } catch (error) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'failed' },
      });

      throw this.toGmailError(error);
    }
  }

  async syncReplies(dto: SyncGmailRepliesDto): Promise<GmailReplySyncResult> {
    try {
      const gmail = await this.getGmailClient(dto.userId);
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: dto.query ?? DEFAULT_REPLY_QUERY,
        maxResults: dto.maxResults ?? 25,
      });
      const messages = response.data.messages ?? [];
      let created = 0;
      let skipped = 0;

      for (const item of messages) {
        if (!item.id) {
          skipped += 1;
          continue;
        }

        const full = await gmail.users.messages.get({
          userId: 'me',
          id: item.id,
          format: 'full',
        });
        const stored = await this.findOriginalMessage(dto.userId, full.data);

        if (!stored) {
          skipped += 1;
          continue;
        }

        const exists = await this.responseExists(item.id);
        if (exists) {
          skipped += 1;
          continue;
        }

        const original = await this.prisma.message.findUnique({
          where: { id: stored.messageId },
        });
        if (!original) {
          skipped += 1;
          continue;
        }

        await this.prisma.response.create({
          data: {
            messageId: original.id,
            contactId: original.contactId,
            campaignId: original.campaignId,
            body: this.extractBody(full.data),
            metadata: this.toJsonObject({
              gmailMessageId: item.id,
              threadId: full.data.threadId,
              subject: this.header(full.data, 'subject'),
              from: this.header(full.data, 'from'),
              receivedAt: this.gmailInternalDate(full.data),
            }),
          },
        });
        await this.prisma.message.update({
          where: { id: original.id },
          data: { status: 'delivered' },
        });
        created += 1;
      }

      return { scanned: messages.length, created, skipped };
    } catch (error) {
      throw this.toGmailError(error);
    }
  }

  private async getGmailClient(userId: string) {
    const auth = await this.getAuthClient(userId);
    return google.gmail({ version: 'v1', auth });
  }

  private async getAuthClient(userId: string) {
    const env = this.getEnvConfig();

    const client = new google.auth.OAuth2(env.clientId, env.clientSecret, env.redirectUri);
    client.setCredentials({
      refresh_token: env.refreshToken,
    });

    return client;
  }

  private async getOAuthMarker(userId: string): Promise<Partial<GmailOAuthMarker>> {
    const setting = await this.prisma.setting.findUnique({
      where: { userId_key: { userId, key: OAUTH_SETTING_KEY } },
    });

    const value = this.asObject<GmailOAuthMarker & LegacyGmailOAuthSetting>(setting?.value);

    return {
      configuredAt: value.configuredAt,
      authorizedEmail: value.authorizedEmail,
      note: value.note,
    };
  }

  private async storeGmailMessage(userId: string, value: StoredGmailMessage) {
    const key = `${MESSAGE_SETTING_PREFIX}${value.messageId}`;
    await this.prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value: this.toJsonObject(value) },
      update: { value: this.toJsonObject(value) },
    });
  }

  private async findOriginalMessage(userId: string, message: gmail_v1.Schema$Message) {
    const inReplyTo = this.header(message, 'in-reply-to');
    const references = this.header(message, 'references');
    const threadId = message.threadId;
    const settings = await this.prisma.setting.findMany({
      where: {
        userId,
        key: { startsWith: MESSAGE_SETTING_PREFIX },
      },
    });

    for (const setting of settings) {
      const stored = this.asObject<StoredGmailMessage>(setting.value);
      if (!this.isStoredGmailMessage(stored)) {
        continue;
      }
      if (
        (stored.rfcMessageId && this.referencesMessage(references, stored.rfcMessageId)) ||
        (stored.rfcMessageId && inReplyTo === stored.rfcMessageId) ||
        (stored.threadId && threadId === stored.threadId)
      ) {
        return stored;
      }
    }

    return undefined;
  }

  private async responseExists(gmailMessageId: string) {
    const response = await this.prisma.response.findFirst({
      where: {
        metadata: {
          path: ['gmailMessageId'],
          equals: gmailMessageId,
        },
      },
    });

    return Boolean(response);
  }

  private createRawEmail(input: {
    from?: string | null;
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    rfcMessageId: string;
    internalMessageId: string;
  }) {
    const headers = [
      ['From', input.from ?? 'me'],
      ['To', input.to],
      ['Subject', this.encodeHeader(input.subject)],
      ['Message-ID', input.rfcMessageId],
      ['X-GrowthLab-Message-Id', input.internalMessageId],
      ['MIME-Version', '1.0'],
      ['Content-Type', 'text/plain; charset="UTF-8"'],
      ['Content-Transfer-Encoding', 'base64'],
    ];

    if (input.cc?.length) {
      headers.splice(1, 0, ['Cc', input.cc.join(', ')]);
    }
    if (input.bcc?.length) {
      headers.splice(1, 0, ['Bcc', input.bcc.join(', ')]);
    }

    const message = [
      ...headers.map(([key, value]) => `${key}: ${value}`),
      '',
      Buffer.from(input.body, 'utf8').toString('base64'),
    ].join('\r\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private extractBody(message: gmail_v1.Schema$Message): string {
    const textPart = this.findMimePart(message.payload, 'text/plain');
    const htmlPart = this.findMimePart(message.payload, 'text/html');
    const data = textPart?.body?.data ?? htmlPart?.body?.data ?? message.snippet ?? '';

    if (!data) {
      return '';
    }

    if (data === message.snippet) {
      return data;
    }

    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  }

  private findMimePart(
    part: gmail_v1.Schema$MessagePart | undefined,
    mimeType: string,
  ): gmail_v1.Schema$MessagePart | undefined {
    if (!part) {
      return undefined;
    }
    if (part.mimeType === mimeType) {
      return part;
    }

    for (const child of part.parts ?? []) {
      const found = this.findMimePart(child, mimeType);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  private header(message: gmail_v1.Schema$Message, name: string): string | undefined {
    const header = message.payload?.headers?.find(
      (item: gmail_v1.Schema$MessagePartHeader) =>
        item.name?.toLowerCase() === name.toLowerCase(),
    );

    return header?.value ?? undefined;
  }

  private gmailInternalDate(message: gmail_v1.Schema$Message) {
    if (!message.internalDate) {
      return undefined;
    }

    return new Date(Number(message.internalDate)).toISOString();
  }

  private referencesMessage(references: string | undefined, rfcMessageId: string) {
    return references?.split(/\s+/).includes(rfcMessageId) ?? false;
  }

  private encodeHeader(value: string) {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
  }

  private asObject<T extends object>(value: unknown): Partial<T> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Partial<T>;
  }

  private toGmailError(error: unknown) {
    if (error instanceof BadRequestException) {
      return error;
    }

    const status = this.googleErrorStatus(error);
    const reason = status ? `Google API request failed with status ${status}` : 'Google API request failed';

    return new ServiceUnavailableException({
      code: 'gmail_provider_unavailable',
      message: reason,
    });
  }

  private getEnvConfig(): GmailEnvConfig {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadRequestException({
        code: 'gmail_oauth_not_configured',
        message:
          'Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
      });
    }

    return { clientId, clientSecret, redirectUri, refreshToken };
  }

  private isEnvConfigured() {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN,
    );
  }

  private googleErrorStatus(error: unknown) {
    const googleError = error as GoogleApiErrorLike;
    return googleError.response?.status ?? googleError.status ?? googleError.code;
  }

  private isStoredGmailMessage(value: Partial<StoredGmailMessage>): value is StoredGmailMessage {
    return (
      typeof value.messageId === 'string' &&
      typeof value.rfcMessageId === 'string' &&
      typeof value.to === 'string' &&
      typeof value.subject === 'string' &&
      typeof value.sentAt === 'string'
    );
  }

  private toJsonObject(value: object): Prisma.JsonObject {
    return Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
    ) as Prisma.JsonObject;
  }
}
