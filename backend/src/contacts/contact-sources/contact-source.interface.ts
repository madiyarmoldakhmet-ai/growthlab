import { ContactSource } from '@prisma/client';

/**
 * A normalized prospect returned by any contact source before persistence.
 * Raw provider payload (enrichment) goes into `metadata`.
 */
export interface ContactCandidate {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

/** Search/filter criteria passed to a contact source (e.g. Apollo people search). */
export interface ContactSearchQuery {
  titles?: string[];
  companies?: string[];
  locations?: string[];
  keywords?: string;
  page?: number;
  limit?: number;
}

/**
 * Adapter behind every contact source (Apollo, CSV, future providers).
 * Named *Adapter to avoid colliding with the Prisma `ContactSource` enum.
 */
export interface ContactSourceAdapter {
  /** Matches the Prisma ContactSource enum value this adapter produces. */
  readonly source: ContactSource;
  /** Whether the adapter is usable (e.g. API key configured). */
  isConfigured(): boolean;
  /** Fetch candidates from the source. Throws if not configured. */
  search(query: ContactSearchQuery): Promise<ContactCandidate[]>;
}

/** DI token for the Apollo adapter. */
export const APOLLO_ADAPTER = Symbol('APOLLO_ADAPTER');
