import { EmailSender } from './email.sender';

function configWith(dryRun: boolean) {
  return { get: (key: string) => (key === 'sending.dryRun' ? dryRun : undefined) } as never;
}

describe('EmailSender', () => {
  it('does not touch the provider in DRY_RUN (default-safe)', async () => {
    const gmail = { sendEmail: jest.fn() };
    const sender = new EmailSender(configWith(true), gmail as never);

    const result = await sender.send({ to: 'a@x.com', subject: 'Hi', body: 'Body' });

    expect(result.status).toBe('dry_run');
    expect(gmail.sendEmail).not.toHaveBeenCalled();
  });

  it('sends via the Gmail transport when DRY_RUN is off', async () => {
    const gmail = { sendEmail: jest.fn().mockResolvedValue({ providerMessageId: 'pm-1' }) };
    const sender = new EmailSender(configWith(false), gmail as never);

    const result = await sender.send({ to: 'a@x.com', subject: 'Hi', body: 'Body' });

    expect(gmail.sendEmail).toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'sent', provider: 'gmail', providerMessageId: 'pm-1' });
  });

  it('returns failed (does not throw) when the transport errors', async () => {
    const gmail = { sendEmail: jest.fn().mockRejectedValue(new Error('smtp down')) };
    const sender = new EmailSender(configWith(false), gmail as never);

    const result = await sender.send({ to: 'a@x.com', subject: 'Hi', body: 'Body' });

    expect(result.status).toBe('failed');
    expect(result.reason).toContain('smtp down');
  });
});
