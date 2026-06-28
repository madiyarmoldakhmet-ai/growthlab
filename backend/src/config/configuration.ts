/**
 * Typed configuration factory consumed by ConfigService.
 * Access nested values with a dot path, e.g. config.get('jwt.secret', { infer: true }).
 */
export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN,
  uploadMaxBytes: parseInt(
    process.env.UPLOAD_MAX_BYTES ?? String(5 * 1024 * 1024),
    10,
  ),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? '86400', 10),
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@growthlab.local',
    password: process.env.ADMIN_PASSWORD ?? 'admin',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  },
  apollo: {
    apiKey: process.env.APOLLO_API_KEY ?? '',
    baseUrl: process.env.APOLLO_BASE_URL ?? 'https://api.apollo.io',
  },
  zerobounce: {
    apiKey: process.env.ZEROBOUNCE_API_KEY ?? '',
    baseUrl: process.env.ZEROBOUNCE_BASE_URL ?? 'https://api.zerobounce.net/v2',
  },
});

export type AppConfiguration = ReturnType<typeof configuration>;
