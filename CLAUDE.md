# CLAUDE.md — GrowthLab

Память для Claude Code. Читается автоматически в начале сессии. Держать кратким и актуальным.

## Что за продукт
**GrowLab** — cold-email сервис с AI-персонализацией для B2B (Казахстан / Россия).
Пайплайн: лиды → верификация → AI-персонализация письма → отправка по каналам → измерение воронки.
Бизнес-контекст и цифры: `docs/pitch/README.md`. Цель воронки: **1000 писем → ~850 доставлено → ~42 ответа → 2–3 клиента**.

## Стек
- **Backend:** NestJS 11 (на **Fastify**, не Express), TypeScript **strict**.
- **ORM/БД:** Prisma 6 + PostgreSQL.
- **Auth:** JWT (`@nestjs/jwt` + passport-jwt), роли `admin`/`member`.
- **Валидация:** `class-validator` + `class-transformer`, глобальный `ValidationPipe` (whitelist+transform).
- **Конфиг:** `@nestjs/config` (глобальный `ConfigModule` + валидация env в `src/config/env.validation.ts`). На ConfigService переведены `main.ts` и auth; `ai`/`gmail`/`whatsapp` пока читают `process.env` напрямую — переведём в их фазах.
- **AI:** OpenAI-совместимый API (`OPENAI_API_KEY`, по умолчанию `gpt-4o-mini`). Решение: **оставляем OpenAI** для генерации писем (Claude отдельным ключом не подключаем).
- **Каналы:** Email через Gmail API (один аккаунт, OAuth refresh token). WhatsApp — Baileys (оставлен рабочим, см. ниже).
- **Frontend:** Next.js (`frontend/`) — в backend-фазы не входит.

## Структура (монорепо)
```
backend/   NestJS API (src/, prisma/)
frontend/  Next.js (вне текущих фаз)
docs/      ARCHITECTURE, DATABASE, API, GMAIL, ROADMAP, pitch/
```
Backend-модули: `auth`, `contacts`, `leads`, `campaigns`, `gmail`, `whatsapp`, `ai`, `prisma.service.ts`.
Общие утилиты: `common/csv` (парсер CSV), `common/normalize.util` (email/phone/clean) — переиспользуются contacts и leads.
Источники лидов за интерфейсом `LeadSourceAdapter` (`leads/lead-sources/`): `ApolloAdapter` (ключ из ConfigService; HTTP пока прямой, очередь — Ф6).

## Доменная модель (Ф1)
Всё tenant-scoped по `organizationId`. Сущности:
- **Lead** — холодный лид пайплайна (источник, статус, `verificationStatus`, demo/won/lost timestamps). Дедуп `@@unique([organizationId, email])`.
- **Contact** — ручной/CRM-контакт (legacy, используется contacts-модулем и Gmail). Пайплайн использует Lead.
- **Channel** — отправляющая идентичность (ящик/бот): `type`, `dailyLimit`, `isActive` (ротация/лимиты — Ф5).
- **Campaign** — `goal/channel/audience/dates`; аудитория через **CampaignLead** (join).
- **Message** — исходящее. Идемпотентность: `@@unique([organizationId, idempotencyKey])` (per-attempt) + `@@unique([campaignId, leadId, step])` (audience-level). `providerMessageId` unique. `unsubscribeToken` unique. Индекс планировщика `[organizationId, status, scheduledAt]`.
- **Event** — append-only воронка/аудит. Дедуп вебхуков `@@unique([organizationId, provider, providerEventId])`. EventType покрывает sent→delivered→opened→replied→positive→demo→won + hard/soft bounce, complaint, unsubscribe.
- **Response** — входящий ответ + AI-классификация (`sentiment/aiScore/aiCategory`) — основа replied→positive.
- **SuppressionEntry** — channel-agnostic `address`, unique `[organizationId, channelType, address]` (suppression-гейт перед отправкой).
- **Consent** — opt-in для TG/WhatsApp (rule 7), unique `[organizationId, channelType, address]`.

