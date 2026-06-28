import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { LlmClient, LlmJsonResult, LlmUsage, ZERO_USAGE } from './llm.interface';

interface OpenAiResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

@Injectable()
export class OpenAiAdapter implements LlmClient {
  readonly provider = 'openai';
  private readonly logger = new Logger(OpenAiAdapter.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService<AppConfiguration, true>) {
    this.apiKey = config.get('openai.apiKey', { infer: true }) ?? '';
    this.model = config.get('openai.model', { infer: true }) ?? 'gpt-4o-mini';
    this.baseUrl = config.get('openai.baseUrl', { infer: true }) ?? 'https://api.openai.com/v1';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  // TODO(Ф6): run through the BullMQ queue (rate-limit + retries) instead of a sync call.
  async completeJson<T>(
    input: { system: string; user: string },
    fallback: T,
  ): Promise<LlmJsonResult<T>> {
    if (!this.isConfigured()) {
      return { data: fallback, usage: ZERO_USAGE, model: this.model, fallback: true };
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
          messages: [
            { role: 'system', content: input.system },
            { role: 'user', content: input.user },
          ],
          temperature: 0.5,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI responded with status ${response.status}`);
        return { data: fallback, usage: ZERO_USAGE, model: this.model, fallback: true };
      }

      const json = (await response.json()) as OpenAiResponse;
      const content = json.choices?.[0]?.message?.content;

      if (typeof content !== 'string') {
        return { data: fallback, usage: ZERO_USAGE, model: this.model, fallback: true };
      }

      return {
        data: JSON.parse(content) as T,
        usage: this.toUsage(json.usage),
        model: json.model ?? this.model,
        fallback: false,
      };
    } catch (error) {
      this.logger.warn(`OpenAI request failed: ${this.errorMessage(error)}`);
      return { data: fallback, usage: ZERO_USAGE, model: this.model, fallback: true };
    }
  }

  private toUsage(usage: OpenAiResponse['usage']): LlmUsage {
    return {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
