import { Injectable } from '@nestjs/common';
import { AiService } from '../ai';
import { ContactsService } from '../contacts/contacts.service';
import { GmailService } from '../gmail';
import { PrismaService } from '../prisma.service';
import { WhatsappService } from '../whatsapp';
import { SendAdminTestDto } from './dto/send-admin-test.dto';

const DEFAULT_WHATSAPP_TO = '87471523427';
const DEFAULT_EMAIL_TO = 'libmusor@gmail.com';
const LEGACY_USER_EMAIL = 'legacy@growthlab.local';

type ChannelResult = {
  channel: 'whatsapp' | 'email';
  recipient: string;
  status: 'sent' | 'failed' | 'skipped';
  detail?: string;
};

type InboxItem = {
  id: string;
  channel: string;
  from?: string;
  contact?: string;
  campaign?: string;
  body?: string;
  receivedAt: Date | number;
  source: 'database' | 'whatsapp_memory';
};

@Injectable()
export class AdminService {
  constructor(
    private readonly aiService: AiService,
    private readonly contactsService: ContactsService,
    private readonly gmailService: GmailService,
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async getOverview() {
    const [contacts, campaigns, messages, responses, whatsappStatus] = await Promise.all([
      this.prisma.contact.count().catch(() => 0),
      this.prisma.campaign.count().catch(() => 0),
      this.prisma.message.count().catch(() => 0),
      this.prisma.response.count().catch(() => 0),
      Promise.resolve(this.whatsappService.getStatus()),
    ]);

    return {
      contacts,
      campaigns,
      messages,
      responses,
      whatsapp: whatsappStatus,
      gmailConfigured: this.isGmailConfigured(),
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    };
  }

  async getInbox() {
    const databaseItems = await this.getDatabaseInbox().catch(() => []);
    const whatsappItems = this.whatsappService.getIncomingMessages().map<InboxItem>((message) => ({
      id: message.id,
      channel: 'whatsapp',
      from: message.chatId,
      body: message.text,
      receivedAt: message.timestamp ?? Date.now(),
      source: 'whatsapp_memory',
    }));

    return {
      items: [...whatsappItems, ...databaseItems].sort(
        (left, right) => this.receivedAtMs(right.receivedAt) - this.receivedAtMs(left.receivedAt),
      ),
    };
  }

  async syncGmailReplies() {
    if (!this.isGmailConfigured()) {
      return {
        scanned: 0,
        created: 0,
        skipped: 0,
        detail: 'Google/Gmail OAuth env is not configured.',
      };
    }

    const userId = await this.getUserScope();
    return this.gmailService.syncReplies({ userId });
  }

  async sendTestDelivery(dto: SendAdminTestDto = {}) {
    const whatsappTo = dto.whatsappTo ?? DEFAULT_WHATSAPP_TO;
    const emailTo = dto.emailTo ?? DEFAULT_EMAIL_TO;
    const message = dto.message?.trim() || (await this.composeTestMessage());

    const results: ChannelResult[] = [];
    results.push(await this.sendWhatsapp(whatsappTo, message));
    results.push(await this.sendEmail(emailTo, message));

    return {
      message,
      results,
    };
  }

  async sendToContacts(dto: SendAdminTestDto = {}) {
    const message = dto.message?.trim() || (await this.composeTestMessage());
    const contacts = await this.contactsService.findAll();
    const recipients = contacts.filter((contact) => Boolean(contact.phone)).slice(0, 50);
    const results: ChannelResult[] = [];

    for (const contact of recipients) {
      results.push(await this.sendWhatsapp(contact.phone!, message));
    }

    return {
      totalContacts: contacts.length,
      eligibleContacts: recipients.length,
      message,
      results,
    };
  }

  async generateMessage(dto: {
    product?: string;
    audience?: string;
    goal?: string;
    tone?: string;
    channel?: 'whatsapp' | 'email';
  }) {
    return this.aiService.generateMessage({
      product: dto.product?.trim() || 'GrowthLab',
      audience: dto.audience?.trim() || 'potential customers',
      goal: dto.goal?.trim() || 'get a reply and offer a short call',
      tone: dto.tone?.trim() || 'friendly and concise',
      channel: dto.channel ?? 'whatsapp',
      maxLength: 450,
    });
  }

  private async composeTestMessage() {
    const fallback =
      'GrowthLab test passed. WhatsApp and email delivery check completed.';

    try {
      const generated = await this.aiService.generateMessage({
        product: 'GrowthLab',
        audience: 'project administrator',
        goal: 'briefly confirm that the delivery test passed',
        channel: 'whatsapp',
        tone: 'friendly and simple',
        context:
          'Send a short test message saying that the GrowthLab test passed.',
        maxLength: 160,
      });

      const body = generated.body?.trim();
      return body && !this.looksMojibake(body) ? body : fallback;
    } catch {
      return fallback;
    }
  }

  private async sendWhatsapp(
    recipient: string,
    message: string,
  ): Promise<ChannelResult> {
    try {
      const result = await this.whatsappService.sendMessage({
        to: recipient,
        text: message,
      });

      return {
        channel: 'whatsapp',
        recipient,
        status: result.status,
        detail: result.errorDetail ?? result.id ?? result.chatId,
      };
    } catch (error) {
      return {
        channel: 'whatsapp',
        recipient,
        status: 'failed',
        detail: this.errorMessage(error),
      };
    }
  }

  private async sendEmail(
    recipient: string,
    message: string,
  ): Promise<ChannelResult> {
    if (!this.isGmailConfigured()) {
      return {
        channel: 'email',
        recipient,
        status: 'skipped',
        detail: 'Google/Gmail OAuth env is not configured.',
      };
    }

    try {
      const userId = await this.getUserScope();
      const result = await this.gmailService.send({
        userId,
        to: recipient,
        subject: 'GrowthLab: test passed',
        body: message,
      });

      return {
        channel: 'email',
        recipient,
        status: 'sent',
        detail: result.gmailMessageId ?? result.id,
      };
    } catch (error) {
      return {
        channel: 'email',
        recipient,
        status: 'failed',
        detail: this.errorMessage(error),
      };
    }
  }

  private async getDatabaseInbox(): Promise<InboxItem[]> {
    const userId = await this.getUserScope();
    const responses = await this.prisma.response.findMany({
      where: {
        message: { userId },
      },
      include: {
        campaign: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
        message: { select: { channel: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });

    return responses.map((response) => ({
      id: response.id,
      channel: response.message.channel,
      contact: this.contactLabel(response.contact),
      campaign: response.campaign?.name,
      body: response.body,
      receivedAt: response.receivedAt,
      source: 'database',
    }));
  }

  private contactLabel(contact: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null) {
    if (!contact) {
      return undefined;
    }

    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
    return name || contact.email || contact.phone || undefined;
  }

  private async getUserScope() {
    const user = await this.prisma.user.upsert({
      where: { email: LEGACY_USER_EMAIL },
      update: {},
      create: {
        email: LEGACY_USER_EMAIL,
        passwordHash: 'legacy-local-user',
        role: 'admin',
      },
      select: { id: true },
    });

    return user.id;
  }

  private isGmailConfigured() {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN,
    );
  }

  private looksMojibake(value: string) {
    return /Р |РЎ|пїЅ/.test(value);
  }

  private receivedAtMs(value: Date | number) {
    return value instanceof Date ? value.getTime() : value;
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