### Контракты на уровне сервисов (НЕ в БД — соблюдать в коде фаз)
- **Кросс-тенант целостность связей** (campaign.org == lead.org и т.п.) — проверять в сервисе через `AuthScope`; composite-FK в БД намеренно не вводили.
- **Нормализация email** (trim+lowercase) перед записью/поиском Lead/Suppression — иначе suppression промахнётся по регистру.
- **SuppressionEntry — единственный авторитетный гейт** перед отправкой; `LeadStatus.suppressed` — производное.
- **Монотонные статусы Message** (только вперёд) — в sending/webhook сервисе (Ф5).
- **idempotencyKey** пайплайн ставит всегда (в БД nullable для ручных Gmail-отправок).
- Дедуп лидов без email (по phone) — на уровне сервиса в Ф2.

## Команды (backend/)
```bash
npm install && npm run prisma:generate   # установка + клиент Prisma
npm run prisma:migrate                   # миграции (нужен PostgreSQL, БД growthlab)
npm run start:dev                        # запуск (порт 3001)
npm run build                            # сборка (tsconfig.build.json, без *.spec)
npm test                                 # jest (unit, без БД)
npm run lint                             # eslint (flat config)
npm run format                           # prettier
```

## Жёсткие правила (НЕ нарушать)
1. **Секреты только в `.env`.** Никогда не коммитить `.env` и `*client_secret*.json` (в `.gitignore` уже есть). Новые ключи — заглушками в `.env.example` с комментарием, где взять.
2. **Мульти-тенантность по `organizationId`** — всё фильтруется по организации. Введено в Ф0 для `User/Contact/Campaign` (scope из JWT через `AuthScope`). `Message/Response/Setting` ещё на `userId` — перевести в Ф1.
3. **Все внешние вызовы (AI, отправка, верификация) — через очередь (BullMQ+Redis)** с ретраями и rate-limit, не синхронно в HTTP-запросе.
4. **Идемпотентность отправки:** уникальный ключ на сообщение, повтор джобы не шлёт дубль.
5. **Аудит:** каждое событие лида/сообщения логируется (нужно для воронки и compliance).
6. **Compliance не в конце:** unsubscribe-ссылка в каждом письме, suppression-листы (жалобы/отписки/hard-bounce), идентификация отправителя в footer.
7. **Telegram/WhatsApp — ТОЛЬКО официальные API и ТОЛЬКО по opt-in.** Запрещено: мульти-аккаунты + прокси, bulk в обход официальных API.
8. **TypeScript strict, DTO + class-validator на входах, логика в сервисах, конфиг через `ConfigService`.**
9. **Внешние сервисы — за интерфейсом-адаптером** (LeadSource, EmailVerifier, ChannelSender, …).
10. **`DRY_RUN=true` по умолчанию** для отправки: письма не уходят, только логируются. Реальная отправка — только когда владелец явно поставит `false`.

## Каналы и технический долг
- **WhatsApp (Baileys)** — оставлен рабочим как есть. Использовать ТОЛЬКО для переписки с теми, кто сам написал / дал согласие. Массовую авто-рассылку незнакомым на нём НЕ строить. Официальный WhatsApp Business Cloud API и Telegram — отдельно, позже.
- **Auth (MVP):** пароль проверяется против env `ADMIN_PASSWORD`, но личность — реальный `User` в `Organization` (создаётся при первом логине). Полноценное управление пользователями — позже.
- **Logout in-memory:** список отозванных токенов в памяти (теряется при рестарте) — перенести в Redis в Ф6.
- ✅ Решено в Ф0: единый `PrismaService` (дубль в gmail удалён), org-скоуп вместо legacy-заглушки, `ConfigService`, exception-filter, jest, eslint.

## Рабочий процесс
- Работа **по одной фазе за раз** (`ROADMAP.md`). В конце фазы: сборка + проверка + коммит с осмысленным сообщением + краткий отчёт. **Push — только по подтверждению владельца.**
- Не вываливать весь код в чат — кратко что сделано и что дальше.
