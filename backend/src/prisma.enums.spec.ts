import { EventType, ContactStatus, MessageStatus, VerificationStatus } from '@prisma/client';

// Guards the generated Prisma client against funnel/schema regressions.
describe('Prisma generated enums', () => {
  it('exposes every core funnel stage on EventType', () => {
    const funnel = [
      'sent',
      'delivered',
      'opened',
      'replied',
      'positive',
      'demo',
      'won',
    ];
    for (const stage of funnel) {
      expect(EventType[stage as keyof typeof EventType]).toBe(stage);
    }
  });

  it('splits bounce into hard/soft for suppression decisions', () => {
    expect(EventType.hard_bounced).toBe('hard_bounced');
    expect(EventType.soft_bounced).toBe('soft_bounced');
  });

  it('covers the message sending lifecycle', () => {
    for (const status of ['queued', 'scheduled', 'sent', 'delivered', 'failed', 'bounced']) {
      expect(MessageStatus[status as keyof typeof MessageStatus]).toBe(status);
    }
  });

  it('covers contact lifecycle and verification states', () => {
    expect(ContactStatus.new).toBe('new');
    expect(ContactStatus.suppressed).toBe('suppressed');
    expect(VerificationStatus.valid).toBe('valid');
    expect(VerificationStatus.catch_all).toBe('catch_all');
  });
});
