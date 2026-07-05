import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType, ContactStatus, MessageStatus, SendingAccountStatus, SendingPlatform } from '@prisma/client';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfiguration } from '../config/configuration';
import { InstagramAutomationService } from '../instagram/instagram.service';
import { PrismaService } from '../prisma.service';
import { NodemailerTransporterService } from '../common/nodemailer-transporter.service';
import { CreateCampaignDto, CreateContactDto, CreateSendingAccountDto } from './clean-mvp.dto';

/**
 * Clean MVP service: Campaign/Contact CRUD + real SMTP send + wa.me link.
 *
 * SMTP transport is inlined here (no separate gmail module) per the night
 * refactor brief: this is the single owner of outbound email for the MVP.
 */
@Injectable()
export class CleanMvpService {
  private readonly logger = new Logger(CleanMvpService.name);
  private transporter?: Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly instagram: InstagramAutomationService,
  ) {}

  // ─── Seed ────────────────────────────────────────────────────────────
  async seed(): Promise<{ client: string; campaign: string; contacts: number }> {
    let client = await this.prisma.client.findFirst({ where: { name: 'Test Client' } });
    if (!client) {
      client = await this.prisma.client.create({ data: { name: 'Test Client', industry: 'Technology' } });
    }
    let campaign = await this.prisma.campaign.findFirst({ where: { name: 'Test Campaign', clientId: client.id } });
    if (!campaign) {
      campaign = await this.prisma.campaign.create({ data: { name: 'Test Campaign', clientId: client.id, status: 'ACTIVE' } });
    }
    const samples = [
      { fullName: 'Айгерим Сапарова', email: 'aigerim.sample@gmail.com', channelType: ChannelType.GMAIL },
      { fullName: 'Дмитрий Орлов', email: 'dmitry.sample@gmail.com', channelType: ChannelType.GMAIL },
      { fullName: 'Марина Ким', email: 'marina.sample@gmail.com', channelType: ChannelType.GMAIL },
      { fullName: 'Ержан Тулегенов', phone: '77011112233', channelType: ChannelType.WHATSAPP },
      { fullName: 'Ольга Беляева', phone: '77025556677', channelType: ChannelType.WHATSAPP },
    ];
    let created = 0;
    for (const s of samples) {
      const or: any[] = [];
      if (s.email) or.push({ email: s.email });
      if (s.phone) or.push({ phone: s.phone });
      const existing = await this.prisma.contact.findFirst({ where: { campaignId: campaign.id, OR: or }, select: { id: true } });
      if (existing) continue;
      await this.prisma.contact.create({ data: { campaignId: campaign.id, fullName: s.fullName, email: s.email ?? null, phone: s.phone ?? null, channelType: s.channelType, status: ContactStatus.NEW } });
      created += 1;
    }
    return { client: client.name, campaign: campaign.name, contacts: created };
  }

  async listCampaigns() {
    const campaigns = await this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' }, include: { client: true, _count: { select: { contacts: true } } } });
    return campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status, clientName: c.client.name, contactsCount: c._count.contacts, createdAt: c.createdAt }));
  }

  async createCampaign(dto: CreateCampaignDto) {
    const clientName = dto.clientName ?? 'Test Client';
    let client = await this.prisma.client.findFirst({ where: { name: clientName } });
    if (!client) client = await this.prisma.client.create({ data: { name: clientName } });
    return this.prisma.campaign.create({ data: { name: dto.name, clientId: client.id, status: 'ACTIVE' }, include: { client: true } });
  }

  async listContacts(campaignId: string) {
    return this.prisma.contact.findMany({ where: { campaignId }, orderBy: { createdAt: 'desc' } });
  }

  async createContact(dto: CreateContactDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: dto.campaignId }, select: { id: true } });
    if (!campaign) throw new NotFoundException(`Campaign ${dto.campaignId} not found`);
    return this.prisma.contact.create({ data: { campaignId: dto.campaignId, fullName: dto.fullName, email: dto.email ?? null, phone: dto.phone ?? null, channelType: dto.channelType, status: ContactStatus.NEW } });
  }

  async listFunnelContacts() {
    // Возвращаем ВСЕ контакты (включая NEW), чтобы очередь показывала 30 ресторанов.
    return this.prisma.contact.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async sendEmail(contactId: string, text: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);
    if (contact.channelType !== ChannelType.GMAIL) throw new BadRequestException(`Contact ${contactId} channel is ${contact.channelType}, not GMAIL`);
    if (!contact.email) throw new BadRequestException(`Contact ${contactId} has no email`);
    const message = await this.prisma.message.create({ data: { contactId, channel: ChannelType.GMAIL, text, status: MessageStatus.QUEUED } });
    try {
      const info = await this.smtp().sendMail({ from: this.smtpFrom(), to: contact.email, subject: 'Сообщение от GrowthLab', text });
      await this.prisma.message.update({ where: { id: message.id }, data: { status: MessageStatus.SENT } });
      await this.prisma.contact.update({ where: { id: contactId }, data: { status: ContactStatus.SENT } });
      this.logger.log(`SMTP sent to ${contact.email}: messageId=${info.messageId ?? 'n/a'}`);
      return { messageId: message.id, providerMessageId: info.messageId ?? undefined, status: MessageStatus.SENT, to: contact.email };
    } catch (error) {
      await this.prisma.message.update({ where: { id: message.id }, data: { status: MessageStatus.FAILED } });
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP send to ${contact.email} FAILED: ${reason}`);
      throw new ServiceUnavailableException({ code: 'smtp_send_failed', message: `SMTP send failed: ${reason}` });
    }
  }

  // ─── Sending accounts (Instagram Puppeteer identities) ────────────────

  async createSendingAccount(dto: CreateSendingAccountDto) {
    const identifier = dto.identifier.replace(/^@/, '').trim();
    if (!identifier) throw new BadRequestException('identifier is required');
    // Validate that the cookies blob is parseable JSON.
    try {
      JSON.parse(dto.sessionCookies);
    } catch {
      throw new BadRequestException('sessionCookies must be valid JSON');
    }
    const account = await this.prisma.sendingAccount.create({
      data: {
        platform: SendingPlatform.INSTAGRAM,
        identifier,
        sessionCookies: dto.sessionCookies,
        status: SendingAccountStatus.ACTIVE,
      },
    });
    this.logger.log(`Saved Instagram sending account @${identifier} (${account.id})`);
    return this.serializeSendingAccount(account);
  }

  async listSendingAccounts() {
    const accounts = await this.prisma.sendingAccount.findMany({
      where: { platform: SendingPlatform.INSTAGRAM },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((a) => this.serializeSendingAccount(a));
  }

  async sendInstagram(contactId: string, text: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);
    if (contact.channelType !== ChannelType.INSTAGRAM) {
      throw new BadRequestException(`Contact ${contactId} channel is ${contact.channelType}, not INSTAGRAM`);
    }
    // The recipient's Instagram handle is stored in fullName (no phone/email needed for IG).
    const targetUsername = contact.fullName.replace(/^@/, '').trim();
    if (!targetUsername) throw new BadRequestException(`Contact ${contactId} has no Instagram username`);

    // Pick a random ACTIVE account.
    const accounts = await this.prisma.sendingAccount.findMany({
      where: { platform: SendingPlatform.INSTAGRAM, status: SendingAccountStatus.ACTIVE },
    });
    if (accounts.length === 0) {
      throw new ServiceUnavailableException({
        code: 'no_instagram_account',
        message: 'No ACTIVE Instagram sending account configured. Add one on the Accounts page.',
      });
    }
    const account = accounts[Math.floor(Math.random() * accounts.length)];

    const message = await this.prisma.message.create({
      data: { contactId, channel: ChannelType.INSTAGRAM, text, status: MessageStatus.QUEUED },
    });

    try {
      const result = await this.instagram.sendDirectMessage(
        account.identifier,
        targetUsername,
        text,
        account.sessionCookies,
      );
      await this.prisma.message.update({ where: { id: message.id }, data: { status: MessageStatus.SENT } });
      await this.prisma.contact.update({ where: { id: contactId }, data: { status: ContactStatus.SENT } });
      this.logger.log(`Instagram DM sent: @${account.identifier} -> @${targetUsername}`);
      return {
        messageId: message.id,
        status: MessageStatus.SENT,
        from: account.identifier,
        to: targetUsername,
        sentAt: result.sentAt,
      };
    } catch (error) {
      await this.prisma.message.update({ where: { id: message.id }, data: { status: MessageStatus.FAILED } });
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Instagram DM FAILED (@${account.identifier} -> @${targetUsername}): ${reason}`);
      throw new ServiceUnavailableException({
        code: 'instagram_send_failed',
        message: `Instagram send failed: ${reason}`,
      });
    }
  }

  private serializeSendingAccount(a: {
    id: string;
    platform: SendingPlatform;
    identifier: string;
    status: SendingAccountStatus;
    createdAt: Date;
  }) {
    return {
      id: a.id,
      platform: a.platform,
      identifier: a.identifier,
      status: a.status,
      createdAt: a.createdAt,
    };
  }

  async sendWhatsapp(contactId: string, text: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);
    if (contact.channelType !== ChannelType.WHATSAPP) throw new BadRequestException(`Contact ${contactId} channel is ${contact.channelType}, not WHATSAPP`);
    if (!contact.phone) throw new BadRequestException(`Contact ${contactId} has no phone`);
    const phone = this.normalizePhoneDigits(contact.phone);
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    const message = await this.prisma.message.create({ data: { contactId, channel: ChannelType.WHATSAPP, text, status: MessageStatus.SENT, waLink } });
    await this.prisma.contact.update({ where: { id: contactId }, data: { status: ContactStatus.SENT } });
    return { messageId: message.id, phone, text, link: waLink, status: MessageStatus.SENT };
  }

  private smtp(): Transporter {
    if (this.transporter) return this.transporter;
    const smtp = this.config.get('smtp', { infer: true });
    if (!smtp.configured) {
      throw new ServiceUnavailableException({ code: 'smtp_not_configured', message: 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.' });
    }
    this.transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } });
    return this.transporter;
  }

  private smtpFrom(): string {
    const smtp = this.config.get('smtp', { infer: true });
    return `${smtp.fromName} <${smtp.user}>`;
  }

  normalizePhoneDigits(value: string): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
    return digits;
  }
}