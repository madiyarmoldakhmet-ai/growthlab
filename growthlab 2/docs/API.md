# Growth Lab API Design

## 1. Общий подход

API Growth Lab - HTTP JSON API для управления контактами, кампаниями, сообщениями, WhatsApp и AI-функциями.

Рекомендуемый базовый префикс:

`/api/v1`

Текущие контроллеры используют короткие пути вроде `/contacts`, `/campaigns`, `/auth`, `/whatsapp`. Целевая версия должна стабилизировать их под версионированным API.

## 2. Формат ответов

Рекомендуемый success envelope:

```json
{
  "data": {},
  "meta": {}
}
```

Рекомендуемый list envelope:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 25,
    "total_count": 0,
    "total_pages": 0
  }
}
```

Рекомендуемый error envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request.",
    "details": []
  }
}
```

## 3. Auth

### POST /api/v1/auth/login

Вход пользователя.

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "data": {
    "access_token": "jwt",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "member"
    }
  }
}
```

### POST /api/v1/auth/logout

Выход текущего пользователя. Требует JWT.

### GET /api/v1/auth/admin

Проверка административного доступа. Требует JWT и роль `admin`.

## 4. Contacts

### GET /api/v1/contacts

Список контактов текущего пользователя.

Query:

- `page`
- `page_size`
- `q`
- `company`
- `source`

### GET /api/v1/contacts/{id}

Получить контакт.

### POST /api/v1/contacts

Создать контакт.

Request:

```json
{
  "firstName": "Ivan",
  "lastName": "Petrov",
  "email": "ivan@example.com",
  "phone": "+77000000000",
  "company": "Example Co",
  "position": "CEO",
  "source": "manual"
}
```

Правила:

- email приводится к lower-case;
- phone нормализуется;
- дубли проверяются по email или phone.

### PATCH /api/v1/contacts/{id}

Обновить контакт.

### DELETE /api/v1/contacts/{id}

Удалить контакт.

Response:

```json
{
  "data": {
    "deleted": true
  }
}
```

### POST /api/v1/contacts/deduplicate

Удалить дубли в базе пользователя.

Response:

```json
{
  "data": {
    "imported": 0,
    "skippedDuplicates": 3,
    "contacts": []
  }
}
```

### POST /api/v1/contacts/import/csv

Импорт CSV через multipart field `file`.

### POST /api/v1/contacts/import/excel

Импорт Excel через multipart field `file`.

## 5. Campaigns

### GET /api/v1/campaigns

Список кампаний.

Query:

- `status`
- `page`
- `page_size`

### POST /api/v1/campaigns

Создать кампанию.

Request:

```json
{
  "name": "June outbound",
  "description": "Outreach to warm leads",
  "status": "draft",
  "startsAt": "2026-06-24T00:00:00.000Z",
  "endsAt": "2026-07-01T00:00:00.000Z"
}
```

### GET /api/v1/campaigns/{id}

Целевой endpoint. В текущем контроллере может отсутствовать, но нужен для полноценного API.

### PATCH /api/v1/campaigns/{id}

Обновить кампанию.

### DELETE /api/v1/campaigns/{id}

Удалить кампанию. Рекомендуемый ответ: `204 No Content`.

### POST /api/v1/campaigns/{id}/activate

Целевой endpoint для безопасного перехода в `active`.

### POST /api/v1/campaigns/{id}/pause

Целевой endpoint для паузы.

### POST /api/v1/campaigns/{id}/complete

Целевой endpoint для завершения.

## 6. Campaign Contacts

Целевые endpoints для массовых кампаний.

### GET /api/v1/campaigns/{campaign_id}/contacts

Список контактов в кампании.

### POST /api/v1/campaigns/{campaign_id}/contacts

Добавить контакты в кампанию.

Request:

```json
{
  "contact_ids": ["uuid-1", "uuid-2"]
}
```

### DELETE /api/v1/campaigns/{campaign_id}/contacts/{contact_id}

Исключить контакт из кампании.

## 7. Messages

Целевой API для сообщений.

### GET /api/v1/messages

Список сообщений.

Query:

- `campaign_id`
- `contact_id`
- `status`
- `channel`

### POST /api/v1/messages

Создать сообщение без немедленной отправки.

Request:

```json
{
  "campaign_id": "uuid",
  "contact_id": "uuid",
  "channel": "whatsapp",
  "subject": null,
  "body": "Здравствуйте! Хотел обсудить..."
}
```

### POST /api/v1/messages/{id}/send

Отправить сохраненное сообщение.

### POST /api/v1/messages/send

Создать и отправить сообщение одним действием.

## 8. WhatsApp

Текущая функциональность уже представлена отдельным контроллером.

### POST /api/v1/whatsapp/connect

Начать подключение WhatsApp.

Response:

```json
{
  "data": {
    "status": "connecting"
  }
}
```

### POST /api/v1/whatsapp/disconnect

Отключить WhatsApp.

### GET /api/v1/whatsapp/status

Получить статус подключения.

### GET /api/v1/whatsapp/qr

Получить QR для подключения, если он требуется.

Response:

```json
{
  "data": {
    "qr": "base64-or-text",
    "status": "qr_required"
  }
}
```

### POST /api/v1/whatsapp/messages

Отправить WhatsApp-сообщение.

Request:

```json
{
  "to": "+77000000000",
  "body": "Здравствуйте!"
}
```

Целевая версия должна также принимать:

- `contact_id`;
- `campaign_id`;
- `message_id`.

### GET /api/v1/whatsapp/messages

Список WhatsApp-сообщений.

### GET /api/v1/whatsapp/messages/incoming

Входящие сообщения.

### GET /api/v1/whatsapp/messages/statuses

Статусы сообщений.

## 9. AI

Целевые endpoints для уже существующих AI-сервисных операций.

### POST /api/v1/ai/generate-message

Сгенерировать сообщение.

Request:

```json
{
  "product": "Growth Lab",
  "audience": "B2B founders",
  "goal": "book a discovery call",
  "channel": "whatsapp",
  "tone": "professional and friendly",
  "contactName": "Ivan",
  "companyName": "Example Co",
  "context": "Warm lead from event",
  "maxLength": 500
}
```

Response:

```json
{
  "data": {
    "subject": null,
    "body": "..."
  }
}
```

### POST /api/v1/ai/improve-text

Улучшить текст.

Request:

```json
{
  "text": "Draft text",
  "goal": "get reply",
  "tone": "friendly",
  "maxLength": 300
}
```

### POST /api/v1/ai/evaluate-response

Оценить ответ лида.

Request:

```json
{
  "response": "Сколько стоит?",
  "goal": "book a call",
  "originalMessage": "Здравствуйте..."
}
```

Response:

```json
{
  "data": {
    "score": 70,
    "category": "price",
    "summary": "Lead asked about pricing.",
    "nextAction": "Send pricing or ask qualification questions."
  }
}
```

### POST /api/v1/ai/classify-lead

Классифицировать лид по сообщению.

Request:

```json
{
  "message": "Давайте созвонимся",
  "context": "Reply to outbound campaign"
}
```

## 10. Responses

Целевой API для входящих ответов.

### GET /api/v1/responses

Список ответов.

Query:

- `campaign_id`
- `contact_id`
- `message_id`
- `lead_category`

### GET /api/v1/responses/{id}

Получить ответ.

### POST /api/v1/responses/{id}/evaluate

Запустить AI-оценку ответа и сохранить результат.

## 11. Settings

### GET /api/v1/settings

Список настроек пользователя.

### PATCH /api/v1/settings/{key}

Изменить настройку.

Request:

```json
{
  "value": {}
}
```

## 12. Analytics

Целевые endpoints.

### GET /api/v1/analytics/overview

Общий dashboard.

Метрики:

- contacts count;
- campaigns count;
- active campaigns;
- messages sent;
- delivery rate;
- response rate.

### GET /api/v1/analytics/campaigns/{campaign_id}

Аналитика кампании.

Метрики:

- total contacts;
- messages queued;
- messages sent;
- messages delivered;
- messages failed;
- responses;
- positive responses;
- call intent count.

## 13. Импорты

Импорт контактов уже доступен через contacts endpoints. Для больших файлов целевая архитектура должна перейти к async import jobs.

### POST /api/v1/imports/contacts

Создать import job.

### GET /api/v1/imports/{id}

Получить статус import job.

## 14. Коды ошибок

Рекомендуемые коды:

- `unauthorized`
- `forbidden`
- `not_found`
- `validation_error`
- `duplicate_contact`
- `whatsapp_not_connected`
- `message_send_failed`
- `ai_provider_unavailable`
- `import_failed`
- `internal_error`

## 15. Версионирование

Breaking changes требуют нового major-префикса:

- `/api/v1`
- `/api/v2`

Внутри версии можно добавлять поля, но нельзя менять смысл существующих enum и response fields без миграционного периода.
