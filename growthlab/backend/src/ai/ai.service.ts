import {
  AiModuleOptions,
  ClassifyLeadInput,
  ClassifyLeadResult,
  EvaluateResponseInput,
  EvaluateResponseResult,
  GenerateMessageInput,
  GenerateMessageResult,
  ImproveTextInput,
  ImproveTextResult,
  LEAD_CATEGORIES,
  LeadCategory,
} from './ai.types';

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

export class AiService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(options: AiModuleOptions = {}) {
    const env = process?.env ?? {};

    this.apiKey = options.apiKey ?? env.OPENAI_API_KEY ?? '';
    this.model = options.model ?? env.OPENAI_MODEL ?? 'gpt-4o-mini';
    this.baseUrl = options.baseUrl ?? env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  }

  async generateMessage(input: GenerateMessageInput): Promise<GenerateMessageResult> {
    const channel = input.channel ?? 'email';
    const prompt = [
      `Продукт: ${input.product}`,
      input.audience ? `Аудитория: ${input.audience}` : null,
      input.goal ? `Цель: ${input.goal}` : null,
      `Канал: ${channel}`,
      input.tone ? `Тон: ${input.tone}` : 'Тон: деловой, живой, без давления',
      input.contactName ? `Имя контакта: ${input.contactName}` : null,
      input.companyName ? `Компания: ${input.companyName}` : null,
      input.context ? `Контекст: ${input.context}` : null,
      input.maxLength ? `Максимальная длина: ${input.maxLength} символов` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.requestJson<GenerateMessageResult>(
      [
        this.systemMessage(
          'Ты создаешь короткие продающие сообщения на русском языке. Верни JSON: {"subject":"...","body":"..."}. Для не-email каналов subject можно не указывать.',
        ),
        { role: 'user', content: prompt },
      ],
      this.fallbackGeneratedMessage(input),
    );

    return {
      subject: result.subject?.trim() || undefined,
      body: this.normalizeText(result.body),
    };
  }

  async evaluateResponse(input: EvaluateResponseInput): Promise<EvaluateResponseResult> {
    const fallbackCategory = this.classifyByRules(input.response);
    const result = await this.requestJson<EvaluateResponseResult>(
      [
        this.systemMessage(
          `Оцени ответ лида на русском языке. Категория строго одна из: ${LEAD_CATEGORIES.join(', ')}. Верни JSON: {"score":0-100,"category":"...","summary":"...","nextAction":"..."}.`,
        ),
        {
          role: 'user',
          content: [
            input.goal ? `Цель кампании: ${input.goal}` : null,
            input.originalMessage ? `Исходное сообщение: ${input.originalMessage}` : null,
            `Ответ лида: ${input.response}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      {
        score: this.scoreByCategory(fallbackCategory),
        category: fallbackCategory,
        summary: this.defaultSummary(fallbackCategory),
        nextAction: this.defaultNextAction(fallbackCategory),
      },
    );

    const category = this.normalizeCategory(result.category);

    return {
      score: this.clampScore(result.score),
      category,
      summary: this.normalizeText(result.summary || this.defaultSummary(category)),
      nextAction: this.normalizeText(result.nextAction || this.defaultNextAction(category)),
    };
  }

  async improveText(input: ImproveTextInput): Promise<ImproveTextResult> {
    const result = await this.requestJson<ImproveTextResult>(
      [
        this.systemMessage(
          'Улучши текст на русском языке: яснее, убедительнее, короче, без агрессии и клише. Верни JSON: {"text":"..."}.',
        ),
        {
          role: 'user',
          content: [
            input.goal ? `Цель: ${input.goal}` : null,
            input.tone ? `Тон: ${input.tone}` : null,
            input.maxLength ? `Максимальная длина: ${input.maxLength} символов` : null,
            `Текст: ${input.text}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      { text: input.text.trim() },
    );

    return { text: this.normalizeText(result.text) };
  }

  async classifyLead(input: ClassifyLeadInput): Promise<ClassifyLeadResult> {
    const fallbackCategory = this.classifyByRules(`${input.context ?? ''}\n${input.message}`);
    const result = await this.requestJson<ClassifyLeadResult>(
      [
        this.systemMessage(
          `Классифицируй лид. Категория строго одна из: ${LEAD_CATEGORIES.join(', ')}. Верни JSON: {"category":"...","confidence":0-1,"reason":"..."}.`,
        ),
        {
          role: 'user',
          content: [input.context ? `Контекст: ${input.context}` : null, `Сообщение: ${input.message}`]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      {
        category: fallbackCategory,
        confidence: 0.55,
        reason: 'Категория определена по ключевым словам.',
      },
    );

    const category = this.normalizeCategory(result.category);

    return {
      category,
      confidence: this.clampConfidence(result.confidence),
      reason: this.normalizeText(result.reason || 'Категория определена моделью.'),
    };
  }

  private async requestJson<T>(messages: ChatMessage[], fallback: T): Promise<T> {
    if (!this.apiKey) {
      return fallback;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        return fallback;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (typeof content !== 'string') {
        return fallback;
      }

      return JSON.parse(content) as T;
    } catch {
      return fallback;
    }
  }

  private systemMessage(content: string): ChatMessage {
    return { role: 'system', content };
  }

  private fallbackGeneratedMessage(input: GenerateMessageInput): GenerateMessageResult {
    const name = input.contactName ? `${input.contactName}, ` : '';
    const goal = input.goal ?? 'обсудить, как это может быть полезно';
    const body = `${name}здравствуйте! Предлагаем ${input.product}. Хотим ${goal}. Если актуально, подскажите удобное время для короткого созвона.`;

    return {
      subject: input.channel === 'email' || !input.channel ? `По поводу ${input.product}` : undefined,
      body,
    };
  }

  private classifyByRules(text: string): LeadCategory {
    const value = text.toLowerCase();

    if (this.includesAny(value, ['не интересно', 'неактуально', 'не нужно', 'не надо', 'отпишите', 'не пишите'])) {
      return 'не интересно';
    }

    if (this.includesAny(value, ['цена', 'стоимость', 'сколько стоит', 'прайс', 'тариф', 'бюджет'])) {
      return 'цена';
    }

    if (this.includesAny(value, ['созвон', 'встреч', 'звонок', 'позвон', 'календар', 'обсудим'])) {
      return 'созвон';
    }

    if (this.includesAny(value, ['позже', 'потом', 'через неделю', 'перезвоните', 'напишите позже', 'сейчас занят'])) {
      return 'перезвоните позже';
    }

    if (this.includesAny(value, ['интересно', 'актуально', 'давайте', 'хочу', 'расскажите', 'подробнее'])) {
      return 'интерес';
    }

    return 'интерес';
  }

  private normalizeCategory(category: unknown): LeadCategory {
    if (typeof category !== 'string') {
      return 'интерес';
    }

    const normalized = category.trim().toLowerCase();
    return LEAD_CATEGORIES.find((item) => item === normalized) ?? 'интерес';
  }

  private scoreByCategory(category: LeadCategory): number {
    const scores: Record<LeadCategory, number> = {
      интерес: 85,
      'не интересно': 10,
      цена: 70,
      созвон: 95,
      'перезвоните позже': 45,
    };

    return scores[category];
  }

  private defaultSummary(category: LeadCategory): string {
    const summaries: Record<LeadCategory, string> = {
      интерес: 'Лид проявил интерес и готов получить больше информации.',
      'не интересно': 'Лид отказался от предложения.',
      цена: 'Лид запросил стоимость или условия оплаты.',
      созвон: 'Лид готов перейти к разговору или встрече.',
      'перезвоните позже': 'Лид просит вернуться к разговору позже.',
    };

    return summaries[category];
  }

  private defaultNextAction(category: LeadCategory): string {
    const actions: Record<LeadCategory, string> = {
      интерес: 'Отправить короткое уточнение и предложить следующий шаг.',
      'не интересно': 'Завершить коммуникацию и не продолжать рассылку.',
      цена: 'Отправить цену, тарифы или запросить вводные для расчета.',
      созвон: 'Предложить 2-3 слота для созвона.',
      'перезвоните позже': 'Поставить напоминание и связаться в указанный срок.',
    };

    return actions[category];
  }

  private clampScore(value: unknown): number {
    const score = typeof value === 'number' ? value : Number(value);
    return Math.min(100, Math.max(0, Number.isFinite(score) ? Math.round(score) : 0));
  }

  private clampConfidence(value: unknown): number {
    const confidence = typeof value === 'number' ? value : Number(value);
    return Math.min(1, Math.max(0, Number.isFinite(confidence) ? confidence : 0));
  }

  private includesAny(text: string, needles: string[]): boolean {
    return needles.some((needle) => text.includes(needle));
  }

  private normalizeText(value: string): string {
    return String(value ?? '').trim().replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  }
}
