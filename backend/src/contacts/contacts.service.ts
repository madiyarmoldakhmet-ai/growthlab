import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthScope } from '../common/types/auth-scope';
import { PrismaService } from '../prisma.service';
import { Contact, ContactImportResult, ContactInput } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

type RawRow = Record<string, unknown>;
type ContactRecord = Prisma.ContactGetPayload<Record<string, never>>;

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(scope: AuthScope): Promise<Contact[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return contacts.map((contact) => this.toEntity(contact));
  }

  async findOne(scope: AuthScope, id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: scope.organizationId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return this.toEntity(contact);
  }

  async create(scope: AuthScope, dto: CreateContactDto): Promise<Contact> {
    const input = this.normalizeInput(dto);
    const duplicate = await this.findDuplicate(scope, input);

    if (duplicate) {
      throw new BadRequestException('Contact already exists');
    }

    const contact = await this.prisma.contact.create({
      data: this.toCreateData(scope, input),
    });

    return this.toEntity(contact);
  }

  async update(scope: AuthScope, id: string, dto: UpdateContactDto): Promise<Contact> {
    const current = await this.findOne(scope, id);
    const nextInput = this.normalizeInput({ ...current, ...dto });
    const duplicate = await this.findDuplicate(scope, nextInput, id);

    if (duplicate) {
      throw new BadRequestException('Contact already exists');
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data: this.toUpdateData(nextInput),
    });

    return this.toEntity(updated);
  }

  async remove(scope: AuthScope, id: string): Promise<void> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: scope.organizationId },
      select: { id: true },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    await this.prisma.contact.delete({ where: { id } });
  }

  async removeDuplicates(scope: AuthScope): Promise<ContactImportResult> {
    const contacts = (
      await this.prisma.contact.findMany({
        where: { organizationId: scope.organizationId },
        orderBy: { createdAt: 'asc' },
      })
    ).map((contact) => this.toEntity(contact));
    const unique = new Map<string, Contact>();
    const duplicates: string[] = [];

    for (const contact of contacts) {
      const key = this.getDeduplicationKey(contact);

      if (!key || !unique.has(key)) {
        if (key) {
          unique.set(key, contact);
        }
        continue;
      }

      duplicates.push(contact.id);
    }

    if (duplicates.length) {
      await this.prisma.contact.deleteMany({
        where: { id: { in: duplicates }, organizationId: scope.organizationId },
      });
    }

    return {
      imported: 0,
      skippedDuplicates: duplicates.length,
      contacts: await this.findAll(scope),
    };
  }

  async importCsv(scope: AuthScope, buffer?: Buffer): Promise<ContactImportResult> {
    this.ensureFile(buffer);
    const rows = this.parseCsv(buffer!.toString('utf8'));
    return this.importRows(scope, rows, 'csv');
  }

  async importExcel(scope: AuthScope, buffer?: Buffer): Promise<ContactImportResult> {
    this.ensureFile(buffer);
    const excel = await import('exceljs');
    const workbook = new excel.Workbook();

    await workbook.xlsx.load(buffer! as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('Excel file has no sheets');
    }

    const tableRows: string[][] = [];
    worksheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      tableRows.push(values.map((value) => this.excelCellToString(value)));
    });

    const [headers = [], ...rows] = tableRows;
    const normalizedHeaders = headers.map((header) => header.trim());
    const records = rows.map((row) =>
      normalizedHeaders.reduce<RawRow>((acc, header, index) => {
        acc[header] = row[index] ?? '';
        return acc;
      }, {}),
    );

    return this.importRows(scope, records, 'excel');
  }

  private async importRows(
    scope: AuthScope,
    rows: RawRow[],
    source: string,
  ): Promise<ContactImportResult> {
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

      if (await this.findDuplicate(scope, input)) {
        skippedDuplicates += 1;
        continue;
      }

      const contact = this.toEntity(
        await this.prisma.contact.create({
          data: this.toCreateData(scope, input),
        }),
      );
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

  private async findDuplicate(
    scope: AuthScope,
    input: Partial<ContactInput>,
    exceptId?: string,
  ): Promise<Contact | undefined> {
    const inputKey = this.getDeduplicationKey(input);

    if (!inputKey) {
      return undefined;
    }

    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId: scope.organizationId,
        id: exceptId ? { not: exceptId } : undefined,
        OR: [
          input.email ? { email: input.email.toLowerCase() } : undefined,
          input.phone ? { phone: this.normalizePhone(input.phone) } : undefined,
        ].filter(Boolean) as Prisma.ContactWhereInput[],
      },
    });

    return contacts
      .map((contact) => this.toEntity(contact))
      .find((contact) => this.getDeduplicationKey(contact) === inputKey);
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

  private excelCellToString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'object') {
      const cell = value as { text?: unknown; result?: unknown; richText?: { text?: unknown }[] };

      if (cell.text !== undefined) {
        return String(cell.text);
      }

      if (cell.result !== undefined) {
        return String(cell.result);
      }

      if (Array.isArray(cell.richText)) {
        return cell.richText.map((part) => String(part.text ?? '')).join('');
      }
    }

    return String(value);
  }

  private toCreateData(scope: AuthScope, input: ContactInput): Prisma.ContactCreateInput {
    return {
      organization: { connect: { id: scope.organizationId } },
      user: { connect: { id: scope.userId } },
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      metadata: this.toMetadata(input),
    };
  }

  private toUpdateData(input: ContactInput): Prisma.ContactUpdateInput {
    return {
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      metadata: this.toMetadata(input),
    };
  }

  private toEntity(contact: ContactRecord): Contact {
    const metadata = this.readMetadata(contact.metadata);

    return {
      id: contact.id,
      firstName: contact.firstName ?? undefined,
      lastName: contact.lastName ?? undefined,
      email: contact.email ?? undefined,
      phone: contact.phone ?? undefined,
      company: contact.company ?? undefined,
      position: metadata.position,
      source: metadata.source,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }

  private toMetadata(input: Partial<ContactInput>): Prisma.InputJsonObject | undefined {
    const metadata: Record<string, string> = {};

    if (input.position) {
      metadata.position = input.position;
    }

    if (input.source) {
      metadata.source = input.source;
    }

    return Object.keys(metadata).length ? metadata : undefined;
  }

  private readMetadata(value: Prisma.JsonValue): Pick<Contact, 'position' | 'source'> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const metadata = value as Record<string, unknown>;

    return {
      position: this.clean(metadata.position),
      source: this.clean(metadata.source),
    };
  }
}
