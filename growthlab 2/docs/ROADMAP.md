# Growth Lab Roadmap

## 1. Принципы развития

Growth Lab должен развиваться от надежного инструмента для контактов и outreach-кампаний к AI-assisted growth platform.

Приоритеты:

- сначала надежное хранение данных;
- затем стабильные коммуникации;
- затем аналитика;
- затем автоматизация;
- AI должен помогать пользователю, а не принимать необратимые решения без подтверждения.

## 2. Phase 0: Архитектурная фиксация

Цель: описать систему и согласовать направление.

Deliverables:

- `docs/ARCHITECTURE.md`;
- `docs/DATABASE.md`;
- `docs/API.md`;
- `docs/ROADMAP.md`.

Exit criteria:

- определены основные домены;
- зафиксирована текущая user-scoped модель;
- описаны целевые API;
- выделены ближайшие продуктовые фазы.

## 3. Phase 1: Стабилизация backend foundation

Цель: привести текущие backend-модули к production-ready основе.

Scope:

- Auth: стабилизировать login/logout/JWT.
- Contacts: перевести runtime-хранение на PostgreSQL/Prisma.
- Campaigns: перевести runtime-хранение на PostgreSQL/Prisma.
- Messages: сделать явный service/API для исходящих сообщений.
- Responses: сделать явный service/API для входящих ответов.
- Settings: использовать для пользовательских предпочтений, но не для секретов.

Exit criteria:

- контакты не теряются после перезапуска сервера;
- кампании не теряются после перезапуска сервера;
- все приватные данные фильтруются по `user_id`;
- ошибки API возвращаются в едином формате.

## 4. Phase 2: Контакты и импорт

Цель: сделать базу контактов надежной.

Scope:

- CRUD контактов.
- CSV import.
- Excel import.
- Preview перед импортом.
- Отчет по импорту.
- Дедупликация по email/phone.
- Нормализация телефона.
- Source и position как полноценные поля.
- Поиск и фильтры.

Exit criteria:

- пользователь может загрузить базу;
- система показывает количество импортированных и пропущенных дублей;
- пользователь может быстро найти контакт;
- база контактов готова для кампаний.

## 5. Phase 3: Кампании и аудитории

Цель: сделать кампании рабочей единицей продукта.

Scope:

- Campaign CRUD.
- Статусы: draft, active, paused, completed, archived.
- Добавление контактов в кампанию.
- Исключение контактов из кампании.
- Цель кампании.
- Канал кампании.
- Даты старта и завершения.
- Базовая аналитика кампании.

Exit criteria:

- пользователь может создать кампанию;
- пользователь может добавить контакты;
- пользователь может видеть статус и состав кампании;
- кампания связывает контакты, сообщения и ответы.

## 6. Phase 4: Сообщения и WhatsApp

Цель: сделать отправку и получение сообщений управляемыми.

Scope:

- WhatsApp connect/disconnect.
- QR flow.
- WhatsApp status.
- Создание сообщения.
- Отправка сообщения контакту.
- Связь message -> contact -> campaign.
- Статусы: queued, sent, delivered, failed.
- Входящие WhatsApp-сообщения.
- История message events.
- Обработка ошибок отправки.

Exit criteria:

- пользователь видит статус WhatsApp;
- пользователь может отправить сообщение контакту;
- доставка и ошибки сохраняются;
- входящий ответ связывается с контактом и кампанией, если это возможно.

## 7. Phase 5: AI Assistant

Цель: встроить AI в ежедневный outreach workflow.

Scope:

- Generate message.
- Improve text.
- Evaluate response.
- Classify lead.
- Сохранение AI-результатов в responses.
- Журнал AI-запросов.
- Fallback без API key.
- Нормализованные lead categories.

Lead categories:

- interest;
- not_interested;
- price;
- call;
- follow_up_later.

Exit criteria:

- пользователь может сгенерировать сообщение;
- пользователь может улучшить текст;
- ответ лида получает score, summary и next action;
- AI-ошибки не ломают основной workflow.

## 8. Phase 6: Dashboard и аналитика

Цель: дать пользователю ясную картину эффективности.

Scope:

- Overview dashboard.
- Campaign analytics.
- Contact growth.
- Message status funnel.
- Delivery rate.
- Response rate.
- Positive response rate.
- Lead category distribution.
- Failed message report.

Exit criteria:

- пользователь видит общее состояние базы и кампаний;
- можно сравнить кампании по результативности;
- ошибки доставки становятся видимыми.

## 9. Phase 7: Массовые операции и фоновые задачи

Цель: подготовить продукт к большим объемам.

Scope:

- Background job queue.
- Async imports.
- Bulk message scheduling.
- Rate limits per channel.
- Retry failed messages.
- Cancel scheduled batch.
- Progress tracking.

Exit criteria:

- большие импорты не блокируют API;
- массовая отправка контролируется лимитами;
- пользователь видит прогресс операций.

## 10. Phase 8: Интеграции

Цель: расширить каналы и источники данных.

Candidate integrations:

- Email provider.
- SMS provider.
- Telegram.
- HubSpot.
- Salesforce.
- Google Sheets.
- Webhooks.

Scope:

- integration credentials;
- encrypted secrets;
- sync runs;
- integration logs;
- provider adapter interface.

Exit criteria:

- можно безопасно подключить внешний сервис;
- сбои интеграций видны пользователю;
- core data не зависит напрямую от конкретного провайдера.

## 11. Phase 9: Workspace model

Цель: перейти от индивидуальной модели к командной работе.

Scope:

- Workspaces.
- Memberships.
- Roles.
- Shared contacts.
- Shared campaigns.
- Team analytics.
- Invite flow.

Exit criteria:

- несколько пользователей работают в одном workspace;
- доступы управляются ролями;
- данные корректно изолированы между workspace.

## 12. MVP Definition

MVP должен включать:

- login/logout;
- contacts CRUD;
- CSV/Excel import;
- deduplication;
- campaigns CRUD;
- WhatsApp status/connect/QR;
- send WhatsApp message;
- message history;
- incoming responses;
- AI generate message;
- AI evaluate response;
- basic dashboard.

MVP не должен включать:

- сложные workspace permissions;
- billing;
- multi-channel automation;
- CRM deals pipeline;
- advanced AI agents;
- external CRM sync;
- enterprise audit controls.

## 13. Технические риски

### In-memory storage

Текущие сервисы контактов и кампаний используют runtime-хранилище. Это подходит для прототипа, но не для production. Нужно перейти на Prisma/PostgreSQL.

### WhatsApp reliability

WhatsApp-подключение может быть нестабильным. Нужны статусы, retry, reconnect и понятные ошибки.

### AI encoding and localization

В текущем AI-коде видны признаки проблемы с кодировкой русских строк. Нужно нормализовать исходники в UTF-8 и хранить enum отдельно от локализованных подписей.

### Data isolation

Все запросы должны быть ограничены текущим `user_id`. Без этого есть риск утечки данных между пользователями.

### Bulk sending limits

Массовая отправка без лимитов может привести к блокировкам каналов и плохому UX. Нужны лимиты, очереди и подтверждение пользователя.

## 14. Product metrics

Метрики самого Growth Lab:

- активные пользователи;
- количество импортированных контактов;
- процент дублей при импорте;
- количество созданных кампаний;
- количество активных кампаний;
- messages sent per user;
- delivery rate;
- response rate;
- AI generation usage;
- AI evaluation usage;
- positive lead rate;
- call intent rate.

## 15. Recommended Next Step

После документационной фазы следующий агент должен выбрать Phase 1 и подготовить техническую спецификацию реализации без расширения продуктового scope.
