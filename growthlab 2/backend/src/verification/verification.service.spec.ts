import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  const scope = { organizationId: 'org-1', userId: 'user-1' };

  function makeService(opts: {
    findFirst?: unknown;
    findMany?: unknown[];
  }) {
    const prisma = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(opts.findFirst ?? null),
        findMany: jest.fn().mockResolvedValue(opts.findMany ?? []),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const verifier = { provider: 'zerobounce', isConfigured: () => true, verify: jest.fn() };
    const service = new VerificationService(prisma as never, verifier as never);
    return { service, prisma, verifier };
  }

  it('uses the stored status as a cache and does not re-call the provider', async () => {
    const { service, verifier, prisma } = makeService({
      findFirst: { id: 'l1', email: 'a@x.com', verificationStatus: 'valid', metadata: null },
    });

    const result = await service.verifyLead(scope, 'l1');

    expect(result).toEqual({ leadId: 'l1', status: 'valid', cached: true });
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('verifies an unverified lead and persists status + verifiedAt', async () => {
    const { service, verifier, prisma } = makeService({
      findFirst: { id: 'l2', email: 'b@x.com', verificationStatus: 'unverified', metadata: { apolloId: '1' } },
    });
    verifier.verify.mockResolvedValue({ status: 'invalid', subStatus: 'mailbox_not_found' });

    const result = await service.verifyLead(scope, 'l2');

    expect(verifier.verify).toHaveBeenCalledWith('b@x.com');
    expect(result).toMatchObject({ leadId: 'l2', status: 'invalid', cached: false });
    const updateArg = prisma.lead.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'l2' });
    expect(updateArg.data.verificationStatus).toBe('invalid');
    expect(updateArg.data.verifiedAt).toBeInstanceOf(Date);
    // existing metadata preserved, verification block merged in
    expect(updateArg.data.metadata.apolloId).toBe('1');
    expect(updateArg.data.metadata.verification.status).toBe('invalid');
  });

  it('re-verifies when force=true even if already verified', async () => {
    const { service, verifier } = makeService({
      findFirst: { id: 'l3', email: 'c@x.com', verificationStatus: 'valid', metadata: null },
    });
    verifier.verify.mockResolvedValue({ status: 'valid' });

    const result = await service.verifyLead(scope, 'l3', true);

    expect(verifier.verify).toHaveBeenCalledWith('c@x.com');
    expect(result.cached).toBe(false);
  });

  it('processes a batch, aggregates by status, and counts failures as skipped', async () => {
    const { service, verifier } = makeService({
      findMany: [
        { id: 'l4', email: 'd@x.com', verificationStatus: 'unverified', metadata: null },
        { id: 'l5', email: 'e@x.com', verificationStatus: 'unverified', metadata: null },
      ],
    });
    verifier.verify
      .mockResolvedValueOnce({ status: 'valid' })
      .mockRejectedValueOnce(new Error('provider down'));

    const result = await service.verifyPending(scope, 10);

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.byStatus).toEqual({ valid: 1 });
  });
});
