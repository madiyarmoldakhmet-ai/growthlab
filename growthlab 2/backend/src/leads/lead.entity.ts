import { LeadSource, LeadStatus, VerificationStatus } from '@prisma/client';

export interface Lead {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadImportResult {
  imported: number;
  skippedDuplicates: number;
  skippedNoEmail: number;
}
