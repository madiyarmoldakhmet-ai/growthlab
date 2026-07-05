/**
 * Typed configuration factory consumed by ConfigService.
 */
export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN,
  appPublicUrl: process.env.APP_PUBLIC_URL ?? 'http://localhost:3001',
  database: {
    url: process.env.DATABASE_URL,
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '465', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? process.env.SENDER_NAME ?? 'GrowthLab',
    configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  },
  instagram: {
    // Сессии Puppeteer запускаются с этими учетками (через login form).
    accounts: [
      { username: process.env.IG_USER_1 ?? '', password: process.env.IG_PASS_1 ?? '' },
      { username: process.env.IG_USER_2 ?? '', password: process.env.IG_PASS_2 ?? '' },
    ].filter((a) => a.username && a.password),
    // Пауза между отправками в массовой рассылке, мс.
    sendIntervalMs: (parseInt(process.env.IG_SEND_INTERVAL_SECONDS ?? '60', 10) || 60) * 1000,

    // ─── Webhook (Meta) ────────────────────────────────────────────
    // Verify Token: придумайте строку и впишите её же в панели Meta.
    webhookVerifyToken: process.env.IG_WEBHOOK_VERIFY_TOKEN ?? '',
    // Page/Instagram Access Token для отправки ответов через Graph API.
    webhookPageAccessToken: process.env.IG_WEBHOOK_PAGE_ACCESS_TOKEN ?? '',
    // Ключ OpenAI (опционально). Если пусто — бот отвечает заглушкой.
    openAiApiKey: process.env.OPENAI_API_KEY ?? '',
    // Версия Graph API (v21.0 актуальна на 2025).
    graphApiVersion: process.env.IG_GRAPH_API_VERSION ?? 'v21.0',
    // Разрешить эхо-ответ при отсутствии OpenAI (для отладки).
    webhookFallbackEcho: process.env.IG_WEBHOOK_FALLBACK_ECHO === 'true',
  },
});

export type AppConfiguration = ReturnType<typeof configuration>;