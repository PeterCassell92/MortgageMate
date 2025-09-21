# LangChain Migration Plan

## Overview
Migrate from direct Anthropic SDK calls to LangChain for better observability, unified LLM interface, and improved prompt management.

## Benefits We'll Achieve
1. **Unified LLM Interface** - Easy to switch between Anthropic, OpenAI, etc.
2. **Built-in Prompt Templates** - Replace our custom PromptTemplate system
3. **Comprehensive Logging** - See all inputs/outputs with LangSmith integration
4. **Better Error Handling** - Retry logic, fallbacks, etc.
5. **Streaming Support** - For real-time responses
6. **Token Usage Tracking** - Built-in cost monitoring

## Current Architecture Analysis
```typescript
// Current flow:
llmService.generateResponse()
  -> @anthropic-ai/sdk directly
  -> Custom PromptTemplate system
  -> Manual logging/error handling
```

## Target LangChain Architecture
```typescript
// New flow:
langChainService.invoke()
  -> LangChain ChatAnthropic
  -> LangChain PromptTemplate + ChatPromptTemplate
  -> LangSmith automatic logging
  -> Built-in retry/error handling
```

## Implementation Plan

### Phase 1: Dependencies & Setup
```bash
cd mm_backend
yarn add langchain @langchain/anthropic @langchain/openai langsmith
```

**Environment Variables to Add:**
```bash
# LangSmith Configuration (for logging)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langsmith_key_here
LANGCHAIN_PROJECT=mortgagemate-dev
```

### Phase 2: Create New LangChain Service
**Create `mm_backend/src/services/langChainService.ts`:**
```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate, ChatPromptTemplate } from 'langchain/prompts';
import { HumanMessage, SystemMessage } from 'langchain/schema';

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

    // Create prompt template
    const promptTemplate = PromptTemplate.fromTemplate(request.template);

    // Choose LLM based on provider
    const llm = this.config.provider === 'openai' ? this.openaiChat : this.anthropicChat;

    // Configure options
    if (request.options?.temperature) {
      llm.temperature = request.options.temperature;
    }
    if (request.options?.maxTokens) {
      llm.maxTokens = request.options.maxTokens;
    }

    // Create chain and invoke
    const chain = promptTemplate.pipe(llm);
    const response = await chain.invoke(request.variables);

    return {
      content: response.content as string,
      usage: {
        inputTokens: response.response_metadata?.usage?.input_tokens || 0,
        outputTokens: response.response_metadata?.usage?.output_tokens || 0,
        totalTokens: response.response_metadata?.usage?.total_tokens || 0,
      },
      provider: this.config.provider,
      model: response.response_metadata?.model || 'unknown'
    };
  }

  private generateMockResponse(request: LangChainRequest): LangChainResponse {
    return {
      content: `**[MOCK LANGCHAIN RESPONSE]** Processing template with variables: ${Object.keys(request.variables).join(', ')}`,
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
```

### Phase 3: Replace Prompt Templates with LangChain Format

**Convert Current Templates:**

Current: `mortgage_analysis.txt` with `{{PROPERTY_VALUE}}`
New: LangChain template with `{propertyValue}`

**Create `mm_backend/src/services/prompts/langChainTemplates.ts`:**
```typescript
export const MORTGAGE_ANALYSIS_TEMPLATE = `You are a professional mortgage advisor with extensive experience in UK mortgage markets.

## Client Information
**Property Location**: {propertyLocation}
**Property Type**: {propertyType}
**Property Value**: {propertyValue}
**Property Use**: {propertyUse}

## Current Mortgage Details
**Lender**: {currentLender}
**Mortgage Type**: {mortgageType}
**Current Balance**: {currentBalance}
**Monthly Payment**: {monthlyPayment}
**Interest Rate**: {currentRate}
**Term Remaining**: {termRemaining}

## Market Research Results
{marketData}

## Analysis Requirements
Please provide comprehensive mortgage analysis covering:

1. **Current Mortgage Assessment**
2. **Market Analysis** - Reference the {competingProductsCount} most relevant products
3. **Remortgage Opportunities** - Calculate savings from specific products above
4. **Product Recommendations** - Focus on products that best match their profile

Use the Market Research Results to provide specific, actionable advice with real product comparisons.`;

export const SEARCH_QUERY_GENERATION_TEMPLATE = `Generate a concise search query (under 50 words) to find relevant mortgage products for this customer:

**Property Value**: {propertyValue}
**Current Balance**: {currentBalance}
**LTV**: {ltv}%
**Primary Goal**: {primaryObjective}
**Employment**: {employmentStatus}
**Property Use**: {propertyUse}

