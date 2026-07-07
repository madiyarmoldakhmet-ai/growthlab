# GrowthLab

GrowthLab — AI Sales System для cold-outreach: импорт и верификация контактов,
AI-персонализация писем, отправка через несколько каналов (Gmail / WhatsApp /
Instagram), учёт ответов и воронки.

> Это очищенная и унифицированная кодовая база. Все прежние дубликаты
> (`backend/GrowthLab 2/`, `growthlab/`, корневой `backend/` Clean MVP)
> объединены сюда. Репозиторий-источник: https://github.com/madiyarmoldakhmet-ai/growthlab

## Что готово

- **`backend/`** — NestJS API на Fastify (порт 3001), Prisma + PostgreSQL.
- **`frontend/`** — Next.js приложение (порт 3000).
- **`backend/prisma/schema.prisma`** — нормализованная схема (имена приведены к ТЗ).
- **`docs/`** — заметки по архитектуре, API, БД, Gmail, Instagram.

## Стек

- **Backend:** NestJS 11 + Fastify 5, Prisma 6, PostgreSQL 15+, JWT-аутентификация.
- **Каналы:** Gmail (OAuth via `googleapis`), WhatsApp (`@whiskeysockets/baileys`),
  Instagram DM (Puppeteer, одиночная отправка).
- **AI:** OpenAI через нативный `fetch` (без SDK), через `OPENAI_BASE_URL`.
- **Импорт/верификация:** CSV/Excel-импорт, ZeroBounce для проверки email.

## Структура backend (`backend/src/`)

| Модуль | Назначение |
|--------|-----------|
| `auth/` | JWT-логин, AdminGuard |
| `contacts/` | **Cold-outreach проспекты** (найдены через Apollo/CSV, верифицируются, получают письма). Бывший `leads/`. |
| `crm-contacts/` | Legacy CRM-контакты (используются Gmail-каналом). Бывший `contacts/`. |
| `campaigns/` | CRUD кампаний |
| `sending-accounts/` | Аккаунты отправки (ящик отправки, dailyLimit, ротация). Бывший `channels/`. |
| `channels/instagram/` | Instagram DM через Puppeteer (одиночная отправка, перенесён из Clean MVP) |
| `gmail/` | Отправка и приём ответов через Gmail OAuth |
| `whatsapp/` | WhatsApp через Baileys |
| `personalization/` | AI-генерация персонализированных писем |
| `verification/` | Проверка email через ZeroBounce |
| `sending/` | Пайплайн отправки: батч, ротация аккаунтов, вебхуки |
| `ai/` | Обёртка над OpenAI (внутренний модуль, без контроллера) |
| `common/` | CSV-утилиты, нормализация, фильтры исключений |

### Важно про именование сущностей

Сущности приведены к терминологии ТЗ. Исторические названия больше не используются:

| Было | Стало | Примечание |
|------|-------|-----------|
| `Lead` | `Contact` | cold-outreach проспект |
| `leads/` | `contacts/` | модуль |
| `LeadStatus`, `LeadSource` | `ContactStatus`, `ContactSource` | enum'ы |
| `CampaignLead` | `CampaignContact` | член аудитории кампании |
| `Channel` | `SendingAccount` | аккаунт отправки |
| `channels/` | `sending-accounts/` | модуль CRUD аккаунтов отправки |
| `Contact` (legacy CRM) | `CrmContact` | используется только Gmail-каналом |
| `contacts/` (legacy) | `crm-contacts/` | модуль |

> ⚠️ Скалярное поле `channel` (тип `ChannelType`) и enum `ChannelType`
> сохранены как есть — это тип канала, а не сущность SendingAccount.

## Требования

- Node.js 20+
- npm 10+
- PostgreSQL 15+
- Git

## Установка

Backend:
```powershell
cd backend
npm install
npm run prisma:generate
```

Frontend:
```powershell
cd frontend
npm install
```

## Переменные окружения

Скопируйте примеры и заполните локальные `.env`:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Ключевые переменные backend:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/growthlab?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN_SECONDS=86400
ADMIN_EMAIL="admin@growthlab.local"
ADMIN_PASSWORD="change-this-password"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
OPENAI_BASE_URL="https://api.openai.com/v1"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3001/gmail/oauth/callback"
GOOGLE_REFRESH_TOKEN=""
WHATSAPP_AUTH_DIR="./storage/whatsapp/auth"
UPLOAD_MAX_BYTES=5242880
```

Frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## База данных (первый запуск)

Создайте БД `growthlab`, затем выполните миграцию. Поскольку старые миграции
удалены (свежий старт), первая команда создаст единую начальную миграцию:

```powershell
cd backend
npm run prisma:migrate    # создаст и применит миграцию init
```

Для прод-окружения:
```powershell
npx prisma migrate deploy
```

## Запуск

```powershell
# Backend — http://localhost:3001
cd backend
npm run start:dev

# Frontend — http://localhost:3000
cd frontend
npm run dev
```

Или из корня репозитория:
```powershell
npm run dev:backend
npm run dev:frontend
```

## Основные endpoints

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/admin`
- `GET /contacts`, `POST /contacts/import/csv`, `POST /contacts/search/apollo` — cold-outreach проспекты
- `GET /crm-contacts`, `POST /crm-contacts`, `POST /crm-contacts/import/csv` — legacy CRM
- `GET /campaigns`, `POST /campaigns`
- `GET /sending-accounts`, `POST /sending-accounts` — аккаунты отправки
- `POST /verification/run`, `POST /verification/contacts/:id`
- `POST /personalization/run`, `POST /personalization/contacts/:id`
- `POST /sending/run`, `POST /sending/messages/:id`
- `POST /webhooks/email/:provider`
- `POST /whatsapp/connect`, `GET /whatsapp/status`, `POST /whatsapp/messages`
- `PUT /gmail/oauth`, `POST /gmail/send`, `POST /gmail/sync-replies`

## Проверки

```powershell
cd backend
npm run build
npm run prisma:generate
npm test

cd frontend
npm run build
npm run lint
```

## Заметки

- Настройки Gmail — в `docs/GMAIL.md`.
- Фронтенд-экраны частично используют локальное состояние и демо-данные; интеграция с API строится поверх `frontend/lib/api.ts`.
- Файлы WhatsApp-авторизации пишутся в `WHATSAPP_AUTH_DIR` и не должны коммититься.
- Upload-endpoints ожидают `multipart/form-data` с полем `file`.
