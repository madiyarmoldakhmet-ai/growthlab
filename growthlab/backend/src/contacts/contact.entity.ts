export interface Contact {
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

export interface ContactImportResult {
  imported: number;
  skippedDuplicates: number;
  contacts: Contact[];
}

export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;
