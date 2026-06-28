import { BadRequestException, Injectable } from '@nestjs/common';
import { LeadSource, Prisma } from '@prisma/client';
import { parseCsv, pickField } from '../common/csv/csv.util';
import { cleanString, normalizeEmail, normalizePhone } from '../common/normalize.util';
import { AuthScope } from '../common/types/auth-scope';
import { PrismaService } from '../prisma.service';
import { ApolloAdapter } from './lead-sources/apollo.adapter';
import { LeadCandidate, LeadSearchQuery } from './lead-sources/lead-source.interface';
import { Lead, LeadImportResult } from './lead.entity';

type LeadRecord = Prisma.LeadGetPayload<Record<string, never>>;

interface NormalizedCandidate {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apollo: ApolloAdapter,
  ) {}

  async findAll(scope: AuthScope): Promise<Lead[]> {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toEntity(lead));
  }

  async importCsv(scope: AuthScope, buffer?: Buffer): Promise<LeadImportResult> {
    if (!buffer?.length) {
      throw new BadRequestException('File is required');
    }

    const rows = parseCsv(buffer.toString('utf8'));
    const candidates = rows.map((row) => this.rowToCandidate(row));
    return this.ingest(scope, 'csv', candidates);
  }

  async searchApollo(scope: AuthScope, query: LeadSearchQuery): Promise<LeadImportResult> {
    const candidates = await this.apollo.search(query);
    return this.ingest(scope, 'apollo', candidates);
  }

  /**
   * Normalizes candidates, requires an email, dedupes within the batch and against
   * existing org leads, then bulk-inserts. createMany(skipDuplicates) is the DB-level
   * backstop against the (organizationId, email) unique under concurrent ingests.
   */
  async ingest(
    scope: AuthScope,
    source: LeadSource,
    candidates: LeadCandidate[],
  ): Promise<LeadImportResult> {
    let skippedNoEmail = 0;
    let skippedDuplicates = 0;

    const byEmail = new Map<string, NormalizedCandidate>();
    for (const candidate of candidates) {
      const email = normalizeEmail(candidate.email);
      if (!email) {
        skippedNoEmail += 1;
        continue;
      }
      if (byEmail.has(email)) {
        skippedDuplicates += 1;
        continue;
      }
      byEmail.set(email, {
        email,
        firstName: cleanString(candidate.firstName),
        lastName: cleanString(candidate.lastName),
        company: cleanString(candidate.company),
        position: cleanString(candidate.position),
        phone: normalizePhone(candidate.phone),
        metadata: candidate.metadata,
      });
    }

    if (byEmail.size === 0) {
      return { imported: 0, skippedDuplicates, skippedNoEmail };
    }

    const emails = [...byEmail.keys()];
    const existing = await this.prisma.lead.findMany({
      where: { organizationId: scope.organizationId, email: { in: emails } },
      select: { email: true },
    });
    for (const { email } of existing) {
      if (email && byEmail.delete(email)) {
        skippedDuplicates += 1;
      }
    }

    const toCreate = [...byEmail.values()];
    if (toCreate.length === 0) {
      return { imported: 0, skippedDuplicates, skippedNoEmail };
    }

    const result = await this.prisma.lead.createMany({
      data: toCreate.map((candidate) => ({
        organizationId: scope.organizationId,
        source,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        company: candidate.company,
        position: candidate.position,
        phone: candidate.phone,
        metadata: candidate.metadata
          ? (candidate.metadata as Prisma.InputJsonValue)
          : undefined,
      })),
      skipDuplicates: true,
    });

    // Anything skipDuplicates dropped (a concurrent insert) counts as a duplicate too.
    skippedDuplicates += toCreate.length - result.count;

    return { imported: result.count, skippedDuplicates, skippedNoEmail };
  }

  private rowToCandidate(row: Record<string, unknown>): LeadCandidate {
    return {
      email: pickField(row, ['email', 'e-mail', 'mail', 'pochta']),
      firstName: pickField(row, ['firstName', 'first_name', 'name', 'imya']),
      lastName: pickField(row, ['lastName', 'last_name', 'surname', 'familiya']),
      company: pickField(row, ['company', 'organization', 'kompaniya']),
      position: pickField(row, ['position', 'title', 'jobTitle', 'dolzhnost']),
      phone: pickField(row, ['phone', 'phoneNumber', 'phone_number', 'telefon']),
    };
  }

  private toEntity(lead: LeadRecord): Lead {
    return {
      id: lead.id,
      email: lead.email ?? undefined,
      firstName: lead.firstName ?? undefined,
      lastName: lead.lastName ?? undefined,
      company: lead.company ?? undefined,
      position: lead.position ?? undefined,
      phone: lead.phone ?? undefined,
      source: lead.source,
      status: lead.status,
      verificationStatus: lead.verificationStatus,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }
}
