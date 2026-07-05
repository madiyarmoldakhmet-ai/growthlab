import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../config/configuration';

/**
 * Shape of a Meta webhook verification request (GET /webhook).
 */
export interface WebhookVerificationQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

/**
 * Minimal typing for the incoming Meta webhook payload (POST /webhook).
 * Only the fields we actually read are typed; everything else stays `unknown`.
 */
interface IgWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: {
        mid?: string;
        text?: string;
        is_echo?: boolean;
      };
    }>;
  }>;
}

/**
 * Result of a webhook verification attempt.
 */
export type VerifyResult =
  | { ok: true; challenge: string }
  | { ok: false; reason: 'mode' | 'token' };

/**
 * InstagramWebhookService
 *
 * Принимает и обрабатывает вебхуки Messenger/Instagram от Meta:
 *  - верификация `hub.verify_token` (подтверждение URL в панели Meta);
 *  - приём входящих сообщений из Instagram Direct;
 *  - генерация ответа (через OpenAI, если задан OPENAI_API_KEY, иначе эхо);
 *  - отправка ответа обратно в Direct через Graph API.
 *
 * Эндпоинты см. в `InstagramController`: GET/POST `/instagram/webhook`.
 */
@Injectable()
export class InstagramWebhookService {
  private readonly logger = new Logger(InstagramWebhookService.name);

  constructor(
    private readonly config: ConfigService<AppConfiguration, true>,
    @Inject('WEBHOOK_FALLBACK_ECHO')
    private readonly fallbackEchoEnabled: boolean,
  ) {}

  /** Verify Token, который вы сами придумываете и вписываете в панель Meta. */
  private get verifyToken(): string {
    return this.config.get('instagram.webhookVerifyToken', { infer: true }) ?? '';
  }

  /** Page/Instagram access token для отправки ответов через Graph API. */
  private get pageAccessToken(): string {
    return this.config.get('instagram.webhookPageAccessToken', { infer: true }) ?? '';
  }

  /** Ключ OpenAI (опционально). Если нет — бот отвечает эхо/заглушкой. */
  private get openAiApiKey(): string {
    return this.config.get('instagram.openAiApiKey', { infer: true }) ?? '';
  }

  /** Версия Graph API, по умолчанию v21.0. */
  private get graphApiVersion(): string {
    return this.config.get('instagram.graphApiVersion', { infer: true }) ?? 'v21.0';
  }

  /**
   * Обработка GET-запроса верификации от Meta.
   * Meta присылает `hub.mode=subscribe`, `hub.verify_token` и `hub.challenge`.
   * Если токен совпадает — возвращаем `hub.challenge`, иначе 403.
   */
  verify(query: WebhookVerificationQuery): VerifyResult {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode !== 'subscribe') {
      return { ok: false, reason: 'mode' };
    }

    if (!this.verifyToken) {
      this.logger.error(
        'IG_WEBHOOK_VERIFY_TOKEN не задан — верификация вебхука невозможна. Пропишите его в .env.',
      );
      return { ok: false, reason: 'token' };
    }

    if (token !== this.verifyToken) {
      this.logger.warn(`Несовпадение verify_token: получено "${token}", ожидалось "<скрыто>".`);
      return { ok: false, reason: 'token' };
    }

    if (!challenge) {
      this.logger.warn('hub.challenge отсутствует в запросе верификации.');
      return { ok: false, reason: 'token' };
    }

