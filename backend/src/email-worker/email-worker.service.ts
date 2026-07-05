import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType, ContactStatus, MessageStatus } from '@prisma/client';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfiguration } from '../config/configuration';
import { PrismaService } from '../prisma.service';

/**
 * EmailWorkerService
 *
 * Фоновый воркер для массовой email-рассылки через Gmail SMTP.
 * Создаёт собственный nodemailer transporter из ConfigService (без зависимости
 * от NodemailerTransporterService).
 *
 * NOTE: этот воркер не запускается автоматически. Вызовите startMassEmailWorker()
 * вручную, если нужна массовая рассылка.
 */
@Injectable()
export class EmailWorkerService {
  private readonly logger = new Logger(EmailWorkerService.name);
  private transporter?: Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  /** Возвращает SMTP transporter, создавая его лениво из .env. */
  private smtp(): Transporter {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT ?? '465', 10);
    const user = process.env.SMTP_USER ?? '';
    const pass = process.env.SMTP_PASS ?? '';
    if (!user || !pass) {
      throw new Error('SMTP_USER / SMTP_PASS не заданы в .env — email-воркер не может отправлять письма.');
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  private smtpFrom(): string {
    const fromName = process.env.SMTP_FROM_NAME ?? process.env.SENDER_NAME ?? 'GrowthLab';
    const user = process.env.SMTP_USER ?? '';
    return `${fromName} <${user}>`;
  }

  /**
   * Запускает фоновый воркер массовой email-рассылки.
   */
  startMassEmailWorker(): void {
    this.logger.log('📧 Email Worker запущен. Начинаю массовую рассылку...');

    const runWorker = async () => {
      while (true) {
        try {
          const contact = await this.prisma.contact.findFirst({
            where: { status: ContactStatus.NEW, channelType: ChannelType.GMAIL },
            orderBy: { createdAt: 'asc' },
          });

          if (!contact) {
            this.logger.log('📧 Email рассылка завершена — нет NEW контактов.');
            break;
          }

          if (!contact.email) {
            this.logger.warn(`📧 Контакт ${contact.fullName} (${contact.id}) без email — пропускаю.`);
            await this.prisma.contact.update({
              where: { id: contact.id },
              data: { status: ContactStatus.SENT },
            });
            continue;
          }

          const text = 'Здравствуйте! Предлагаем сотрудничество...';
          this.logger.log(`[Email Worker] Отправка письма на ${contact.email}`);

          const message = await this.prisma.message.create({
            data: {
              contactId: contact.id,
              channel: ChannelType.GMAIL,
              text,
              status: MessageStatus.QUEUED,
            },
          });

          await this.smtp().sendMail({
            from: this.smtpFrom(),
            to: contact.email,
            subject: 'Сотрудничество от GrowLab',
            text,
          });

          await this.prisma.message.update({
            where: { id: message.id },
            data: { status: MessageStatus.SENT },
          });
          await this.prisma.contact.update({
            where: { id: contact.id },
            data: { status: ContactStatus.SENT },
          });

          this.logger.log(`[Email Worker] ✅ Отправлено на ${contact.email}. Пауза 5 сек.`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`[Email Worker] Ошибка: ${msg}`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    };

    runWorker().catch((err) => {
      this.logger.error('Email Worker завершился с ошибкой:', err);
    });
  }
}