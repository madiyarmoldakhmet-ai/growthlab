import { Prisma } from '@prisma/client';
import { SendingService } from './sending.service';

const scope = { organizationId: 'org-1', userId: 'user-1' };

const queuedMessage = {
  id: 'msg-1',
  organizationId: 'org-1',
  status: 'queued',
  subject: 'Hi',
  body: 'Body',
  contactId: 'contact-1',
  campaignId: null,
  scheduledAt: null,
  idempotencyKey: null,
  metadata: null,
  openedAt: null,
  contact: { id: 'contact-1', email: 'jane@acme.com', verificationStatus: 'valid' },
};

function makePrisma() {
  const prisma: Record<string, unknown> = {
    message: {
      findFirst: jest.fn().mockResolvedValue(queuedMessage),
      findMany: jest.fn().mockResolvedValue([queuedMessage]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    channel: { findMany: jest.fn().mockResolvedValue([]) },
    suppressionEntry: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    event: { create: jest.fn().mockResolvedValue({}) },
    contact: { update: jest.fn().mockResolvedValue({}) },
  };
  // $transaction runs the callback with the same mock client.
  (prisma as { $transaction: unknown }).$transaction = jest.fn(async (cb: (tx: unknown) => unknown) =>
    cb(prisma),
  );
  return prisma as never;
}

function makeService(prisma: ReturnType<typeof makePrisma>, dryRun: boolean, sendResult?: unknown) {
  const emailSender = {
    dryRun,
    send: jest.fn().mockResolvedValue(
      sendResult ?? { status: dryRun ? 'dry_run' : 'sent', provider: 'gmail', providerMessageId: 'pm-1' },
    ),
  };
  const config = {
    get: (key: string) => {
      if (key === 'sending.throttleMs') return 0;
      if (key === 'personalization') return { senderName: 'Иван' };
      return undefined;
    },
  };
  const service = new SendingService(prisma, emailSender as never, config as never);
  return { service, emailSender };
}

// Convenience typed accessor for the mock.
function m(prisma: ReturnType<typeof makePrisma>) {
  return prisma as unknown as {
    message: Record<string, jest.Mock>;
    channel: Record<string, jest.Mock>;
    suppressionEntry: Record<string, jest.Mock>;
    event: Record<string, jest.Mock>;
    contact: Record<string, jest.Mock>;
  };
}

describe('SendingService.sendMessage', () => {
  it('DRY_RUN: marks the message, never marks it sent, never picks a channel', async () => {
    const prisma = makePrisma();
    const { service, emailSender } = makeService(prisma, true);

    const outcome = await service.sendMessage(scope, 'msg-1');

    expect(outcome.status).toBe('dry_run');
    expect(emailSender.send).toHaveBeenCalled();
    const updateData = m(prisma).message.update.mock.calls[0][0].data;
    expect(updateData.status).toBeUndefined();
    expect(updateData.metadata.dryRun).toBeDefined();
    expect(m(prisma).message.groupBy).not.toHaveBeenCalled(); // no channel selection
    expect(m(prisma).event.create).not.toHaveBeenCalled();
  });

  it('idempotent: an already-sent message is skipped without contacting the sender', async () => {
    const prisma = makePrisma();
    m(prisma).message.findFirst.mockResolvedValue({ ...queuedMessage, status: 'sent' });
    const { service, emailSender } = makeService(prisma, false);

    const outcome = await service.sendMessage(scope, 'msg-1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'already_sent' });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('skips suppressed recipients', async () => {
    const prisma = makePrisma();
    m(prisma).suppressionEntry.findUnique.mockResolvedValue({ id: 's1' });
    const { service, emailSender } = makeService(prisma, false);

    const outcome = await service.sendMessage(scope, 'msg-1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'suppressed' });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('skips leads that failed verification (not sendable)', async () => {
    const prisma = makePrisma();
    m(prisma).message.findFirst.mockResolvedValue({
      ...queuedMessage,
      contact: { ...queuedMessage.contact, verificationStatus: 'invalid' },
    });
    const { service, emailSender } = makeService(prisma, false);

    const outcome = await service.sendMessage(scope, 'msg-1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'not_sendable' });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('real send (DRY_RUN off): skips when no mailbox is configured', async () => {
    const prisma = makePrisma(); // channel.findMany returns []
    const { service, emailSender } = makeService(prisma, false);

    const outcome = await service.sendMessage(scope, 'msg-1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'no_channel_capacity' });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('real send: claims atomically, rotates to a mailbox, marks sent, emits a sent Event', async () => {
    const prisma = makePrisma();
    m(prisma).channel.findMany.mockResolvedValue([
      { id: 'ch-1', type: 'email', isActive: true, dailyLimit: 50 },
    ]);
    const { service, emailSender } = makeService(prisma, false);

    const outcome = await service.sendMessage(scope, 'msg-1');

    // Atomic claim: queued/scheduled -> sending, with the chosen channel.
    const claim = m(prisma).message.updateMany.mock.calls[0][0];
    expect(claim.where.status).toEqual({ in: ['queued', 'scheduled'] });
    expect(claim.data).toMatchObject({ status: 'sending', channelId: 'ch-1' });

    expect(emailSender.send).toHaveBeenCalled();
    expect(outcome).toMatchObject({ status: 'sent', providerMessageId: 'pm-1' });
    const sentData = m(prisma).message.update.mock.calls[0][0].data;
    expect(sentData).toMatchObject({ status: 'sent', providerMessageId: 'pm-1' });
    expect(m(prisma).event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'sent' }) }),
    );
  });

  it('does not send when the claim is lost to a concurrent worker', async () => {
    const prisma = makePrisma();
    m(prisma).channel.findMany.mockResolvedValue([
      { id: 'ch-1', type: 'email', isActive: true, dailyLimit: 50 },
    ]);
    m(prisma).message.updateMany.mockResolvedValue({ count: 0 }); // someone else claimed it
    const { service, emailSender } = makeService(prisma, false);

    const outcome = await service.sendMessage(scope, 'msg-1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'already_claimed' });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('respects the per-mailbox daily limit (no capacity → skipped)', async () => {
    const prisma = makePrisma();
    m(prisma).channel.findMany.mockResolvedValue([
      { id: 'ch-1', type: 'email', isActive: true, dailyLimit: 10 },
    ]);
    m(prisma).message.groupBy.mockResolvedValue([{ channelId: 'ch-1', _count: { _all: 10 } }]);
    const { service, emailSender } = makeService(prisma, false);

    const outcome = await service.sendMessage(scope, 'msg-1');

    expect(outcome).toMatchObject({ status: 'skipped', reason: 'no_channel_capacity' });
    expect(emailSender.send).not.toHaveBeenCalled();
  });
});

describe('SendingService.ingestWebhook', () => {
  it('dedupes replayed provider events via the unique providerEventId', async () => {
    const prisma = makePrisma();
    const dupError = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '6.19.3',
    });
    m(prisma).event.create.mockResolvedValueOnce({}).mockRejectedValueOnce(dupError);
    const { service } = makeService(prisma, true);

    const events = [
      { type: 'delivered' as const, providerEventId: 'evt-1', providerMessageId: 'pm-1' },
      { type: 'delivered' as const, providerEventId: 'evt-1', providerMessageId: 'pm-1' },
    ];
    const result = await service.ingestWebhook('gmail', events);

    expect(result.processed).toBe(1);
    expect(result.duplicates).toBe(1);
  });

  it('hard bounce suppresses the recipient and marks the message bounced', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma, true);

    const result = await service.ingestWebhook('gmail', [
      { type: 'bounce' as const, bounceType: 'hard' as const, providerEventId: 'evt-2', providerMessageId: 'pm-1' },
    ]);

    expect(result.processed).toBe(1);
    expect(m(prisma).suppressionEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ reason: 'hard_bounce', address: 'jane@acme.com' }),
      }),
    );
    expect(m(prisma).message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'bounced' }) }),
    );
  });

  it('skips events whose message is unknown', async () => {
    const prisma = makePrisma();
    m(prisma).message.findFirst.mockResolvedValue(null);
    const { service } = makeService(prisma, true);

    const result = await service.ingestWebhook('gmail', [
      { type: 'open' as const, providerEventId: 'evt-3', providerMessageId: 'unknown' },
    ]);

    expect(result).toMatchObject({ processed: 0, skipped: 1 });
  });
});
