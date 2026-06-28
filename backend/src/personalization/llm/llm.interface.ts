export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmJsonResult<T> {
  data: T;
  usage: LlmUsage;
  model: string;
  /** True when the fallback was returned (no API key or provider error). */
  fallback: boolean;
}

/**
 * Adapter behind any LLM provider used for generation.
 * Returns token usage so callers can record COGS.
 */
export interface LlmClient {
  readonly provider: string;
  isConfigured(): boolean;
  completeJson<T>(input: { system: string; user: string }, fallback: T): Promise<LlmJsonResult<T>>;
}

export const ZERO_USAGE: LlmUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

/** DI token for the LLM client. */
export const LLM_CLIENT = Symbol('LLM_CLIENT');
