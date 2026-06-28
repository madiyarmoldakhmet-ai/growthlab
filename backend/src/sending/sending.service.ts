import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventType, Prisma } from '@prisma/client';
import { normalizeEmail } from '../common/normalize.util';
import { AuthScope } from '../common/types/auth-scope';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../config/configuration';
import { isSendable } from '../verification/email-verifier.interface';
import { EmailSender } from './email.sender';

type MessageWithLead = Prisma.MessageGetPayload<{ include: { lead: true } }>;
type ChannelRecord = Prisma.ChannelGetPayload<Record<string, never>>;

export type SendOutcomeStatus = 'sent' | 'dry_run' | 'failed' | 'skipped';

export interface SendOutcome {
  messageId: string;
  status: SendOutcomeStatus;
  reason?: string;
  providerMessageId?: string;
}

export interface SendBatchResult {
  sent: number;
  dryRun: number;
  skipped: number;
  failed: number;
}

export type WebhookEventType = 'delivered' | 'open' | 'bounce' | 'complaint' | 'unsubscribe';

export interface InboundWebhookEvent {
  providerMessageId?: string;
  messageId?: string;
  type: WebhookEventType;
  bounceType?: 'hard' | 'soft';
  providerEventId: string;
  occurredAt?: string;
}

export interface WebhookIngestResult {
  processed: number;
  duplicates: number;
  skipped: number;
}

const DEFAULT_BATCH = 50;
const MAX_BATCH = 500;

