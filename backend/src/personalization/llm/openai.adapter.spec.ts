import { OpenAiAdapter } from './openai.adapter';

function configWith(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as never;
}

describe('OpenAiAdapter', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns the fallback (no network) when no API key is configured', async () => {
    const adapter = new OpenAiAdapter(configWith({ 'openai.model': 'gpt-4o-mini' }));
    expect(adapter.isConfigured()).toBe(false);

    const fallback = { subject: 'fb', body: 'fb' };
    const result = await adapter.completeJson({ system: 's', user: 'u' }, fallback);

    expect(result.fallback).toBe(true);
    expect(result.data).toBe(fallback);
    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  });

  it('parses content and maps token usage on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: '{"subject":"Hi","body":"Body"}' } }],
        usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 },
      }),
    }) as never;

    const adapter = new OpenAiAdapter(configWith({ 'openai.apiKey': 'k', 'openai.model': 'gpt-4o-mini' }));
    const result = await adapter.completeJson<{ subject: string; body: string }>(
      { system: 's', user: 'u' },
      { subject: '', body: '' },
    );

    expect(result.fallback).toBe(false);
    expect(result.data).toEqual({ subject: 'Hi', body: 'Body' });
    expect(result.usage).toEqual({ promptTokens: 12, completionTokens: 34, totalTokens: 46 });
  });

  it('falls back on a non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as never;
    const adapter = new OpenAiAdapter(configWith({ 'openai.apiKey': 'k' }));

    const result = await adapter.completeJson({ system: 's', user: 'u' }, { subject: 'fb' });
    expect(result.fallback).toBe(true);
    expect(result.data).toEqual({ subject: 'fb' });
  });
});