Focus on their objectives and circumstances. Use language that matches mortgage product descriptions.
Generate only the search query, no explanation:`;

export const DATA_GATHERING_TEMPLATE = `You are MortgageMate AI, gathering mortgage information conversationally.

## Current Data Collected
{collectedData}

## Conversation Stage
{conversationStage}

## Current Priority
{currentPriority}

## User's Question
{currentQuestion}

Continue the conversation naturally, focusing on gathering the missing information while being helpful and professional.`;
```

### Phase 4: Migration Strategy

**Step 1: Parallel Implementation (Feature Flag)**
- Add `USE_LANGCHAIN=false` to .env
- Keep existing `llmService.ts`
- Add new `langChainService.ts`
- Add toggle in services

**Step 2: Service-by-Service Migration**
1. **Search Query Generation** (simplest) - Update `mortgageMarketService.ts`
2. **Mortgage Analysis** (most complex) - Update `mortgageAdvisorService.ts`
3. **Document Parsing** - Update `documentParser.ts`
4. **Chat Integration** - Update `chat.ts`

**Step 3: Template Migration**
- Convert `/prompt_templates/*.txt` to LangChain format
- Update variable naming convention (`{{VAR}}` → `{var}`)
- Add type safety with TypeScript interfaces

**Step 4: Testing & Validation**
- Compare outputs between old and new systems
- Verify market data injection works correctly
- Test error handling and fallbacks
- Validate token usage tracking

**Step 5: Cleanup**
- Remove old `llmService.ts`
- Remove custom `PromptTemplate.ts`
- Remove `/prompt_templates/` directory
- Update documentation

### Phase 5: LangSmith Integration for Observability

**Setup LangSmith Dashboard:**
1. Create account at https://smith.langchain.com
2. Create project "mortgagemate-dev"
3. Configure environment variables
4. View real-time traces of:
   - Prompt templates with variables filled
   - Market data injection
   - LLM responses
   - Token usage and costs
   - Performance metrics

### Files to Modify

**Core Services:**
- `src/services/llmService.ts` → `src/services/langChainService.ts`
- `src/services/mortgageMarketService.ts` - Update search query generation
- `src/services/MortgageConversation/mortgageAdvisorService.ts` - Replace PromptTemplate calls
- `src/routes/chat.ts` - Update LLM service calls
- `src/services/DocumentParser/` - Update document parsing calls

**Templates:**
- `src/services/MortgageConversation/prompts/prompt_scripts/PromptTemplate.ts` - Remove
- `src/services/MortgageConversation/prompts/prompt_templates/*.txt` - Convert to LangChain
- `src/services/prompts/langChainTemplates.ts` - New templates

**Configuration:**
- `package.json` - Add LangChain dependencies
- `.env.example` - Add LangSmith variables

### Testing Plan

**Unit Tests:**
- Test template variable substitution
- Test provider switching (Anthropic/OpenAI)
- Test mock mode functionality
- Test error handling

**Integration Tests:**
- Test full mortgage analysis with market data
- Test search query generation
- Test document parsing workflows
- Compare old vs new system outputs

**Manual Testing:**
- Verify LangSmith logging shows market data injection
- Test real mortgage analysis scenarios
- Validate token usage tracking
- Test streaming responses (if implemented)

### Rollback Plan

**If Issues Arise:**
1. Set `USE_LANGCHAIN=false` in environment
2. System falls back to existing `llmService.ts`
3. No data loss or service interruption
4. Debug LangChain integration separately

### Success Metrics

**Technical:**
- All LLM calls migrated to LangChain
- LangSmith logging shows full conversation traces
- Token usage accurately tracked
- Error handling improved

**Business:**
- Market data injection visible in logs
- Mortgage analysis quality maintained or improved
- Response times maintained
- Cost tracking more accurate

### Future Enhancements (Post-Migration)

**With LangChain Foundation:**
- **Streaming responses** for real-time chat
- **Prompt optimization** using LangSmith analytics
- **A/B testing** different prompt variations
- **Multi-agent workflows** for complex analysis
- **Automatic retry** with fallback providers
- **Custom evaluation metrics** for mortgage advice quality

## Next Steps

1. **Review this plan** and adjust priorities
2. **Set up LangSmith account** for logging
3. **Start with Phase 1** - dependencies and setup
4. **Begin with search query generation** - simplest migration
5. **Gradually migrate** each service with feature flags
6. **Monitor and optimize** using LangSmith insights

This migration will provide the observability you need to see exactly what prompts (including market data) are sent to Claude, making debugging and optimization much easier.