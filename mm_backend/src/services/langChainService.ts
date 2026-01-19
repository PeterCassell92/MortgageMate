import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { LLMProvider } from '../types/llm';
import {
  ConversationalResponseWithDataSchema,
  type ConversationalResponseWithData,
  AnalysisConfirmationResponseSchema,
  type AnalysisConfirmationResponse
} from '../types/mortgageDataSchema';

export type SchemaType = 'MortgageDataStructuredSchema' | 'ResponseToAnalysisOfferStructuredSchema';

export interface LangChainMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LangChainRequest {
  // Option 1: Use template + variables (legacy, for simple prompts)
  template?: string;
  variables?: Record<string, any>;
  // Option 2: Pass full message array (for conversation history)
  messages?: LangChainMessage[];

  options?: {
    temperature?: number;
    maxTokens?: number;
    provider?: 'anthropic' | 'openai' | 'mock';
    structuredOutput?: boolean; // Enable structured output with Zod schema
    schemaType?: SchemaType; // Which schema to use for structured output
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
  extractedData?: any; // For structured output mode
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
      // Choose LLM based on provider
      const provider = request.options?.provider || this.config.provider;
      let llm = provider === 'openai' ? this.openaiChat : this.anthropicChat;

      // Configure options if provided
      if (request.options?.temperature !== undefined) {
        llm.temperature = request.options.temperature;
      }
      if (request.options?.maxTokens !== undefined) {
        llm.maxTokens = request.options.maxTokens;
      }

      // Convert messages to LangChain format if provided
      let langChainMessages: BaseMessage[] | null = null;
      if (request.messages) {
        langChainMessages = request.messages.map(msg => {
          if (msg.role === 'system') return new SystemMessage(msg.content);
          if (msg.role === 'assistant') return new AIMessage(msg.content);
          return new HumanMessage(msg.content);
        });
      }

      // Use structured output if requested
      if (request.options?.structuredOutput) {
        const schemaType = request.options.schemaType || 'MortgageDataStructuredSchema';
        console.log(`[LangChainService] Using structured output with schema: ${schemaType}`);

        // Select the appropriate schema based on schemaType
        const schema = schemaType === 'ResponseToAnalysisOfferStructuredSchema'
          ? AnalysisConfirmationResponseSchema
          : ConversationalResponseWithDataSchema;

        const schemaName = schemaType === 'ResponseToAnalysisOfferStructuredSchema'
          ? "analysis_confirmation_response"
          : "mortgage_data_extraction";

        // Apply structured output schema to the LLM
        // @ts-ignore - TypeScript has excessive depth issues with complex Zod union types
        const structuredLLM = llm.withStructuredOutput(schema, {
          name: schemaName
        });

        let structuredResponse: ConversationalResponseWithData | AnalysisConfirmationResponse;

        if (langChainMessages) {
          // Use message array directly
          // @ts-ignore - TypeScript has excessive depth issues with complex Zod union types
          structuredResponse = await structuredLLM.invoke(langChainMessages);
        } else {
          // Use template (legacy)
          const promptTemplate = PromptTemplate.fromTemplate(request.template!);
          const chain = promptTemplate.pipe(structuredLLM);
          // @ts-ignore - TypeScript has excessive depth issues with complex Zod union types
          structuredResponse = await chain.invoke(request.variables || {});
        }

        // Extract usage from the raw response (if available)
        // Note: withStructuredOutput may not preserve response_metadata in all cases
        const usage = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        };

        // Fix: If extractedData comes back as a JSON string, parse it
        // Note: AnalysisConfirmationResponse doesn't have extractedData, only ConversationalResponseWithData does
        let extractedData: any = 'extractedData' in structuredResponse ? structuredResponse.extractedData : undefined;
        if (typeof extractedData === 'string') {
          console.log('[LangChainService] extractedData is a string, parsing...');
          try {
            const parsed = JSON.parse(extractedData);
            // Remove any <UNKNOWN> placeholders
            if (parsed && typeof parsed === 'object') {
              Object.keys(parsed).forEach(key => {
                if (parsed[key] === '<UNKNOWN>') {
                  delete parsed[key];
                }
              });
            }
            extractedData = parsed;
          } catch (e) {
            console.error('[LangChainService] Failed to parse extractedData string:', e);
            extractedData = {};
          }
        } else if (extractedData && typeof extractedData === 'object') {
          // Also clean <UNKNOWN> from objects
          Object.keys(extractedData).forEach(key => {
            if ((extractedData as any)[key] === '<UNKNOWN>') {
              delete (extractedData as any)[key];
            }
          });
        }

        console.log('[LangChainService] Structured response received:', {
          hasResponse: !!structuredResponse.response,
          hasExtractedData: !!extractedData,
          extractedFieldCount: Object.keys(extractedData || {}).length,
          hasProceedWithAnalysis: 'proceedWithAnalysis' in structuredResponse
        });

        // Return the full structured response to preserve all fields (including proceedWithAnalysis)
        return {
          content: structuredResponse.response,
          usage,
          provider,
          model: 'claude-sonnet-4-20250514',
          extractedData: {
            ...structuredResponse,
            extractedData // Preserve nested extractedData if it exists
          }
        };
      }

      // Regular (non-structured) mode
      let response;
      if (langChainMessages) {
        // Use message array directly
        response = await llm.invoke(langChainMessages);
      } else {
        // Use template (legacy)
        const promptTemplate = PromptTemplate.fromTemplate(request.template!);
        const chain = promptTemplate.pipe(llm);
        response = await chain.invoke(request.variables || {});
      }

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
    const variableList = request.variables ? Object.keys(request.variables).join(', ') : 'none';
    const messageCount = request.messages ? request.messages.length : 0;
    return {
      content: `**[MOCK LANGCHAIN RESPONSE]** Processing ${messageCount > 0 ? `${messageCount} messages` : `template with variables: ${variableList}`}`,
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