@Injectable()
export class SendingService {
  private readonly logger = new Logger(SendingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async sendMessage(scope: AuthScope, messageId: string): Promise<SendOutcome> {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, organizationId: scope.organizationId },
      include: { lead: true },
    });
    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }
    return this.dispatch(message);
  }

  /** Send all due queued/scheduled messages for the org (respecting limits/throttle). */
  async sendQueued(scope: AuthScope, limit = DEFAULT_BATCH): Promise<SendBatchResult> {
    const take = Math.min(limit || DEFAULT_BATCH, MAX_BATCH);
    const messages = await this.prisma.message.findMany({
      where: {
        organizationId: scope.organizationId,
        status: { in: ['queued', 'scheduled'] },
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
      include: { lead: true },
      take,
    });

    const result: SendBatchResult = { sent: 0, dryRun: 0, skipped: 0, failed: 0 };
    const throttleMs = this.config.get('sending.throttleMs', { infer: true }) ?? 0;

    for (const message of messages) {
      // TODO(Ф6): enqueue one send job per message (BullMQ rate-limit) instead of this loop.
      const outcome = await this.dispatch(message);
      if (outcome.status === 'sent') result.sent += 1;
      else if (outcome.status === 'dry_run') result.dryRun += 1;
      else if (outcome.status === 'failed') result.failed += 1;
      else result.skipped += 1;

      // Throttle only matters for real sends; never block the dry-run preview.
      if (outcome.status === 'sent' && throttleMs > 0) {
        await this.delay(throttleMs);
      }
    }

    return result;
  }

  private async dispatch(message: MessageWithLead): Promise<SendOutcome> {
    // Eligibility: only queued/scheduled messages are sendable.
    if (message.status !== 'queued' && message.status !== 'scheduled') {
      return { messageId: message.id, status: 'skipped', reason: `already_${message.status}` };
    }
    if (message.scheduledAt && message.scheduledAt > new Date()) {
      return { messageId: message.id, status: 'skipped', reason: 'scheduled_future' };
    }

    const recipient = normalizeEmail(message.lead?.email);
    if (!recipient) {
      return { messageId: message.id, status: 'skipped', reason: 'no_recipient' };
    }
    // Positive assertion: must have a lead with a sendable verification status.
    if (!message.lead || !isSendable(message.lead.verificationStatus)) {
      return { messageId: message.id, status: 'skipped', reason: 'not_sendable' };
    }
    if (await this.isSuppressed(message.organizationId, recipient)) {
      return { messageId: message.id, status: 'skipped', reason: 'suppressed' };
    }

    const fromName = this.config.get('personalization', { infer: true }).senderName || undefined;
    const email = { to: recipient, subject: message.subject ?? '', body: message.body, fromName };

    // DRY_RUN: a clean no-op preview — no channel selection, only a marker on the message.
    if (this.emailSender.dryRun) {
      await this.emailSender.send(email);
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          metadata: this.mergeMetadata(message.metadata, {
            dryRun: { at: new Date().toISOString(), to: recipient },
          }),
        },
      });
      this.logger.log(`Message ${message.id} marked dry_run (not sent)`);
      return { messageId: message.id, status: 'dry_run' };
    }

    const channel = await this.pickChannel(message.organizationId);
    if (!channel) {
      return { messageId: message.id, status: 'skipped', reason: 'no_channel_capacity' };
    }

    // Atomic claim: only the worker that flips queued/scheduled → sending proceeds to the
    // provider. Prevents double-send under retries/concurrent workers (Ф6 queue).
    const idempotencyKey = message.idempotencyKey ?? `send:${message.id}`;
    const claim = await this.prisma.message.updateMany({
      where: { id: message.id, status: { in: ['queued', 'scheduled'] } },
      data: { status: 'sending', channelId: channel.id, idempotencyKey },
    });
    if (claim.count === 0) {
      return { messageId: message.id, status: 'skipped', reason: 'already_claimed' };
    }

    const result = await this.emailSender.send(email);

    if (result.status === 'failed') {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'failed', failedAt: new Date(), failureReason: result.reason },
      });
      await this.emitEvent(message, 'failed');
      return { messageId: message.id, status: 'failed', reason: result.reason };
    }

    await this.prisma.message.update({
      where: { id: message.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        provider: result.provider,
        providerMessageId: result.providerMessageId,
      },
    });
    await this.emitEvent(message, 'sent');
    if (message.leadId) {
      await this.prisma.lead
        .update({ where: { id: message.leadId }, data: { status: 'contacted' } })
        .catch(() => undefined);
    }

    return { messageId: message.id, status: 'sent', providerMessageId: result.providerMessageId };
  }

  /**
   * Rotation + daily limit. Picks the active email mailbox with the LEAST sent today that
   * still has capacity (spreads volume for deliverability instead of bursting one identity).
   * Day boundary is UTC — keep the deploy TZ in mind. NOTE: the limit is best-effort under
   * concurrency (read-then-act); Ф6 will serialize sends per channel via the queue.
   */
  private async pickChannel(organizationId: string): Promise<ChannelRecord | null> {
    const channels = await this.prisma.channel.findMany({
      where: { organizationId, type: 'email', isActive: true },
    });
    if (channels.length === 0) {
      return null;
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const grouped = await this.prisma.message.groupBy({
      by: ['channelId'],
      where: {
        organizationId,
        channelId: { in: channels.map((channel) => channel.id) },
        sentAt: { gte: startOfDay },
      },
      _count: { _all: true },
    });
    const sentByChannel = new Map(grouped.map((row) => [row.channelId, row._count._all]));

    let best: ChannelRecord | null = null;
    let bestSent = Number.POSITIVE_INFINITY;
    for (const channel of channels) {
      const sentToday = sentByChannel.get(channel.id) ?? 0;
      if (sentToday < channel.dailyLimit && sentToday < bestSent) {
        bestSent = sentToday;
        best = channel;
      }
    }

    return best;
  }

  private async isSuppressed(organizationId: string, address: string): Promise<boolean> {
    const entry = await this.prisma.suppressionEntry.findUnique({
      where: {
        organizationId_channelType_address: {
          organizationId,
          channelType: 'email',
          address,
        },
      },
    });
    return Boolean(entry);
  }

  private async emitEvent(message: MessageWithLead, type: EventType): Promise<void> {
    await this.prisma.event.create({
      data: {
        organizationId: message.organizationId,
        type,
        channelType: 'email',
        messageId: message.id,
        leadId: message.leadId,
        campaignId: message.campaignId,
        provider: 'gmail',
        occurredAt: new Date(),
      },
    });
  }

  // ─── Inbound provider webhooks ─────────────────────────────────────────
  async ingestWebhook(
    provider: string,
    events: InboundWebhookEvent[],
  ): Promise<WebhookIngestResult> {
    const result: WebhookIngestResult = { processed: 0, duplicates: 0, skipped: 0 };

    for (const event of events) {
      const message = await this.findWebhookMessage(provider, event);
      if (!message) {
        result.skipped += 1;
        continue;
      }

      const eventType = this.mapWebhookType(event);
      try {
        await this.prisma.$transaction(async (tx) => {
          // Dedup marker + side effects commit together: a replayed webhook hits the
          // unique providerEventId (P2002) and the whole unit rolls back atomically.
          await tx.event.create({
            data: {
              organizationId: message.organizationId,
              type: eventType,
              channelType: 'email',
              messageId: message.id,
              leadId: message.leadId,
              campaignId: message.campaignId,
              provider,
              providerEventId: event.providerEventId,
              occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
            },
          });
          await this.applyWebhookSideEffects(tx, message, event, eventType);
        });
        result.processed += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          result.duplicates += 1;
          continue;
        }
        throw error;
      }
    }

    return result;
  }

  // Correlate ONLY by the globally-unique (provider, providerMessageId). The bare
  // messageId path was removed: a PK-only lookup is unscoped and would let a webhook
  // mutate another tenant's message. providerMessageId resolves to exactly one org's row.
  private async findWebhookMessage(
    provider: string,
    event: InboundWebhookEvent,
  ): Promise<MessageWithLead | null> {
    if (!event.providerMessageId) {
      return null;
    }
    return this.prisma.message.findFirst({
      where: { provider, providerMessageId: event.providerMessageId },
      include: { lead: true },
    });
  }

  private async applyWebhookSideEffects(
    tx: Prisma.TransactionClient,
    message: MessageWithLead,
    event: InboundWebhookEvent,
    eventType: EventType,
  ): Promise<void> {
    const now = event.occurredAt ? new Date(event.occurredAt) : new Date();

    if (eventType === 'delivered') {
      await tx.message.updateMany({
        where: { id: message.id, status: { in: ['sending', 'sent', 'queued', 'scheduled'] } },
        data: { status: 'delivered', deliveredAt: now },
      });
      return;
    }

    if (eventType === 'opened') {
      // First open only; never regress status.
      await tx.message.updateMany({
        where: { id: message.id, openedAt: null },
        data: { openedAt: now },
      });
      return;
    }

    if (eventType === 'hard_bounced') {
      // Monotonic guard mirrors the delivered path; bounce is terminal.
      await tx.message.updateMany({
        where: {
          id: message.id,
          status: { in: ['sending', 'sent', 'delivered', 'queued', 'scheduled'] },
        },
        data: { status: 'bounced', bouncedAt: now },
      });
      await this.suppress(tx, message, 'hard_bounce', event.providerEventId);
      return;
    }

    if (eventType === 'soft_bounced') {
      await tx.message.updateMany({ where: { id: message.id }, data: { bouncedAt: now } });
      return;
    }

    if (eventType === 'complained') {
      await this.suppress(tx, message, 'complaint', event.providerEventId);
      return;
    }

    if (eventType === 'unsubscribed') {
      await this.suppress(tx, message, 'unsubscribe', event.providerEventId);
    }
  }

  private async suppress(
    tx: Prisma.TransactionClient,
    message: MessageWithLead,
    reason: 'hard_bounce' | 'complaint' | 'unsubscribe',
    providerEventId: string,
  ): Promise<void> {
    const address = normalizeEmail(message.lead?.email);
    if (!address) {
      return;
    }

    await tx.suppressionEntry.upsert({
      where: {
        organizationId_channelType_address: {
          organizationId: message.organizationId,
          channelType: 'email',
          address,
        },
      },
      create: {
        organizationId: message.organizationId,
        channelType: 'email',
        address,
        reason,
        source: `webhook:${providerEventId}`,
        leadId: message.leadId,
        messageId: message.id,
      },
      update: { reason },
    });

    if (message.leadId) {
      await tx.lead.update({ where: { id: message.leadId }, data: { status: 'suppressed' } });
    }
  }

  private mapWebhookType(event: InboundWebhookEvent): EventType {
    switch (event.type) {
      case 'delivered':
        return 'delivered';
      case 'open':
        return 'opened';
      case 'bounce':
        return event.bounceType === 'soft' ? 'soft_bounced' : 'hard_bounced';
      case 'complaint':
        return 'complained';
      case 'unsubscribe':
        return 'unsubscribed';
      default:
        return 'failed';
    }
  }

  private mergeMetadata(
    existing: Prisma.JsonValue,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
