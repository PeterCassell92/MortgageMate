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
  model?: string; // Optional model override (takes priority over config defaults)
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