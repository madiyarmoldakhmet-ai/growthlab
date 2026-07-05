# Growth Lab Database Design

## 1. Назначение базы данных

База Growth Lab хранит пользователей, контакты, кампании, сообщения, ответы, настройки и данные интеграций. Рекомендуемая СУБД - PostgreSQL. ORM-слой - Prisma.

Документ описывает целевую модель, совместимую с текущими сущностями проекта.

## 2. Общие правила

- Primary key: UUID.
- Таблицы: snake_case во множественном числе.
- Время создания и обновления: `created_at`, `updated_at`.
- Внешние ключи: `{entity}_id`.
- Для пользовательских данных обязательно хранить `user_id`.
- Для гибких внешних payload использовать `jsonb`.
- Индексировать все foreign key и основные фильтры.

## 3. Текущие основные enum

### user_role

- `admin`
- `member`

### campaign_status

- `draft`
- `active`
- `paused`
- `completed`
- `archived`

### message_status

- `queued`
- `sent`
- `delivered`
- `failed`

## 4. users

Глобальная учетная запись пользователя.

Поля:

- `id`
- `email`
- `password_hash`
- `name`
- `role`
- `created_at`
- `updated_at`

Индексы и ограничения:

- unique index на `email`.

Связи:

- user has many contacts;
- user has many campaigns;
- user has many messages;
- user has many settings.

## 5. contacts

Контакты пользователя: лиды, клиенты, потенциальные получатели коммуникаций.

Поля:

- `id`
- `user_id`
- `email`
- `phone`
- `first_name`
- `last_name`
- `company`
- `metadata`
- `created_at`
- `updated_at`

Рекомендуемые дополнительные поля:

- `position`
- `source`
- `status`
- `last_contacted_at`
- `last_response_at`
- `lead_score`
- `lead_category`

Индексы:

- `user_id`
- `email`
- `phone`
- `user_id, email`
- `user_id, phone`

Правила:

- Дедупликация: сначала по normalized email, затем по normalized phone.
- Контакт без email и phone не должен импортироваться в массовых сценариях.
- `metadata` хранит дополнительные поля импорта, но не заменяет основные колонки.

## 6. campaigns

Кампании для группировки сообщений и анализа результата.

Поля:

- `id`
- `user_id`
- `name`
- `description`
- `status`
- `starts_at`
- `ends_at`
- `created_at`
- `updated_at`

Рекомендуемые дополнительные поля:

- `goal`
- `channel`
- `audience`
- `offer`
- `tone`
- `created_by_user_id`

Индексы:

- `user_id`
- `status`
- `user_id, status`
- `starts_at`
- `ends_at`

Правила:

- Новая кампания создается в `draft`, если статус не указан.
- Отправка сообщений разрешается только для `active` или явно подтвержденных кампаний.
- `archived` не удаляет связанные сообщения и ответы.

## 7. messages

Исходящие сообщения.

Поля:

- `id`
- `user_id`
- `campaign_id`
- `contact_id`
- `channel`
- `subject`
- `body`
- `status`
- `scheduled_at`
- `sent_at`
- `created_at`
- `updated_at`

Рекомендуемые дополнительные поля:

- `provider`
- `provider_message_id`
- `delivered_at`
- `failed_at`
- `failure_reason`
- `ai_generated`
- `ai_prompt_metadata`

Индексы:

- `user_id`
- `campaign_id`
- `contact_id`
- `status`
- `user_id, status`
- `campaign_id, status`
- `scheduled_at`

Правила:

- `body` обязателен.
- `channel` должен быть enum в целевой модели: `whatsapp`, `email`, `sms`, `manual`.
- `campaign_id` и `contact_id` могут быть nullable, но production-сценарии отправки должны стремиться связывать сообщение с контактом.

## 8. responses

Входящие ответы контактов.

Поля:

- `id`
- `message_id`
- `contact_id`
- `campaign_id`
- `body`
- `metadata`
- `received_at`
- `created_at`

Рекомендуемые дополнительные поля:

- `user_id`
- `channel`
- `provider`
- `provider_response_id`
- `lead_category`
- `lead_score`
- `summary`
- `next_action`
- `ai_evaluated_at`

