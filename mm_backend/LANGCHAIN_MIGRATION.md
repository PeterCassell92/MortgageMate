# LangChain Migration - Quick Reference

## Switching Between Implementations

The backend now supports two LLM implementation modes:

### Legacy Mode (Default - Direct SDK calls)
```bash
LLM_IMPLEMENTATION=legacy
```
Uses direct Anthropic/OpenAI SDK calls (pre-LangChain implementation)

### LangChain Mode (New)
```bash
LLM_IMPLEMENTATION=langchain
```
Uses LangChain for unified LLM interface with better observability

## Quick Rollback

If you encounter any issues with LangChain, instantly rollback:

```bash
# In your .env file, change:
LLM_IMPLEMENTATION=legacy
```

Then restart the backend - no code changes needed!

## What's Been Migrated

✅ **Search Query Generation** (mortgageMarketService.ts)
- Generates intelligent search queries for Vectorize
- Template: `SEARCH_QUERY_GENERATION_TEMPLATE`

🔲 **Mortgage Analysis** (mortgageAdvisorService.ts) - Not yet migrated
🔲 **Document Parsing** - Not yet migrated
🔲 **Chat Integration** - Not yet migrated

## Testing

Run the migration test:
```bash
yarn build
node test-langchain-migration.js
```

## Environment Variables

### Core Configuration
- `LLM_IMPLEMENTATION` - Set to 'langchain' or 'legacy'
- `MOCK_LLM` - Set to 'true' for mock responses
- `LLM_PROVIDER` - anthropic, openai, or mock

### LangSmith (Optional - for observability)
- `LANGCHAIN_TRACING_V2=true` - Enable LangSmith logging
- `LANGCHAIN_API_KEY` - Your LangSmith API key
- `LANGCHAIN_PROJECT` - Project name (e.g., mortgagemate-dev)

## Files Created

- `src/services/langChainService.ts` - New LangChain wrapper service
- `src/services/prompts/langChainTemplates.ts` - Converted prompt templates
- `test-langchain-migration.js` - Migration test script

## Benefits of LangChain

1. **Observability** - See exact prompts, responses, and market data via LangSmith
2. **Flexibility** - Switch between Anthropic, OpenAI, etc. easily
3. **Better Error Handling** - Built-in retry logic
4. **Streaming Support** - For real-time responses
5. **Unified Interface** - Consistent API across providers

## Next Steps

1. Test with real Anthropic API by setting `MOCK_LLM=false`
2. Set up LangSmith account for full observability
3. Migrate remaining services one by one
4. Remove legacy implementation once confident
