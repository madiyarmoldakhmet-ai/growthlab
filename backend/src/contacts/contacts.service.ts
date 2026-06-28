import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseCsv, pickField } from '../common/csv/csv.util';
import { cleanString, normalizeEmail, normalizePhone } from '../common/normalize.util';
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
    const rows = parseCsv(buffer!.toString('utf8'));
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
        firstName: pickField(row, ['firstName', 'first_name', 'name', 'imya']),
        lastName: pickField(row, ['lastName', 'last_name', 'surname', 'familiya']),
        email: pickField(row, ['email', 'e-mail', 'mail', 'pochta']),
        phone: pickField(row, ['phone', 'phoneNumber', 'phone_number', 'telefon']),
        company: pickField(row, ['company', 'organization', 'kompaniya']),
        position: pickField(row, ['position', 'title', 'jobTitle', 'dolzhnost']),
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
      firstName: cleanString(input.firstName),
      lastName: cleanString(input.lastName),
      email: normalizeEmail(input.email),
      phone: normalizePhone(input.phone),
      company: cleanString(input.company),
      position: cleanString(input.position),
      source: cleanString(input.source),
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
          input.email ? { email: normalizeEmail(input.email) } : undefined,
          input.phone ? { phone: normalizePhone(input.phone) } : undefined,
        ].filter(Boolean) as Prisma.ContactWhereInput[],
      },
    });

    return contacts
      .map((contact) => this.toEntity(contact))
      .find((contact) => this.getDeduplicationKey(contact) === inputKey);
  }

  private getDeduplicationKey(contact: Partial<ContactInput>): string | undefined {
    if (contact.email) {
      return `email:${normalizeEmail(contact.email)}`;
    }

    if (contact.phone) {
      return `phone:${normalizePhone(contact.phone)}`;
    }

    return undefined;
  }

  private ensureFile(buffer?: Buffer): void {
    if (!buffer?.length) {
      throw new BadRequestException('File is required');
    }
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
      position: cleanString(metadata.position),
      source: cleanString(metadata.source),
    };
  }
}
