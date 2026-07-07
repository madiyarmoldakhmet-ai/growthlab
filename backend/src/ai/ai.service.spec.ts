import { AiService } from './ai.service';

// No API key -> the service uses its deterministic rule-based fallback (no network).
const service = new AiService({ apiKey: '' });

describe('AiService (offline fallback)', () => {
  it('classifies a clear rejection as "не интересно"', async () => {
    const result = await service.evaluateResponse({
      response: 'Спасибо, не интересно, не пишите больше',
    });

    expect(result.category).toBe('не интересно');
    expect(result.score).toBeLessThan(50);
  });

  it('classifies a pricing question as "цена"', async () => {
    const result = await service.classifyLead({
      message: 'А сколько стоит ваш сервис? Пришлите прайс',
    });

    expect(result.category).toBe('цена');
  });

  it('generates a message body that mentions the product', async () => {
    const result = await service.generateMessage({
      product: 'GrowLab',
      channel: 'email',
    });

    expect(result.body).toContain('GrowLab');
    expect(result.subject).toBeDefined();
  });
});
