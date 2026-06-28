import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthScope } from '../common/types/auth-scope';
import { PrismaService } from '../prisma.service';
import { VerificationResult } from './email-verifier.interface';
import { ZeroBounceAdapter } from './zerobounce.adapter';

type LeadRecord = Prisma.LeadGetPayload<Record<string, never>>;

export interface VerifyLeadResult {
  leadId: string;
  status: string;
  subStatus?: string;
  cached: boolean;
}

export interface VerifyBatchResult {
  processed: number;
  skipped: number;
  byStatus: Record<string, number>;
}

const DEFAULT_BATCH = 50;
const MAX_BATCH = 500;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verifier: ZeroBounceAdapter,
  ) {}

  /** Verify one lead. Cached: skips the API if already verified unless force=true. */
  async verifyLead(scope: AuthScope, leadId: string, force = false): Promise<VerifyLeadResult> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: scope.organizationId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }
    if (!lead.email) {
      throw new BadRequestException('Lead has no email to verify');
    }

    if (!force && lead.verificationStatus !== 'unverified') {
      return { leadId: lead.id, status: lead.verificationStatus, cached: true };
    }

    const result = await this.verifier.verify(lead.email);
    await this.applyResult(lead, result);

    return { leadId: lead.id, status: result.status, subStatus: result.subStatus, cached: false };
  }

  /**
   * Verify a batch of not-yet-verified leads. The `verificationStatus = unverified`
   * filter is the cache: already-verified leads are never re-checked (no double spend).
   */
  async verifyPending(scope: AuthScope, limit = DEFAULT_BATCH): Promise<VerifyBatchResult> {
    const take = Math.min(limit || DEFAULT_BATCH, MAX_BATCH);
    const leads = await this.prisma.lead.findMany({
      where: {
        organizationId: scope.organizationId,
        verificationStatus: 'unverified',
        email: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      take,
    });

    const byStatus: Record<string, number> = {};
    let processed = 0;
    let skipped = 0;

    for (const lead of leads) {
      if (!lead.email) {
        skipped += 1;
        continue;
      }

      // TODO(Ф6): enqueue one verification job per lead (BullMQ) instead of this sync loop.
      try {
        const result = await this.verifier.verify(lead.email);
        await this.applyResult(lead, result);
        byStatus[result.status] = (byStatus[result.status] ?? 0) + 1;
        processed += 1;
      } catch (error) {
        this.logger.warn(
          `Verification failed for lead ${lead.id}: ${this.errorMessage(error)}`,
        );
        skipped += 1;
      }
    }

    // TODO(Ф7): record verification COGS (processed × per-credit cost) for funnel analytics.
    return { processed, skipped, byStatus };
  }

  private async applyResult(lead: LeadRecord, result: VerificationResult): Promise<void> {
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        verificationStatus: result.status,
        verifiedAt: new Date(),
        metadata: this.mergeVerification(lead.metadata, result),
      },
    });
  }

  private mergeVerification(
    existing: Prisma.JsonValue,
    result: VerificationResult,
  ): Prisma.InputJsonValue {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};

    return {
      ...base,
      verification: {
        provider: this.verifier.provider,
        status: result.status,
        subStatus: result.subStatus ?? null,
        at: new Date().toISOString(),
      },
    } as Prisma.InputJsonValue;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
