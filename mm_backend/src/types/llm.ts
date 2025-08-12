export type LLMProvider = 'anthropic' | 'openai' | 'mock';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  provider: LLMProvider;
  model: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  mockMode: boolean;
  defaultModel?: {
    anthropic: string;
    openai: string;
  };
}