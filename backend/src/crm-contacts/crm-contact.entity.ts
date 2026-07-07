export interface CrmContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmContactImportResult {
  imported: number;
  skippedDuplicates: number;
  contacts: CrmContact[];
}

export type CrmContactInput = Omit<CrmContact, 'id' | 'createdAt' | 'updatedAt'>;
