/**
 * Typed configuration factory consumed by ConfigService.
 * Access nested values with a dot path, e.g. config.get('jwt.secret', { infer: true }).
 */
const DEFAULT_PERSONALIZATION_PROMPT = [
  'Ты пишешь короткие холодные B2B-письма на русском языке для рынка СНГ.',
  'Письмо должно быть персональным (используй имя, компанию, должность лида, если есть),',
  'по делу, без воды, без давления и без спам-клише. Один понятный следующий шаг (CTA).',
  'НЕ выдумывай факты о компании лида. НЕ добавляй подпись/футер — его добавит система.',
  'Верни строго JSON: {"subject":"...","body":"...","followUp":"..."},',
  'где followUp — короткое письмо-напоминание на случай отсутствия ответа.',
].join(' ');

export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN,
  appPublicUrl: process.env.APP_PUBLIC_URL ?? 'http://localhost:3001',
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
  sending: {
    // SAFETY: dry-run is the default. Emails are NOT sent until DRY_RUN=false is set explicitly.
    dryRun: (process.env.DRY_RUN ?? 'true') !== 'false',
    throttleMs: parseInt(process.env.SEND_THROTTLE_MS ?? '1000', 10),
    defaultDailyLimit: parseInt(process.env.MAILBOX_DAILY_LIMIT ?? '50', 10),
    // Shared secret required on inbound provider webhooks (x-webhook-secret header).
    webhookSecret: process.env.WEBHOOK_SECRET ?? '',
  },
  personalization: {
    // Prompt + tone/offer live in config so they can be tuned without code changes.
    systemPrompt: process.env.PERSONALIZATION_SYSTEM_PROMPT || DEFAULT_PERSONALIZATION_PROMPT,
    product: process.env.PERSONALIZATION_PRODUCT ?? 'наш сервис',
    tone: process.env.PERSONALIZATION_TONE ?? 'деловой, живой, без давления',
    maxBodyLength: parseInt(process.env.PERSONALIZATION_MAX_BODY_LENGTH ?? '900', 10),
    generateFollowUp: (process.env.PERSONALIZATION_FOLLOWUP ?? 'true') !== 'false',
    senderName: process.env.SENDER_NAME ?? '',
    senderCompany: process.env.SENDER_COMPANY ?? 'GrowLab',
    senderAddress: process.env.SENDER_ADDRESS ?? '',
  },
});

export type AppConfiguration = ReturnType<typeof configuration>;
