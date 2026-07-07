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

type ContactRecord = Prisma.ContactGetPayload<Record<string, never>>;

export interface VerifyContactResult {
  contactId: string;
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

  /** Verify one contact. Cached: skips the API if already verified unless force=true. */
  async verifyContact(scope: AuthScope, contactId: string, force = false): Promise<VerifyContactResult> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId: scope.organizationId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }
    if (!contact.email) {
      throw new BadRequestException('Contact has no email to verify');
    }

    if (!force && contact.verificationStatus !== 'unverified') {
      return { contactId: contact.id, status: contact.verificationStatus, cached: true };
    }

    const result = await this.verifier.verify(contact.email);
    await this.applyResult(contact, result);

    return { contactId: contact.id, status: result.status, subStatus: result.subStatus, cached: false };
  }

  /**
   * Verify a batch of not-yet-verified contacts. The `verificationStatus = unverified`
   * filter is the cache: already-verified contacts are never re-checked (no double spend).
   */
  async verifyPending(scope: AuthScope, limit = DEFAULT_BATCH): Promise<VerifyBatchResult> {
    const take = Math.min(limit || DEFAULT_BATCH, MAX_BATCH);
    const contacts = await this.prisma.contact.findMany({
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

    for (const contact of contacts) {
      if (!contact.email) {
        skipped += 1;
        continue;
      }

      // TODO(Ф6): enqueue one verification job per contact (BullMQ) instead of this sync loop.
      try {
        const result = await this.verifier.verify(contact.email);
        await this.applyResult(contact, result);
        byStatus[result.status] = (byStatus[result.status] ?? 0) + 1;
        processed += 1;
      } catch (error) {
        this.logger.warn(
          `Verification failed for contact ${contact.id}: ${this.errorMessage(error)}`,
        );
        skipped += 1;
      }
    }

    // TODO(Ф7): record verification COGS (processed × per-credit cost) for funnel analytics.
    return { processed, skipped, byStatus };
  }

  private async applyResult(contact: ContactRecord, result: VerificationResult): Promise<void> {
    await this.prisma.contact.update({
      where: { id: contact.id },
      data: {
        verificationStatus: result.status,
        verifiedAt: new Date(),
        metadata: this.mergeVerification(contact.metadata, result),
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
