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

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

export class AiService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(options: AiModuleOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.model = options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    this.baseUrl = options.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  }

  async generateMessage(input: GenerateMessageInput): Promise<GenerateMessageResult> {
    const channel = input.channel ?? 'whatsapp';
    const fallback = this.fallbackGeneratedMessage(input);
    const prompt = [
      `Product: ${input.product}`,
      input.audience ? `Audience: ${input.audience}` : null,
      input.goal ? `Goal: ${input.goal}` : null,
      `Channel: ${channel}`,
      input.tone ? `Tone: ${input.tone}` : 'Tone: friendly, concise, business-like, no pressure',
      input.contactName ? `Contact name: ${input.contactName}` : null,
      input.companyName ? `Company: ${input.companyName}` : null,
      input.context ? `Context: ${input.context}` : null,
      input.maxLength ? `Max length: ${input.maxLength} characters` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.requestJson<GenerateMessageResult>(
      [
        {
          role: 'system',
          content:
            'You write short outreach messages in Russian. Return only valid JSON: {"subject":"...","body":"..."}. For WhatsApp, omit subject or keep it empty. The body must be natural, concise, and ready to send.',
        },
        { role: 'user', content: prompt },
      ],
      fallback,
    );

    return {
      subject: result.subject?.trim() || undefined,
      body: this.normalizeText(result.body || fallback.body),
    };
  }

  async improveText(input: ImproveTextInput): Promise<ImproveTextResult> {
    const result = await this.requestJson<ImproveTextResult>(
      [
        {
          role: 'system',
          content:
            'Improve the message. Return only valid JSON: {"text":"..."}. Keep the same language as the input, make it clearer, shorter, and more persuasive without pressure.',
        },
        {
          role: 'user',
          content: [
            input.goal ? `Goal: ${input.goal}` : null,
            input.tone ? `Tone: ${input.tone}` : null,
            input.maxLength ? `Max length: ${input.maxLength} characters` : null,
            `Text: ${input.text}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      { text: input.text.trim() },
    );

    return { text: this.normalizeText(result.text || input.text) };
  }

  async evaluateResponse(input: EvaluateResponseInput): Promise<EvaluateResponseResult> {
    const fallbackCategory = this.classifyByRules(input.response);
    const result = await this.requestJson<EvaluateResponseResult>(
      [
        {
          role: 'system',
          content: `Evaluate a lead reply. Return only valid JSON: {"score":0-100,"category":"${fallbackCategory}","summary":"...","nextAction":"..."}.`,
        },
        {
          role: 'user',
          content: [
            input.goal ? `Campaign goal: ${input.goal}` : null,
            input.originalMessage ? `Original message: ${input.originalMessage}` : null,
            `Lead reply: ${input.response}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      {
        score: this.scoreByCategory(fallbackCategory),
        category: fallbackCategory,
        summary: 'Reply classified by local rules.',
        nextAction: 'Follow up manually.',
      },
    );

    const category = this.normalizeCategory(result.category);

    return {
      score: this.clampScore(result.score),
      category,
      summary: this.normalizeText(result.summary || 'Reply classified.'),
      nextAction: this.normalizeText(result.nextAction || 'Follow up manually.'),
    };
  }

  async classifyLead(input: ClassifyLeadInput): Promise<ClassifyLeadResult> {
    const category = this.classifyByRules(`${input.context ?? ''}\n${input.message}`);

    return {
      category,
      confidence: 0.65,
      reason: 'Classified by keyword rules.',
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

  private fallbackGeneratedMessage(input: GenerateMessageInput): GenerateMessageResult {
    const name = input.contactName ? `${input.contactName}, ` : '';
    const goal = input.goal ?? 'quickly discuss whether this could be useful for you';
    const body = `${name}hello! This is a short message about ${input.product}. I would like to ${goal}. If relevant, please reply with a convenient time for a quick call.`;

    return {
      subject: input.channel === 'email' || !input.channel ? `About ${input.product}` : undefined,
      body,
    };
  }

  private classifyByRules(text: string): LeadCategory {
    const value = text.toLowerCase();
    const categories = LEAD_CATEGORIES;

    if (this.includesAny(value, ['not interested', 'no thanks', 'stop', 'unsubscribe'])) {
      return categories[1] ?? categories[0];
    }

    if (this.includesAny(value, ['price', 'cost', 'budget', 'tariff'])) {
      return categories[2] ?? categories[0];
    }

    if (this.includesAny(value, ['call', 'meeting', 'calendar', 'zoom'])) {
      return categories[3] ?? categories[0];
    }

    if (this.includesAny(value, ['later', 'next week', 'busy'])) {
      return categories[4] ?? categories[0];
    }

    return categories[0];
  }

  private normalizeCategory(category: unknown): LeadCategory {
    if (typeof category !== 'string') {
      return LEAD_CATEGORIES[0];
    }

    return LEAD_CATEGORIES.find((item) => item === category.trim()) ?? LEAD_CATEGORIES[0];
  }

  private scoreByCategory(category: LeadCategory): number {
    if (category === LEAD_CATEGORIES[1]) {
      return 10;
    }

    if (category === LEAD_CATEGORIES[3]) {
      return 95;
    }

    return 70;
  }

  private clampScore(value: unknown): number {
    const score = typeof value === 'number' ? value : Number(value);
    return Math.min(100, Math.max(0, Number.isFinite(score) ? Math.round(score) : 0));
  }

  private includesAny(text: string, needles: string[]): boolean {
    return needles.some((needle) => text.includes(needle));
  }

  private normalizeText(value: string): string {
    return String(value ?? '').trim().replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  }
}
