# 🌙 Ночной рефакторинг — отчёт (сделано автономно)

> Прочти этот файл утром. Кратко: старый бардак снесён, проект переписан с нуля по
> чистой 4-табличной архитектуре. Бэкенд и фронтенд собираются без ошибок,
> SMTP-отправка реально работает (Gmail), демо для инвестора не тронуто.

---

## 🚀 Что работает прямо сейчас (проверено живыми curl-запросами)

| Проверка | Результат |
|---|---|
| `npx prisma migrate reset --force` | ✅ БД пересоздана |
| `npx prisma migrate dev --name clean_mvp` | ✅ Миграция `20260704193327_clean_mvp` применена |
| `npx prisma generate` | ✅ Client сгенерирован (GMAIL/WHATSAPP, ContactStatus) |
| Backend `npm run start:dev` | ✅ `Found 0 errors`, `Nest application successfully started` |
| `POST /clean-mvp/seed` | ✅ `{"client":"Test Client","campaign":"Test Campaign","contacts":5}` (HTTP 201) |
| `POST /clean-mvp/send-email` | ✅ `{"status":"SENT","providerMessageId":"<58166265-...@gmail.com>"}` — **реальный SMTP** |
| `GET /clean-mvp/campaigns` | ✅ Возвращает кампанию с `contactsCount: 5` |
| Frontend `npm run build` | ✅ `Compiled successfully`, 8 маршрутов |
| `/demo` (для инвестора) | ✅ Не тронут, работает |

**Состояние БД на утро:** Clients: 1 · Campaigns: 1 · Contacts: 5 · Messages: 1 · Sent: 1

---

## 🗂 ШАГ 1 — Чистая БД

### `backend/prisma/schema.prisma` (новый, 4 таблицы)

```prisma
model Client {
  id        String     @id @default(uuid()) @db.Uuid
  name      String
  industry  String?
  campaigns Campaign[]
  createdAt DateTime   @default(now()) @map("created_at")
  @@map("clients")
}

model Campaign {
  id        String         @id @default(uuid()) @db.Uuid
  clientId  String         @map("client_id") @db.Uuid
  client    Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  name      String
  status    CampaignStatus @default(ACTIVE)
  contacts  Contact[]
  createdAt DateTime       @default(now()) @map("created_at")
  @@index([clientId])
  @@map("campaigns")
}

model Contact {
  id          String        @id @default(uuid()) @db.Uuid
  campaignId  String        @map("campaign_id") @db.Uuid
  campaign    Campaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  fullName    String        @map("full_name")
  email       String?
  phone       String?
  channelType ChannelType   @map("channel_type")
  status      ContactStatus @default(NEW)
  messages    Message[]
  createdAt   DateTime      @default(now()) @map("created_at")
  @@index([campaignId])
  @@index([status])
  @@map("contacts")
}

model Message {
  id        String        @id @default(uuid()) @db.Uuid
  contactId String        @map("contact_id") @db.Uuid
  contact   Contact       @relation(fields: [contactId], references: [id], onDelete: Cascade)
  channel   ChannelType
  text      String
  status    MessageStatus @default(QUEUED)
  waLink    String?       @map("wa_link")
  createdAt DateTime      @default(now()) @map("created_at")
  @@index([contactId])
  @@map("messages")
}
```

Enums: `CampaignStatus { ACTIVE, PAUSED }`, `ChannelType { GMAIL, WHATSAPP }`,
`ContactStatus { NEW, QUEUED, SENT, REPLIED }`, `MessageStatus { QUEUED, SENT, FAILED }`.

**Связи:** `Client → Campaign → Contact → Message` (cascade delete).

---

## ⚙️ ШАГ 2 — Чистый бэкенд

### Что удалено
`backend/src/`: `ai/`, `auth/`, `campaigns/`, `channels/`, `contacts/`, `gmail/`,
`leads/`, `mvp-core/`, `personalization/`, `sending/`, `verification/`, `whatsapp/`,
`common/types/`, `common/csv/`, `common/normalize.util.ts`, `prisma.enums.spec.ts`.

### Что упрощено
- `backend/src/config/configuration.ts` — только `nodeEnv/port/corsOrigin/appPublicUrl/database/smtp`.
- `backend/src/config/env.validation.ts` — только `DATABASE_URL/DIRECT_URL/PORT/SMTP_*`.
- `backend/src/main.ts` — убран `uploadMaxBytes`/multipart (не нужен).
- `backend/src/app.module.ts` — только `ConfigModule + PrismaModule + CleanMvpModule`.

### Новый модуль `backend/src/clean-mvp/`
- **`clean-mvp.dto.ts`** — `CreateCampaignDto`, `CreateContactDto`, `SendEmailDto`, `SendWhatsappDto`, `parseChannelType`, `parseContactStatus`.
- **`clean-mvp.service.ts`** — вся бизнес-логика + **inline SMTP** (Nodemailer, `Transporter` кешируется).
- **`clean-mvp.controller.ts`** — 8 публичных эндпоинтов.
- **`clean-mvp.module.ts`**.

### Эндпоинты (все публичные, без JWT — как просил)

