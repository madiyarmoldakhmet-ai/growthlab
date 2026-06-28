/**
 * Tenant + owner scope derived from the authenticated user.
 * Every data-access method must filter by organizationId for multi-tenant isolation.
 */
export interface AuthScope {
  organizationId: string;
  userId: string;
}
