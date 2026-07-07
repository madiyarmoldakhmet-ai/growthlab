# Instagram Webhook (Meta → GrowthLab backend)

Эндпоинты живут в NestJS-бэкене (Fastify):

| Метод | URL | Назначение |
|------|-----|------------|
| `GET`  | `/instagram/webhook` | Верификация URL в панели Meta (`hub.verify_token`) |
| `POST` | `/instagram/webhook` | Приём входящих сообщений Instagram Direct |

Логика: `backend/src/instagram/instagram-webhook.service.ts`.
Контроллер: `backend/src/instagram/instagram.controller.ts`.

---

## 1. Переменные окружения (`backend/.env`)

```dotenv
# Придуманная строка-маркер. Её же впишите в Meta App Dashboard → Webhooks.
IG_WEBHOOK_VERIFY_TOKEN="my_super_secret_code_2026"

# Page/Instagram Access Token из Meta (Graph API Explorer / System User token).
IG_WEBHOOK_PAGE_ACCESS_TOKEN="..."

# Версия Graph API (по умолчанию v21.0).
IG_GRAPH_API_VERSION="v21.0"

# Разрешить эхо-ответ при отсутствии OpenAI (для отладки).
IG_WEBHOOK_FALLBACK_ECHO="true"

# Опционально: ключ OpenAI для «умных» ответов (gpt-4o-mini).
OPENAI_API_KEY="..."
```

Если `OPENAI_API_KEY` пуст — бот отвечает заглушкой/эхом.
Если `IG_WEBHOOK_PAGE_ACCESS_TOKEN` пуст — ответ не отправляется, но сообщение логируется.

---

## 2. Публичный URL

Вебхук должен быть доступен из интернета по HTTPS.

**Локальная разработка (вариант с ngrok):**
```bash
ngrok http 3001
# получите адрес вида https://abcd-123.ngrok-free.app
```

**Прод:** ваш домен с HTTPS-терминированием (Nginx/Caddy/Cloudflare), бэкенд слушает порт `3001`.

Итоговый Callback URL:
- локально: `https://<ngrok-домен>/instagram/webhook`
- на проде: `https://<ваш-домен>/instagram/webhook`

---

## 3. Настройка в Meta App Dashboard

1. Зайдите на https://developers.facebook.com/apps/ и выберите ваше приложение (тип **Business**).
2. В левом меню добавьте продукт **Messenger** (если ещё нет), а в нём — **Instagram Settings**.
3. В разделе **Webhooks** (или *Messenger → Webhooks*) нажмите **Add Callback URL**.
4. Заполните:
   - **Callback URL**: `https://<домен>/instagram/webhook`
   - **Verify Token**: точное значение из `IG_WEBHOOK_VERIFY_TOKEN` (например, `my_super_secret_code_2026`).
5. Нажмите **Verify and Save**. Meta пришлёт GET-запрос — бэкенд вернёт `hub.challenge`.
6. В **Webhook Fields** подпишитесь на нужные события:
   - для Instagram Direct: `messages`, `messaging_postbacks` (опционально).
7. В **Instagram Settings** (или *Messenger → Access Tokens*) привяжите Instagram-аккаунт и получите **Page/Instagram Access Token** — вставьте его в `IG_WEBHOOK_PAGE_ACCESS_TOKEN`.

> Если Meta пишет «Проверка URL обратного вызова или маркера подтверждения не пройдена»:
> - проверьте, что бэкенд запущен и публично доступен по HTTPS;
> - `IG_WEBHOOK_VERIFY_TOKEN` в `.env` **байт-в-байт** совпадает с полем Verify Token в панели Meta;
> - в логе бэкенда будет строка вида `Несовпадение verify_token...` или `Вебхук Instagram успешно верифицирован`.

---

## 4. Локальная проверка без Meta

**Проверка верификации (GET):**
```bash
curl -i "http://localhost:3001/instagram/webhook?hub.mode=subscribe&hub.verify_token=my_super_secret_code_2026&hub.challenge=CHALLENGE123"
# Ожидается: HTTP/1.1 200 + тело CHALLENGE123
```

Неверный токен:
```bash
curl -i "http://localhost:3001/instagram/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=X"
# Ожидается: HTTP/1.1 403
```

**Проверка приёма (POST, имитация входящего сообщения):**
```bash
curl -i -X POST http://localhost:3001/instagram/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"instagram","entry":[{"messaging":[{"sender":{"id":"123"},"message":{"text":"Привет!","mid":"m1"}}]}]}'
# Ожидается: 200 {"status":"OK"} + попытка отправить ответ через Graph API
```

---

## 5. Сценарий ответа

1. Пользователь пишет в Instagram Direct вашего аккаунта.
2. Meta шлёт `POST /instagram/webhook` с событием `messages`.
3. Сервис:
   - игнорирует собственные эхо-сообщения (`is_echo=true`);
   - берёт текст пользователя;
   - если задан `OPENAI_API_KEY` — зовёт GPT-4o-mini с маркетинговым системным промтом;
   - иначе — возвращает эхо/заглушку (управляется `IG_WEBHOOK_FALLBACK_ECHO`);
   - отправляет ответ через Send API `POST /v21.0/me/messages`.
4. Ответ появляется в Direct.

---

## 6. Безопасность

- `IG_WEBHOOK_VERIFY_TOKEN` — секретная строка, не коммитьте её в репозиторий (`.env` уже в `.gitignore`).
- `IG_WEBHOOK_PAGE_ACCESS_TOKEN` — эквивалент ключа от аккаунта, храните в секрете.
- (Опционально) Проверка подписи `X-Hub-Signature-256` HMAC-SHA256 — в текущей реализации опущена для простоты; добавьте, если требуете верификации подлинности самого payload от Meta.