    this.logger.log('Вебхук Instagram успешно верифицирован Meta.');
    return { ok: true, challenge };
  }

  /**
   * Обработка POST-запроса с событиями от Meta.
   * Возвращаем всегда 200 OK, чтобы Meta не повторяла отправку.
   */
  async handleEvent(rawPayload: unknown): Promise<{ status: 'OK' }> {
    // Дамп полного тела — для отладки. Уберите в проде, если шумит.
    this.logger.log(
      `Получен POST от Meta. Тело: ${JSON.stringify(rawPayload).slice(0, 500)}`,
    );

    const payload = this.asIgPayload(rawPayload);
    if (!payload || payload.object !== 'instagram') {
      this.logger.warn(
        `Пропускаем payload: object="${payload?.object ?? ''}" (не instagram или пустой). ` +
          'Если тело пустое {} — проверь, что ValidationPipe в main.ts не режет его.',
      );
      return { status: 'OK' };
    }

    const entries = payload.entry ?? [];
    this.logger.log(`Payload валиден. entry count: ${entries.length}.`);

    for (const entry of entries) {
      const events = entry.messaging ?? [];
      this.logger.log(`Entry id=${entry.id ?? '?'}: messaging count=${events.length}.`);
      for (const event of events) {
        await this.processMessagingEvent(event);
      }
    }

    return { status: 'OK' };
  }

  /**
   * Безопасное приведение произвольного JSON к нашему типу вебхука.
   * Если структура не похожа — возвращаем null и логируем.
   */
  private asIgPayload(value: unknown): IgWebhookPayload | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    return value as IgWebhookPayload;
  }

  /**
   * Обработка одного messaging-события: извлекаем текст, генерируем ответ, шлём обратно.
   * Эхо-сообщения (отправленные нами же) игнорируем.
   */
  private async processMessagingEvent(event: {
    sender?: { id?: string };
    message?: { text?: string; is_echo?: boolean };
  }): Promise<void> {
    const senderId = event.sender?.id;
    const message = event.message;

    if (!senderId || !message) {
      return;
    }

    // Не отвечаем на собственные эхо-сообщения и на пустые/нетекстовые.
    if (message.is_echo || !message.text) {
      return;
    }

    const userText = message.text;
    this.logger.log(`Входящее сообщение от ${senderId}: "${userText.slice(0, 80)}"`);

    try {
      const reply = await this.generateReply(userText);
      await this.sendReply(senderId, reply);
    } catch (error) {
      this.logger.error(
        `Не удалось обработать/отправить ответ для ${senderId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Генерация ответа.
   * Если задан OPENAI_API_KEY — зовём GPT с маркетинговым системным промтом.
   * Иначе — эхо (если разрешено) либо аккуратная заглушка.
   */
  private async generateReply(userMessage: string): Promise<string> {
    if (!this.openAiApiKey) {
      if (this.fallbackEchoEnabled) {
        return `Бот на связи! Вы написали: "${userMessage}". Чтобы включить умные ответы, задайте OPENAI_API_KEY.`;
      }
      return 'Спасибо за сообщение! Наш менеджер скоро свяжется с вами.';
    }

    return this.callOpenAi(userMessage);
  }

  /** Системный промт для ИИ-маркетолога GrowthLab. */
  private static readonly SYSTEM_PROMPT = [
    'Ты — продвинутый ИИ-маркетолог и ассистент по продажам проекта GrowthLab.',
    'Твоя цель — общаться с потенциальными клиентами в Instagram Direct, консультировать, выявлять боли и мягко доводить до целевого действия.',
    '',
    'Правила:',
    '1. Отвечай кратко, абзацами по 1–3 предложения — в Direct длинные тексты не читают.',
    '2. Пиши дружелюбно и живо, без канцелярита. Допустимо 1–2 уместных эмодзи.',
    '3. Каждое сообщение заканчивай вовлекающим вопросом (инициатива всегда на тебе).',
    '4. При интересе предлагай следующий шаг; при сомнении — не дави, предложи демо/материал.',
    '5. Если вопроса касаемо кастомных условий — предложи передать запрос менеджеру.',
  ].join('\n');

  /** Вызов OpenAI Chat Completions. */
  private async callOpenAi(userMessage: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: InstagramWebhookService.SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OpenAI вернул ${response.status}: ${errorText}`);
        return 'Секунду, сверяюсь с данными... Напишите чуть позже!';
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      return content?.trim() || 'Спасибо! Уточните, пожалуйста, ваш вопрос.';
    } catch (error) {
      this.logger.error(`Ошибка запроса к OpenAI: ${(error as Error).message}`);
      return 'Секунду, сверяюсь с данными... Напишите чуть позже!';
    }
  }

  /**
   * Отправка текстового ответа в Instagram Direct через Graph API.
   * Используется Send API: POST /{version}/me/messages.
   */
  private async sendReply(recipientId: string, text: string): Promise<void> {
    if (!this.pageAccessToken) {
      this.logger.warn(
        'IG_WEBHOOK_PAGE_ACCESS_TOKEN не задан — ответ не отправлен. Текст ответа: ' +
          `"${text.slice(0, 80)}"`,
      );
      return;
    }

    const url = `https://graph.facebook.com/${this.graphApiVersion}/me/messages?access_token=${encodeURIComponent(
      this.pageAccessToken,
    )}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: 'RESPONSE',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Graph API вернул ${response.status}: ${errorText}`);
        return;
      }

      this.logger.log(`Ответ отправлен пользователю ${recipientId}.`);
    } catch (error) {
      this.logger.error(`Ошибка отправки в Graph API: ${(error as Error).message}`);
    }
  }
}