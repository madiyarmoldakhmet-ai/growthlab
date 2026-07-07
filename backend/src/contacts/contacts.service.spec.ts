import { ContactsService } from './contacts.service';
import { ContactCandidate } from './contact-sources/contact-source.interface';

describe('ContactsService.ingest', () => {
  const scope = { organizationId: 'org-1', userId: 'user-1' };

  function makeService(existingEmails: string[], createdCount: number) {
    const prisma = {
      contact: {
        findMany: jest.fn().mockResolvedValue(existingEmails.map((email) => ({ email }))),
        createMany: jest.fn().mockResolvedValue({ count: createdCount }),
      },
    };
    const apollo = { search: jest.fn() };
    const service = new ContactsService(prisma as never, apollo as never);
    return { service, prisma };
  }

  it('normalizes emails, dedupes within the batch and against the DB, and inserts the rest', async () => {
    const { service, prisma } = makeService(['exist@x.com'], 2);
    const candidates: ContactCandidate[] = [
      { email: 'A@X.com', firstName: 'Alice' },
      { email: 'a@x.com', firstName: 'Duplicate in batch (case-insensitive)' },
      { email: 'exist@x.com', firstName: 'Already in DB' },
      { firstName: 'No email at all' },
      { email: 'b@x.com', firstName: 'Bob' },
    ];

    const result = await service.ingest(scope, 'csv', candidates);

    expect(result.skippedNoEmail).toBe(1);
    expect(result.skippedDuplicates).toBe(2); // 1 batch dup + 1 existing in DB
    expect(result.imported).toBe(2);

    // DB lookup uses the unique normalized emails only.
    expect(prisma.contact.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', email: { in: ['a@x.com', 'exist@x.com', 'b@x.com'] } },
      select: { email: true },
    });

    // Only the two new, normalized leads are inserted, tagged with org + source.
    const createArg = prisma.contact.createMany.mock.calls[0][0];
    expect(createArg.skipDuplicates).toBe(true);
    expect(createArg.data.map((d: { email: string }) => d.email)).toEqual(['a@x.com', 'b@x.com']);
    expect(createArg.data.every((d: { organizationId: string; source: string }) =>
      d.organizationId === 'org-1' && d.source === 'csv')).toBe(true);
  });

  it('counts createMany-skipped rows (concurrent insert) as duplicates', async () => {
    const { service } = makeService([], 0); // nothing existed, but createMany inserted 0
    const result = await service.ingest(scope, 'apollo', [{ email: 'c@x.com' }]);

    expect(result.imported).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
  });

  it('returns early when no candidate has an email', async () => {
    const { service, prisma } = makeService([], 0);
    const result = await service.ingest(scope, 'csv', [{ firstName: 'x' }, { phone: '+7' }]);

    expect(result).toEqual({ imported: 0, skippedDuplicates: 0, skippedNoEmail: 2 });
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
  });
});