Индексы:

- `message_id`
- `contact_id`
- `campaign_id`
- `user_id`
- `received_at`
- `lead_category`

Правила:

- Ответ всегда должен ссылаться на message, если его можно сопоставить.
- Для аналитики желательно денормализовать `user_id`, даже если он выводится через message.
- AI-оценка ответа должна храниться отдельно от исходного текста.

## 9. settings

Настройки пользователя или системные настройки.

Поля:

- `id`
- `user_id`
- `key`
- `value`
- `created_at`
- `updated_at`

Индексы и ограничения:

- unique: `user_id, key`;
- index: `key`.

Примеры ключей:

- `ai.default_model`
- `ai.default_tone`
- `whatsapp.connection_state`
- `campaign.default_channel`
- `notifications.email_digest`

Правила:

- Секреты не должны храниться в обычном `settings.value`.
- Для токенов и credentials нужна отдельная таблица с шифрованием.

## 10. recommended: integration_credentials

Целевая таблица для секретов интеграций.

Поля:

- `id`
- `user_id`
- `provider`
- `credential_type`
- `encrypted_payload`
- `expires_at`
- `created_at`
- `updated_at`

Индексы:

- `user_id`
- `provider`
- unique: `user_id, provider, credential_type`

Правила:

- Не хранить plaintext access token.
- Логи не должны выводить `encrypted_payload`.

## 11. recommended: whatsapp_sessions

Состояние WhatsApp-подключения.

Поля:

- `id`
- `user_id`
- `status`
- `phone_number`
- `qr_expires_at`
- `last_connected_at`
- `last_disconnected_at`
- `metadata`
- `created_at`
- `updated_at`

Статусы:

- `disconnected`
- `connecting`
- `qr_required`
- `connected`
- `error`

## 12. recommended: ai_requests

Журнал AI-операций для наблюдаемости, лимитов и аудита.

Поля:

- `id`
- `user_id`
- `operation`
- `provider`
- `model`
- `input_metadata`
- `output_metadata`
- `status`
- `error_message`
- `created_at`

Операции:

- `generate_message`
- `improve_text`
- `classify_lead`
- `evaluate_response`

Не хранить чувствительные данные без явного продуктового решения.

## 13. recommended: campaign_contacts

Join-таблица для явного состава кампании.

Поля:

- `id`
- `campaign_id`
- `contact_id`
- `status`
- `added_at`
- `removed_at`

Индексы:

- `campaign_id`
- `contact_id`
- unique: `campaign_id, contact_id`

Статусы:

- `active`
- `excluded`
- `completed`

## 14. recommended: message_events

История событий по сообщению.

Поля:

- `id`
- `message_id`
- `event_type`
- `provider`
- `provider_event_id`
- `metadata`
- `created_at`

Типы событий:

- `queued`
- `sent`
- `delivered`
- `failed`
- `incoming_response`
- `status_updated`

Правило:

- Таблица append-only.

## 15. Связи

Основные связи:

- User 1:N Contact.
- User 1:N Campaign.
- User 1:N Message.
- User 1:N Setting.
- Campaign 1:N Message.
- Campaign 1:N Response.
- Contact 1:N Message.
- Contact 1:N Response.
- Message 1:N Response.
- Message 1:N MessageEvent.

## 16. Миграционная стратегия

Ближайшие шаги для базы:

1. Убедиться, что runtime-сервисы используют Prisma, а не in-memory Map.
2. Добавить `phone` индекс с учетом нормализованного телефона.
3. Добавить `user_id` в `responses` для простых и безопасных запросов.
4. Вынести WhatsApp-состояние из памяти в таблицу.
5. Добавить журнал message events.
6. Добавить таблицу AI requests.
7. Добавить campaign_contacts для массовых кампаний.

## 17. Данные для аналитики

Минимальные вычисляемые метрики:

- total contacts;
- total campaigns;
- active campaigns;
- messages sent;
- messages delivered;
- messages failed;
- delivery rate;
- responses count;
- response rate;
- positive responses;
- call intent count.

На первом этапе эти метрики можно считать SQL-запросами. При росте нагрузки можно добавить materialized views или отдельные reporting tables.
