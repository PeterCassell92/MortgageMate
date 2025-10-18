import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMProvider } from '../types/llm';

export interface LangChainRequest {
  template: string;
  variables: Record<string, any>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    provider?: 'anthropic' | 'openai' | 'mock';
  };
}

export interface LangChainResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
}

export class LangChainService {
  private anthropicChat: ChatAnthropic;
  private openaiChat: ChatOpenAI;
  private config: {
    provider: string;
    mockMode: boolean;
  };

  constructor() {
    this.config = {
      provider: process.env.LLM_PROVIDER || 'anthropic',
      mockMode: process.env.MOCK_LLM === 'true'
    };

    this.anthropicChat = new ChatAnthropic({
      modelName: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.openaiChat = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async invoke(request: LangChainRequest): Promise<LangChainResponse> {
    if (this.config.mockMode) {
      return this.generateMockResponse(request);
    }

    try {
      // Create prompt template
      const promptTemplate = PromptTemplate.fromTemplate(request.template);

      // Choose LLM based on provider
      const provider = request.options?.provider || this.config.provider;
      const llm = provider === 'openai' ? this.openaiChat : this.anthropicChat;

      // Configure options if provided
      if (request.options?.temperature !== undefined) {
        llm.temperature = request.options.temperature;
      }
      if (request.options?.maxTokens !== undefined) {
        llm.maxTokens = request.options.maxTokens;
      }

      // Create chain and invoke
      const chain = promptTemplate.pipe(llm);
      const response = await chain.invoke(request.variables);

      // Extract usage information
      const usage = response.response_metadata?.usage || {};

      return {
        content: response.content as string,
        usage: {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        },
        provider: provider,
        model: response.response_metadata?.model || 'unknown'
      };
    } catch (error) {
      console.error('LangChain error:', error);
      throw new Error(`LangChain error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateMockResponse(request: LangChainRequest): LangChainResponse {
    const variableList = Object.keys(request.variables).join(', ');
    return {
      content: `**[MOCK LANGCHAIN RESPONSE]** Processing template with variables: ${variableList}`,
      usage: { inputTokens: 50, outputTokens: 75, totalTokens: 125 },
      provider: 'mock',
      model: 'mock-langchain-v1'
    };
  }
}

// Factory function
export function createLangChainService(): LangChainService {
  return new LangChainService();
}
