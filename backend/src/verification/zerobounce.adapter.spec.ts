import { ZeroBounceAdapter } from './zerobounce.adapter';

function configWith(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as never;
}

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as never;
}

describe('ZeroBounceAdapter', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('refuses to verify without an API key', async () => {
    const adapter = new ZeroBounceAdapter(configWith({}));
    expect(adapter.isConfigured()).toBe(false);
    await expect(adapter.verify('a@x.com')).rejects.toMatchObject({
      response: { code: 'zerobounce_not_configured' },
    });
  });

  it.each([
    ['valid', 'valid'],
    ['invalid', 'invalid'],
    ['catch-all', 'catch_all'],
    ['do_not_mail', 'risky'],
    ['spamtrap', 'risky'],
    ['abuse', 'risky'],
    ['unknown', 'unknown'],
    ['something-else', 'unknown'],
  ])('maps ZeroBounce status "%s" to "%s"', async (zbStatus, expected) => {
    mockFetchOnce({ status: zbStatus, sub_status: 'detail' });
    const adapter = new ZeroBounceAdapter(configWith({ 'zerobounce.apiKey': 'k' }));

    const result = await adapter.verify('a@x.com');
    expect(result.status).toBe(expected);
    expect(result.subStatus).toBe('detail');
  });

  it('sends api_key and email in the request URL', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'valid' }) });
    global.fetch = fetchMock as never;
    const adapter = new ZeroBounceAdapter(configWith({ 'zerobounce.apiKey': 'secret-key' }));

    await adapter.verify('user@example.com');

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('api_key=secret-key');
    expect(url).toContain('email=user%40example.com');
  });

  it('throws a provider error on a non-OK response', async () => {
    mockFetchOnce({}, false, 401);
    const adapter = new ZeroBounceAdapter(configWith({ 'zerobounce.apiKey': 'k' }));
    await expect(adapter.verify('a@x.com')).rejects.toMatchObject({
      response: { code: 'zerobounce_provider_error' },
    });
  });
});
