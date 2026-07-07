/**
 * Shared field-normalization helpers used by contacts/leads ingestion.
 * Email normalization (trim + lowercase) is the contract that keeps dedup and
 * suppression lookups deterministic regardless of import source casing.
 */
export function cleanString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const cleaned = String(value).trim();
  return cleaned || undefined;
}

export function normalizeEmail(value: unknown): string | undefined {
  return cleanString(value)?.toLowerCase();
}

export function normalizePhone(value: unknown): string | undefined {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return undefined;
  }

  return cleaned.replace(/[^\d+]/g, '');
}
