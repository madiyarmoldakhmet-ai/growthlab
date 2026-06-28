import { ApolloAdapter } from './apollo.adapter';

function configWith(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as never;
}

describe('ApolloAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reports not configured and refuses to search without an API key', async () => {
    const adapter = new ApolloAdapter(configWith({ 'apollo.baseUrl': 'https://api.apollo.io' }));

    expect(adapter.isConfigured()).toBe(false);
    await expect(adapter.search({ titles: ['CEO'] })).rejects.toMatchObject({
      response: { code: 'apollo_not_configured' },
    });
  });

  it('maps Apollo people to candidates and drops locked emails', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        people: [
          {
            first_name: 'Jane',
            last_name: 'Doe',
            title: 'CEO',
            email: 'Jane@Acme.com',
            organization: { name: 'Acme' },
            id: 'apollo-1',
          },
          { first_name: 'Locked', email: 'email_not_unlocked@domain.com' },
        ],
      }),
    });
    global.fetch = fetchMock as never;

    const adapter = new ApolloAdapter(
      configWith({ 'apollo.apiKey': 'key-123', 'apollo.baseUrl': 'https://api.apollo.io' }),
    );

    const candidates = await adapter.search({ titles: ['CEO'], limit: 10 });

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      email: 'jane@acme.com',
      firstName: 'Jane',
      company: 'Acme',
      position: 'CEO',
    });
    expect(candidates[1].email).toBeUndefined(); // locked placeholder dropped

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/mixed_people/search');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('key-123');
  });

  it('throws a provider error on a non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }) as never;
    const adapter = new ApolloAdapter(configWith({ 'apollo.apiKey': 'key-123' }));

    await expect(adapter.search({ keywords: 'cto' })).rejects.toMatchObject({
      response: { code: 'apollo_provider_error' },
    });
  });
});
