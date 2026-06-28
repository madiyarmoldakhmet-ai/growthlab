import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import { AppConfiguration } from '../config/configuration';
import { GmailService } from '../gmail/gmail.service';
import { ChannelSender, OutboundEmail, SendResult } from './channel-sender.interface';

@Injectable()
export class EmailSender implements ChannelSender {
  readonly channelType: ChannelType = 'email';
  private readonly logger = new Logger(EmailSender.name);

  constructor(
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly gmail: GmailService,
  ) {}

  get dryRun(): boolean {
    return this.config.get('sending.dryRun', { infer: true }) ?? true;
  }

  // TODO(Ф6): run real sends through the BullMQ queue (rate-limit + retries).
  async send(email: OutboundEmail): Promise<SendResult> {
    if (this.dryRun) {
      this.logger.log(`[DRY_RUN] would send to ${email.to}: "${email.subject}"`);
      return { status: 'dry_run', provider: 'gmail' };
    }

    try {
      const result = await this.gmail.sendEmail(email);
      return { status: 'sent', provider: 'gmail', providerMessageId: result.providerMessageId };
    } catch (error) {
      return {
        status: 'failed',
        provider: 'gmail',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
