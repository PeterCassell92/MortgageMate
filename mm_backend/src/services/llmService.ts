import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { LLMProvider, LLMRequest, LLMResponse, LLMConfig } from '../types/llm';

export class LLMService {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;

    // Initialize Anthropic if API key provided
    if (config.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    }

    // Initialize OpenAI if API key provided
    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    // If mock mode is enabled, return mock response
    if (this.config.mockMode) {
      return this.generateMockResponse(request);
    }

    // Route to appropriate provider
    switch (this.config.provider) {
      case 'anthropic':
        return this.generateAnthropicResponse(request);
      case 'openai':
        return this.generateOpenAIResponse(request);
      case 'mock':
        return this.generateMockResponse(request);
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  private async generateAnthropicResponse(request: LLMRequest): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    const messages = request.messages.filter(m => m.role !== 'system');
    const systemPrompt = request.systemPrompt || 
      request.messages.find(m => m.role === 'system')?.content;

    try {
      const response = await this.anthropic.messages.create({
        model: this.config.defaultModel?.anthropic || 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }

      return {
        content: content.text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        provider: 'anthropic',
        model: response.model,
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateOpenAIResponse(request: LLMRequest): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.defaultModel?.openai || 'gpt-4-turbo-preview',
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
      });

      const choice = response.choices[0];
      if (!choice.message.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        content: choice.message.content,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        provider: 'openai',
        model: response.model,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateMockResponse(request: LLMRequest): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const lastMessage = request.messages[request.messages.length - 1];
    const mockResponses = [
      "I understand you're looking for mortgage advice. Let me help you analyze your current situation...",
      "Based on the information you've provided, here are some key considerations for your mortgage...",
      "That's a great question about mortgage rates. Let me break this down for you...",
      "I can help you compare different mortgage options. Here's what I would recommend...",
      "Thank you for sharing those details. Based on your monthly payment and loan terms, here's my analysis...",
    ];

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    return {
      content: `**[MOCK RESPONSE]** ${randomResponse}\n\nYour message: "${lastMessage.content.substring(0, 100)}${lastMessage.content.length > 100 ? '...' : ''}"`,
      usage: {
        inputTokens: 50,
        outputTokens: 75,
        totalTokens: 125,
      },
      provider: 'mock',
      model: 'mock-model-v1',
    };
  }
}

// Factory function to create configured LLM service
export function createLLMService(): LLMService {
  const config: LLMConfig = {
    provider: (process.env.LLM_PROVIDER as LLMProvider) || 'mock',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    mockMode: process.env.MOCK_LLM === 'true',
    defaultModel: {
      anthropic: 'claude-sonnet-4-20250514',
      openai: 'gpt-4-turbo-preview',
    },
  };

  return new LLMService(config);
}