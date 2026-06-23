import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Contact, ContactImportResult, ContactInput } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

type RawRow = Record<string, unknown>;

@Injectable()
export class ContactsService {
  private readonly contacts = new Map<string, Contact>();

  findAll(): Contact[] {
    return [...this.contacts.values()];
  }

  findOne(id: string): Contact {
    const contact = this.contacts.get(id);

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  create(dto: CreateContactDto): Contact {
    const input = this.normalizeInput(dto);
    const duplicate = this.findDuplicate(input);

    if (duplicate) {
      throw new BadRequestException('Contact already exists');
    }

    const now = new Date();
    const contact: Contact = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.contacts.set(contact.id, contact);
    return contact;
  }

  update(id: string, dto: UpdateContactDto): Contact {
    const current = this.findOne(id);
    const nextInput = this.normalizeInput({ ...current, ...dto });
    const duplicate = this.findDuplicate(nextInput, id);

    if (duplicate) {
      throw new BadRequestException('Contact already exists');
    }

    const updated: Contact = {
      ...current,
      ...nextInput,
      updatedAt: new Date(),
    };

    this.contacts.set(id, updated);
    return updated;
  }

  remove(id: string): void {
    this.findOne(id);
    this.contacts.delete(id);
  }

  removeDuplicates(): ContactImportResult {
    const unique = new Map<string, Contact>();
    const duplicates: string[] = [];

    for (const contact of this.contacts.values()) {
      const key = this.getDeduplicationKey(contact);

      if (!key || !unique.has(key)) {
        if (key) {
          unique.set(key, contact);
        }
        continue;
      }

      duplicates.push(contact.id);
    }

    for (const id of duplicates) {
      this.contacts.delete(id);
    }

    return {
      imported: 0,
      skippedDuplicates: duplicates.length,
      contacts: this.findAll(),
    };
  }

  importCsv(buffer?: Buffer): ContactImportResult {
    this.ensureFile(buffer);
    const rows = this.parseCsv(buffer.toString('utf8'));
    return this.importRows(rows, 'csv');
  }

  async importExcel(buffer?: Buffer): Promise<ContactImportResult> {
    this.ensureFile(buffer);
    const xlsx = await this.loadXlsx();

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new BadRequestException('Excel file has no sheets');
    }

    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
      defval: '',
    }) as RawRow[];

    return this.importRows(rows, 'excel');
  }

  private importRows(rows: RawRow[], source: string): ContactImportResult {
    let imported = 0;
    let skippedDuplicates = 0;
    const contacts: Contact[] = [];

    for (const row of rows) {
      const input = this.normalizeInput({
        firstName: this.pick(row, ['firstName', 'first_name', 'name', 'imya']),
        lastName: this.pick(row, ['lastName', 'last_name', 'surname', 'familiya']),
        email: this.pick(row, ['email', 'e-mail', 'mail', 'pochta']),
        phone: this.pick(row, ['phone', 'phoneNumber', 'phone_number', 'telefon']),
        company: this.pick(row, ['company', 'organization', 'kompaniya']),
        position: this.pick(row, ['position', 'title', 'jobTitle', 'dolzhnost']),
        source,
      });

      if (!input.email && !input.phone) {
        continue;
      }

      if (this.findDuplicate(input)) {
        skippedDuplicates += 1;
        continue;
      }

      const contact = this.create(input);
      imported += 1;
      contacts.push(contact);
    }

    return { imported, skippedDuplicates, contacts };
  }

  private normalizeInput(input: Partial<ContactInput>): ContactInput {
    return {
      firstName: this.clean(input.firstName),
      lastName: this.clean(input.lastName),
      email: this.clean(input.email)?.toLowerCase(),
      phone: this.normalizePhone(input.phone),
      company: this.clean(input.company),
      position: this.clean(input.position),
      source: this.clean(input.source),
    };
  }

  private findDuplicate(input: Partial<ContactInput>, exceptId?: string): Contact | undefined {
    const inputKey = this.getDeduplicationKey(input);

    if (!inputKey) {
      return undefined;
    }

    return this.findAll().find((contact) => {
      if (contact.id === exceptId) {
        return false;
      }

      return this.getDeduplicationKey(contact) === inputKey;
    });
  }

  private getDeduplicationKey(contact: Partial<ContactInput>): string | undefined {
    if (contact.email) {
      return `email:${contact.email.toLowerCase()}`;
    }

    if (contact.phone) {
      return `phone:${this.normalizePhone(contact.phone)}`;
    }

    return undefined;
  }

  private parseCsv(content: string): RawRow[] {
    const rows = this.readCsvRows(content.replace(/^\uFEFF/, ''));

    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map((header) => header.trim());

    return rows.slice(1).map((row) =>
      headers.reduce<RawRow>((acc, header, index) => {
        acc[header] = row[index] ?? '';
        return acc;
      }, {}),
    );
  }

  private ensureFile(buffer?: Buffer): void {
    if (!buffer?.length) {
      throw new BadRequestException('File is required');
    }
  }

  private async loadXlsx(): Promise<any> {
    try {
      const dynamicImport = new Function('moduleName', 'return import(moduleName)');
      return await dynamicImport('xlsx');
    } catch {
      throw new BadRequestException('Excel import requires the xlsx package');
    }
  }

  private readCsvRows(content: string): string[][] {
    const rows: string[][] = [];
    const delimiter = this.detectDelimiter(content);
    let current = '';
    let row: string[] = [];
    let quoted = false;

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const next = content[index + 1];

      if (char === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === delimiter && !quoted) {
        row.push(current);
        current = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') {
          index += 1;
        }
        row.push(current);
        rows.push(row);
        current = '';
        row = [];
        continue;
      }

      current += char;
    }

    if (current || row.length) {
      row.push(current);
      rows.push(row);
    }

    return rows.filter((cells) => cells.some((cell) => cell.trim()));
  }

  private detectDelimiter(content: string): ',' | ';' {
    const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
    const commaCount = firstLine.split(',').length;
    const semicolonCount = firstLine.split(';').length;

    return semicolonCount > commaCount ? ';' : ',';
  }

  private pick(row: RawRow, keys: string[]): string | undefined {
    const normalizedEntries = new Map(
      Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value)]),
    );

    for (const key of keys) {
      const value = normalizedEntries.get(key.toLowerCase());

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private clean(value: unknown): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const cleaned = String(value).trim();
    return cleaned || undefined;
  }

  private normalizePhone(value: unknown): string | undefined {
    const cleaned = this.clean(value);

    if (!cleaned) {
      return undefined;
    }

    return cleaned.replace(/[^\d+]/g, '');
  }
}
