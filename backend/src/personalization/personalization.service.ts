import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppConfiguration } from '../config/configuration';
import { AuthScope } from '../common/types/auth-scope';
import { PrismaService } from '../prisma.service';
import {
  isSendable,
  SENDABLE_VERIFICATION_STATUSES,
} from '../verification/email-verifier.interface';
import { OpenAiAdapter } from './llm/openai.adapter';
import { checkEmailQuality } from './quality.util';

type LeadRecord = Prisma.LeadGetPayload<Record<string, never>>;

interface GeneratedEmail {
  subject: string;
  body: string;
  followUp?: string;
}

export interface PersonalizationResult {
  messageId: string;
  leadId: string;
  subject: string;
  body: string;
  followUp?: string;
  qualityFlags: string[];
  fallback: boolean;
  totalTokens: number;
}

export interface PersonalizeBatchResult {
  generated: number;
  skipped: number;
  totalTokens: number;
}

const DEFAULT_BATCH = 25;
const MAX_BATCH = 200;

@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: OpenAiAdapter,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async generateForLead(scope: AuthScope, leadId: string): Promise<PersonalizationResult> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: scope.organizationId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }
    if (!isSendable(lead.verificationStatus)) {
      throw new BadRequestException({
        code: 'lead_not_sendable',
        message: `Lead verification status "${lead.verificationStatus}" is not sendable.`,
      });
    }

    return this.personalize(scope, lead);
  }

  /**
   * Personalize sendable leads that don't have a message yet.
   * The verification gate + "no existing message" filter prevent re-generation.
   */
  async generatePending(scope: AuthScope, limit = DEFAULT_BATCH): Promise<PersonalizeBatchResult> {
    const take = Math.min(limit || DEFAULT_BATCH, MAX_BATCH);
    const leads = await this.prisma.lead.findMany({
      where: {
        organizationId: scope.organizationId,
        verificationStatus: { in: SENDABLE_VERIFICATION_STATUSES },
        messages: { none: {} },
      },
      orderBy: { createdAt: 'asc' },
      take,
    });

    let generated = 0;
    let skipped = 0;
    let totalTokens = 0;

    for (const lead of leads) {
      // TODO(Ф6): enqueue one personalization job per lead (BullMQ) instead of a sync loop.
      try {
        const result = await this.personalize(scope, lead);
        generated += 1;
        totalTokens += result.totalTokens;
      } catch (error) {
        this.logger.warn(`Personalization failed for lead ${lead.id}: ${this.errorMessage(error)}`);
        skipped += 1;
      }
    }

    return { generated, skipped, totalTokens };
  }

  private async personalize(scope: AuthScope, lead: LeadRecord): Promise<PersonalizationResult> {
    const personalization = this.config.get('personalization', { infer: true });

    const result = await this.llm.completeJson<GeneratedEmail>(
      {
        system: personalization.systemPrompt,
        user: this.buildUserPrompt(lead),
      },
      this.fallbackEmail(lead),
    );

    const subject = (result.data.subject ?? '').trim();
    const aiBody = (result.data.body ?? '').trim();
    const followUp = result.data.followUp?.trim() || undefined;

    const quality = checkEmailQuality(subject, aiBody, personalization.maxBodyLength);
    if (!quality.ok) {
      throw new BadRequestException({
        code: 'generation_quality_failed',
        message: `Generated email failed quality checks: ${quality.flags.join(', ')}`,
      });
    }

    // Build the mandatory footer with a per-message unsubscribe token.
    const unsubscribeToken = randomUUID();
    const body = `${aiBody}\n\n${this.buildFooter(unsubscribeToken)}`;

    const message = await this.prisma.message.create({
      data: {
        organizationId: scope.organizationId,
        leadId: lead.id,
        channel: 'email',
        subject,
        body,
        status: 'queued',
        step: 0,
        unsubscribeToken,
        metadata: {
          personalization: {
            followUp: followUp ?? null,
            qualityFlags: quality.flags,
            spamTriggers: quality.spamTriggers,
            model: result.model,
            fallback: result.fallback,
          },
        } as Prisma.InputJsonValue,
      },
    });

    await this.recordAiRequest(scope, lead.id, message.id, result);

    return {
      messageId: message.id,
      leadId: lead.id,
      subject,
      body,
      followUp,
      qualityFlags: quality.flags,
      fallback: result.fallback,
      totalTokens: result.usage.totalTokens,
    };
  }

  private async recordAiRequest(
    scope: AuthScope,
    leadId: string,
    messageId: string,
    result: { model: string; fallback: boolean; usage: { promptTokens: number; completionTokens: number; totalTokens: number } },
  ): Promise<void> {
    // COGS source for Ф7 analytics: token spend per org over time.
    await this.prisma.aiRequest.create({
      data: {
        organizationId: scope.organizationId,
        operation: 'personalize',
        provider: this.llm.provider,
        model: result.model,
        status: result.fallback ? 'fallback' : 'success',
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        leadId,
        messageId,
      },
    });
  }

  private buildUserPrompt(lead: LeadRecord): string {
    const personalization = this.config.get('personalization', { infer: true });
    return [
      `Продукт/оффер: ${personalization.product}`,
      `Тон: ${personalization.tone}`,
      lead.firstName ? `Имя лида: ${lead.firstName}` : null,
      lead.lastName ? `Фамилия лида: ${lead.lastName}` : null,
      lead.company ? `Компания: ${lead.company}` : null,
      lead.position ? `Должность: ${lead.position}` : null,
      `Максимальная длина тела письма: ${personalization.maxBodyLength} символов.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildFooter(unsubscribeToken: string): string {
    const personalization = this.config.get('personalization', { infer: true });
    const baseUrl = this.config.get('appPublicUrl', { infer: true });
    const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`;

    const lines: string[] = [];
    const who = [personalization.senderName, personalization.senderCompany]
      .filter(Boolean)
      .join(', ');
    if (who) lines.push(who);
    if (personalization.senderAddress) lines.push(personalization.senderAddress);
    lines.push(`Отписаться: ${unsubscribeUrl}`);

    return `—\n${lines.join('\n')}`;
  }

  private fallbackEmail(lead: LeadRecord): GeneratedEmail {
    const personalization = this.config.get('personalization', { infer: true });
    const name = lead.firstName ? `${lead.firstName}, ` : '';
    const company = lead.company ? ` для ${lead.company}` : '';
    return {
      subject: `${personalization.product}${company}`.slice(0, 120),
      body: `${name}здравствуйте! Хотим коротко рассказать про ${personalization.product} и узнать, актуально ли это для вас. Если да — подскажите удобное время для короткого созвона.`,
      followUp: `${name}поднимаю предыдущее письмо — возможно, оно затерялось. Подскажите, актуально ли обсудить ${personalization.product}?`,
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
