import { LeadSource } from '@prisma/client';

/**
 * A normalized prospect returned by any lead source before persistence.
 * Raw provider payload (enrichment) goes into `metadata`.
 */
export interface LeadCandidate {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

/** Search/filter criteria passed to a lead source (e.g. Apollo people search). */
export interface LeadSearchQuery {
  titles?: string[];
  companies?: string[];
  locations?: string[];
  keywords?: string;
  page?: number;
  limit?: number;
}

/**
 * Adapter behind every lead source (Apollo, CSV, future providers).
 * Named *Adapter to avoid colliding with the Prisma `LeadSource` enum.
 */
export interface LeadSourceAdapter {
  /** Matches the Prisma LeadSource enum value this adapter produces. */
  readonly source: LeadSource;
  /** Whether the adapter is usable (e.g. API key configured). */
  isConfigured(): boolean;
  /** Fetch candidates from the source. Throws if not configured. */
  search(query: LeadSearchQuery): Promise<LeadCandidate[]>;
}

/** DI token for the Apollo adapter. */
export const APOLLO_ADAPTER = Symbol('APOLLO_ADAPTER');
