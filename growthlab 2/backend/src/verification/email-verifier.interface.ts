import { VerificationStatus } from '@prisma/client';

/** Verifier outcome (never 'unverified' — that's the pre-check state). */
export type VerifiedStatus = Exclude<VerificationStatus, 'unverified'>;

export interface VerificationResult {
  status: VerifiedStatus;
  /** Provider-specific detail (e.g. ZeroBounce sub_status). */
  subStatus?: string;
}

/**
 * Adapter behind every email-verification provider (ZeroBounce, future providers).
 */
export interface EmailVerifier {
  readonly provider: string;
  /** Whether the adapter is usable (e.g. API key configured). */
  isConfigured(): boolean;
  /** Verify a single email. Throws if not configured. */
  verify(email: string): Promise<VerificationResult>;
}

/**
 * Statuses considered safe to send to. Invalid/risky/unknown are excluded so the
 * send pipeline (Ф5) never mails an address that failed verification.
 */
export const SENDABLE_VERIFICATION_STATUSES: VerificationStatus[] = ['valid', 'catch_all'];

export function isSendable(status: VerificationStatus): boolean {
  return SENDABLE_VERIFICATION_STATUSES.includes(status);
}

/** DI token for the email verifier. */
export const EMAIL_VERIFIER = Symbol('EMAIL_VERIFIER');