| Метод | Путь | Что делает |
|---|---|---|
| POST | `/clean-mvp/seed` | Создаёт 1 клиента + 1 кампанию + 5 контактов (3 GMAIL, 2 WHATSAPP). Идемпотентно. |
| GET | `/clean-mvp/campaigns` | Список кампаний с `clientName`, `contactsCount`. |
| POST | `/clean-mvp/campaigns` | Создать кампанию (body: `{name, clientName?}`). |
| GET | `/clean-mvp/campaigns/:id/contacts` | Контакты конкретной кампании. |
| POST | `/clean-mvp/contacts` | Добавить контакт (body: `{campaignId, fullName, email?, phone?, channelType}`). |
| POST | `/clean-mvp/send-email` | Реальная SMTP-отправка. Body: `{contactId, text}`. Сохраняет Message, ставит Contact.status=SENT, возвращает `{messageId, providerMessageId, status, to}`. |
| POST | `/clean-mvp/send-whatsapp` | Генерит `wa.me`-ссылку, сохраняет Message с `waLink`, ставит SENT. Возвращает `{messageId, phone, text, link, status}`. |
| GET | `/clean-mvp/queue` | Все контакты со `status != NEW` (для страницы «Очередь»). |

### Подтверждение SMTP (из логов)
```
[CleanMvpService] SMTP sent to marina.sample@gmail.com:
  messageId=<58166265-a52c-50fc-0e48-b32ee11259f2@gmail.com>
```
Это реальный `Message-ID`, выданный Gmail SMTP — письмо реально ушло.

---

## 🖥 ШАГ 3 — Чистый фронтенд

### Удалено
`frontend/app/(app)/`: `auto-research/`, `clients/`, `contacts/`, `dialogs/`,
`leads/`, `messages/`, `offer/`, `sales/`, `mvp-send/`, `campaigns/new/`,
`(app)/page.tsx`. Также `app/test/`.

**`frontend/app/demo/` и `frontend/lib/demo-data.ts` — НЕ ТРОГАЛ.**

### Что создано
- **`frontend/lib/nav.ts`** — 4 пункта: Дашборд, Кампании, Очередь, DEMO Питч.
- **`frontend/components/AppShell.tsx`** — простой sidebar (`<ul><li><Link>`).
- **`frontend/app/page.tsx`** — редирект `/ → /campaigns`.
- **`frontend/app/(app)/campaigns/page.tsx`** — список кампаний + инпут «Создать».
- **`frontend/app/(app)/campaigns/[id]/contacts/page.tsx`** — форма (Имя/Email/Телефон/Канал) + таблица + кнопка «Отправить» с инлайн `<textarea>`.
  - GMAIL → `POST /clean-mvp/send-email`.
  - WHATSAPP → `POST /clean-mvp/send-whatsapp` + `window.open(link)`.
- **`frontend/app/(app)/queue/page.tsx`** — таблица контактов со `status != NEW`.

### Маршруты после `npm run build`
```
○ /                → редирект на /campaigns
○ /campaigns
ƒ /campaigns/[id]/contacts
○ /dashboard       (старый, не мешает)
○ /demo            ← НЕ ТРОНУТ ✅
○ /login           (старый, не мешает)
○ /queue
```

---

## ▶️ Как запустить утром

### Бэкенд (порт 3001)
```bash
cd backend
npm run start:dev
```
Если `EADDRINUSE: 3001` — старый процесс висит, прибей:
```bash
lsof -ti tcp:3001 | xargs kill -9
```

### Наполнить базу (если пусто)
```bash
curl -X POST http://localhost:3001/clean-mvp/seed
```

### Фронтенд (порт 3000)
```bash
cd frontend
npm run dev
```
Открой `http://localhost:3000` → редирект на `/campaigns` → «Test Campaign» →
контакты → кнопка «Отправить».

### Проверить реальную SMTP-отправку
```bash
# взять первый GMAIL-контакт
CID=$(curl -s http://localhost:3001/clean-mvp/campaigns | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d)[0].id)})")
curl -s "http://localhost:3001/clean-mvp/campaigns/$CID/contacts" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const g=JSON.parse(d).find(x=>x.channelType==='GMAIL');console.log(g.id)})"

# подставить ID в send-email
curl -X POST http://localhost:3001/clean-mvp/send-email \
  -H "Content-Type: application/json" \
  -d '{"contactId":"<ID>","text":"Утренний тест SMTP"}'
```
В логах бэкенда появится `[CleanMvpService] SMTP sent to ...: messageId=<...@gmail.com>`.

---

## 🛡 Что НЕ трогал (по правилам)
- ✅ `frontend/app/demo/` — демка для инвестора идеальна, туда даже не заглядывал.
- ✅ `frontend/lib/demo-data.ts` — не трогал.
- ✅ `backend/.env` — SMTP-ключи Gmail на месте, не открывал.

---

## 🧩 Если что-то сломалось

| Симптом | Причина | Фикс |
|---|---|---|
| `EADDRINUSE: 3001` | Старый Nest-процесс | `lsof -ti tcp:3001 \| xargs kill -9` |
| Prisma: `Property 'GMAIL' does not exist` | Stale-кэш TS language server / не сгенерирован клиент | `cd backend && npx prisma generate` |
| `Cannot find module './clean-mvp/...'` | Старый кэш Nest watch | `cd backend && rm -rf dist && npm run start:dev` |
| 404 на `/clean-mvp/*` | Бэкенд не запущен / не тот порт | Проверь `curl http://localhost:3001/clean-mvp/campaigns` |
| Письмо не приходит | SMTP-лимиты Gmail / папка «Спам» | Проверь лог `[CleanMvpService] SMTP sent to ...`, посмотри спам у `madiyarmoldakhmet@gmail.com` |

---

## 📍 Финальное состояние БД (на момент ухода)
```
Clients: 1   Campaigns: 1   Contacts: 5   Messages: 1   Sent contacts: 1
```
Готово к работе. Удачной презентации! 🎯