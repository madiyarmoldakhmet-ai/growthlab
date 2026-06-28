import { PersonalizationService } from './personalization.service';

const personalization = {
  systemPrompt: 'system prompt',
  product: 'GrowLab',
  tone: 'деловой',
  maxBodyLength: 900,
  generateFollowUp: true,
  senderName: 'Иван',
  senderCompany: 'GrowLab',
  senderAddress: 'г. Алматы',
};

function makeConfig() {
  return {
    get: (key: string) => {
      if (key === 'personalization') return personalization;
      if (key === 'appPublicUrl') return 'http://localhost:3001';
      return undefined;
    },
  } as never;
}

function makeService(lead: unknown) {
  const prisma = {
    lead: { findFirst: jest.fn().mockResolvedValue(lead) },
    message: { create: jest.fn().mockResolvedValue({ id: 'msg-1' }) },
    aiRequest: { create: jest.fn().mockResolvedValue({}) },
  };
  const llm = {
    provider: 'openai',
    isConfigured: () => true,
    completeJson: jest.fn().mockResolvedValue({
      data: { subject: 'Quick question', body: 'Hi Jane, short call?', followUp: 'Bumping this up' },
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: 'gpt-4o-mini',
      fallback: false,
    }),
  };
  const service = new PersonalizationService(prisma as never, llm as never, makeConfig());
  return { service, prisma, llm };
}

const scope = { organizationId: 'org-1', userId: 'user-1' };
const sendableLead = {
  id: 'lead-1',
  organizationId: 'org-1',
  email: 'jane@acme.com',
  firstName: 'Jane',
  company: 'Acme',
  verificationStatus: 'valid',
  metadata: null,
};

describe('PersonalizationService', () => {
  it('refuses to generate for a lead that is not sendable', async () => {
    const { service, llm } = makeService({ ...sendableLead, verificationStatus: 'invalid' });

    await expect(service.generateForLead(scope, 'lead-1')).rejects.toMatchObject({
      response: { code: 'lead_not_sendable' },
    });
    expect(llm.completeJson).not.toHaveBeenCalled();
  });

  it('generates, appends the mandatory unsubscribe footer, and persists the message', async () => {
    const { service, prisma } = makeService(sendableLead);

    const result = await service.generateForLead(scope, 'lead-1');

    expect(result.messageId).toBe('msg-1');
    expect(result.subject).toBe('Quick question');
    expect(result.totalTokens).toBe(30);

    const messageData = prisma.message.create.mock.calls[0][0].data;
    expect(messageData.channel).toBe('email');
    expect(messageData.organizationId).toBe('org-1');
    expect(messageData.leadId).toBe('lead-1');
    expect(messageData.status).toBe('queued');
    expect(typeof messageData.unsubscribeToken).toBe('string');
    // body = AI body + footer with sender identity + unsubscribe link
    expect(messageData.body).toContain('Hi Jane, short call?');
    expect(messageData.body).toContain('Иван, GrowLab');
    expect(messageData.body).toContain(
      `Отписаться: http://localhost:3001/unsubscribe/${messageData.unsubscribeToken}`,
    );
  });

  it('records token usage as an AiRequest for COGS analytics', async () => {
    const { service, prisma } = makeService(sendableLead);

    await service.generateForLead(scope, 'lead-1');

    const aiReq = prisma.aiRequest.create.mock.calls[0][0].data;
    expect(aiReq).toMatchObject({
      organizationId: 'org-1',
      operation: 'personalize',
      provider: 'openai',
      status: 'success',
      totalTokens: 30,
      leadId: 'lead-1',
      messageId: 'msg-1',
    });
  });
});
