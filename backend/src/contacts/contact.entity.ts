import { ContactSource, ContactStatus, VerificationStatus } from '@prisma/client';

export interface Contact {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  phone?: string;
  source: ContactSource;
  status: ContactStatus;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactImportResult {
  imported: number;
  skippedDuplicates: number;
  skippedNoEmail: number;
}
