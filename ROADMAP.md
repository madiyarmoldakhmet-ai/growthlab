# ROADMAP — GrowthLab

Фазы реализации cold-email бота с AI-персонализацией. Работаем **по одной фазе за раз**:
фаза → сборка/проверка → коммит → отчёт → ждём `next`. Push — только по подтверждению владельца.

Легенда: `[ ]` не начато · `[~]` в работе · `[x]` готово.

---

## Ф0 — Фундамент *(до бизнес-логики)* ✅
Цель: привести каркас к правилам из `CLAUDE.md`.
- [x] `@nestjs/config` + `ConfigService`, типобезопасная валидация env (`env.validation.ts`).
- [x] Единый глобальный `PrismaModule`/`PrismaService` (дубль `gmail-prisma.service.ts` удалён).
- [x] Модель `Organization` + `organizationId` на `User/Contact/Campaign`; auth-скоуп по `organizationId` (legacy-заглушка убрана).
- [x] Глобальный `AllExceptionsFilter` → единый формат ошибок (response envelope).
- [x] Каркас тестов (jest + ts-jest), smoke-тесты (env-валидация, AI-fallback) — 7 проходят.
- [x] ESLint flat config для backend (`npm run lint`).
- **Exit:** ✅ собирается, тесты зелёные, lint без ошибок; контакты/кампании изолированы по организации; миграцию применяет владелец (`npm run prisma:migrate`).

## Ф1 — Доменные модели + миграции ✅
Цель: схема под весь пайплайн.
- [x] Модели: `Lead`, `Channel`, `Campaign`(+goal/channel/audience/dates), `Message`(+идемпотентность/provider/step/unsubscribeToken), `CampaignLead`, `Event`(воронка), `Response`(+AI sentiment), `SuppressionEntry`, `Consent`.
- [x] `Message`/`Setting`/`Response` переведены на `organizationId`.
- [x] Связи + индексы (планировщик `[org,status,scheduledAt]`, аналитика `[campaign,type,occurredAt]`); дедуп вебхуков и идемпотентность через unique-констрейнты.
- [x] Миграция `20260628010000_domain_models` создана и **применена к Neon** (`migrate deploy`); схема прошла адверсариальное ревью (41 находка, blocker'ы устранены).
- **Exit:** ✅ migrate применён, 6 новых таблиц в БД, build+11 тестов+lint зелёные. Модель покрывает воронку `docs/pitch/README.md`.

## Ф2 — Лидогенерация (leads) ✅
Цель: наполнять базу лидов.
- [x] Интерфейс `LeadSourceAdapter` (имя — чтобы не конфликтовать с Prisma-enum `LeadSource`).
- [x] `ApolloAdapter` (ключ из ConfigService; прямой HTTP с `TODO(Ф6)` на очередь BullMQ).
- [x] CSV-импорт fallback: общий парсер вынесен в `common/csv` + `common/normalize`, переиспользуется contacts и leads.
- [x] Дедуп по `(organizationId, email)` (in-batch + против БД + `createMany skipDuplicates`), нормализация email.
- [x] Эндпоинты `GET /leads`, `POST /leads/import/csv`, `POST /leads/search/apollo` (JWT, org-scope).
- **Exit:** ✅ лиды из Apollo и CSV пишутся в `leads` без дублей; build + 23 теста + lint зелёные. (Миграция не нужна — таблица из Ф1.)

## Ф3 — Верификация (verification) ✅
Цель: чистить базу перед отправкой.
- [x] Интерфейс `EmailVerifier`.
- [x] `ZeroBounceAdapter` (ключ из ConfigService; статусы valid/invalid/catch_all/risky/unknown; HTTP прямой + `TODO(Ф6)` на очередь).
- [x] Статус на лиде (`verificationStatus` + `verifiedAt`); гейт `isSendable` (valid/catch_all) — Ф5 не шлёт невалидным.
- [x] Кэш: повторно не верифицируем (фильтр `verificationStatus='unverified'`; single — флаг `force`).
- [x] Эндпоинты `POST /verification/leads/:id`, `POST /verification/run` (JWT, org-scope). COGS — `TODO(Ф7)`.
- **Exit:** ✅ каждый лид получает статус верификации; build + 38 тестов + lint зелёные. (Миграция не нужна — поля из Ф1.)

## Ф4 — Персонализация (personalization)
Цель: AI-письма.
- [ ] Генерация subject/body/follow-up через OpenAI (`OPENAI_API_KEY`), через очередь.
- [ ] Промпт-шаблон в конфиг, контроль спам-триггеров.
- [ ] Учёт расхода токенов (таблица `ai_requests`), обязательный footer (отправитель + unsubscribe).
- **Exit:** для лида генерируется персональное письмо; расход токенов виден.

## Ф5 — Отправка (sending)
Цель: управляемая доставка email.
- [ ] Интерфейс `ChannelSender` + Email-адаптер (Smartlead/SMTP/Gmail — выбрать).
- [ ] **`DRY_RUN=true` по умолчанию** — письма не уходят, только лог.
- [ ] Ротация ящиков, дневные лимиты, throttle; идемпотентный ключ на сообщение.
- [ ] Вебхуки delivered/open/bounce → события воронки.
- **Exit:** в DRY_RUN видно «что бы отправилось»; реальная отправка только при `DRY_RUN=false`.

## Ф6 — Кампании + планировщик (campaigns + scheduler)
Цель: автономная работа.
- [ ] Секвенции (письмо + follow-up), рабочие часы/таймзоны.
- [ ] `@nestjs/schedule` + BullMQ: autoresearch (поиск лидов) + рассылка по расписанию.
- [ ] Стоп на ответе/отписке; A/B-тест писем.
- **Exit:** кампания сама шлёт по расписанию и останавливается по правилам.

## Ф7 — Аналитика (analytics)
Цель: измеримая воронка.
- [ ] Агрегация событий → этапы воронки (sent/delivered/opened/replied/positive/demo/won).
- [ ] Метрики: deliverability, open, reply, conversion, CAC, COGS, LTV.
- [ ] Эндпоинты для дашборда фронта.
- **Exit:** дашборд показывает реальную воронку «1000 → 2–3 клиента».

---

## Позже / вне MVP
- **Ф8 — доп. каналы (официально):** Telegram Bot API + WhatsApp Business Cloud API, opt-in, шаблоны.
- **Compliance-расширение:** consent-лог для TG/WA, расширенные suppression-правила.
- **Заморожено:** текущий WhatsApp на Baileys — deprecated, не расширять.

## Принципы
- Каждый внешний сервис — за интерфейсом-адаптером.
- Все внешние вызовы — через BullMQ+Redis (ретраи, rate-limit).
- Идемпотентность + аудит событий + compliance — не в конце, а сразу в дизайне каждой фазы.
- Секреты только в `.env`; новые ключи — заглушками в `.env.example`.
