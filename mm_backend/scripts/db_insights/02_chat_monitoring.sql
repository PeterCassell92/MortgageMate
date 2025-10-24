-- ============================================================================
-- Chat Token Usage Monitoring Queries
-- ============================================================================
-- Purpose: Monitor individual chat conversations for token usage, size,
--          and potential issues requiring intervention.
--
-- Prerequisites: Run 01_create_views.sql first to create required views
--
-- Usage: Run individual queries as needed, or entire file for full report
-- ============================================================================

\echo '========================================='
\echo 'Chat Token Usage Monitoring Report'
\echo '========================================='
\echo ''

-- ----------------------------------------------------------------------------
-- Query 1: All Active Chats Overview
-- ----------------------------------------------------------------------------
-- Purpose: Get a complete overview of all active chats with token usage
-- Use case: Daily monitoring, general health check
-- ----------------------------------------------------------------------------

\echo '1. All Active Chats (ordered by token usage)'
\echo '-----------------------------------------'

SELECT
  chat_number,
  user_id,
  title,
  total_messages,
  total_tokens,
  context_usage_pct || '%' as context_used,
  total_cost,
  DATE(last_message_time) as last_active
FROM chat_token_usage
ORDER BY total_tokens DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 2: Heavy Conversations
-- ----------------------------------------------------------------------------
-- Purpose: Identify conversations with high token usage
-- Threshold: >10,000 tokens (5% of context window)
-- Use case: Identify candidates for optimization or summarization
-- ----------------------------------------------------------------------------

\echo '2. Heavy Conversations (>10K tokens)'
\echo '-----------------------------------------'

SELECT
  chat_number,
  user_id,
  title,
  total_messages,
  total_tokens,
  context_usage_pct || '%' as context_used,
  CASE
    WHEN context_usage_pct > 75 THEN '🔴 CRITICAL - Truncate Now'
    WHEN context_usage_pct > 50 THEN '🟠 HIGH - Consider Truncation'
    WHEN context_usage_pct > 25 THEN '🟡 MEDIUM - Monitor Closely'
    ELSE '🟢 NORMAL'
  END as status,
  last_message_time
FROM chat_token_usage
WHERE total_tokens > 10000
ORDER BY total_tokens DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 3: Recent Active Chats with High Message Counts
-- ----------------------------------------------------------------------------
-- Purpose: Find active conversations with many messages (potential for growth)
-- Threshold: >20 messages and activity in last 7 days
-- Use case: Proactive monitoring of growing conversations
-- ----------------------------------------------------------------------------

\echo '3. Active Chats with High Message Counts'
\echo '-----------------------------------------'

SELECT
  chat_number,
  user_id,
  title,
  total_messages,
  ai_messages,
  user_messages,
  total_tokens,
  context_usage_pct || '%' as context_used,
  ROUND(total_tokens::numeric / NULLIF(total_messages, 0), 0) as avg_tokens_per_message,
  last_message_time
FROM chat_token_usage
WHERE total_messages > 20
  AND latest_view_time > NOW() - INTERVAL '7 days'
ORDER BY total_messages DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 4: Detailed Chat Breakdown with Message Analysis
-- ----------------------------------------------------------------------------
-- Purpose: Deep dive into specific chats to understand token distribution
-- Use case: Investigating specific high-usage chats
-- ----------------------------------------------------------------------------

\echo '4. Detailed Chat Analysis (Top 5 by tokens)'
\echo '-----------------------------------------'

SELECT
  chat_number,
  user_id,
  title,
  total_messages || ' msgs (' || ai_messages || ' AI, ' || user_messages || ' user)' as message_breakdown,
  total_input_tokens || ' in / ' || total_output_tokens || ' out' as token_breakdown,
  total_tokens || ' total' as total,
  context_usage_pct || '% of 200K limit' as context_usage,
  llm_response_count || ' LLM calls' as llm_calls,
  ROUND(total_tokens::numeric / NULLIF(llm_response_count, 0), 0) as avg_tokens_per_llm_call,
  EXTRACT(EPOCH FROM (last_message_time - chat_created))/3600 as conversation_duration_hours
FROM chat_token_usage
WHERE total_tokens > 0
ORDER BY total_tokens DESC
LIMIT 5;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 5: Chats by Context Usage Tiers
-- ----------------------------------------------------------------------------
-- Purpose: Categorize chats by their context window utilization
-- Use case: Understand distribution of chat sizes
-- ----------------------------------------------------------------------------

\echo '5. Chats by Context Usage Tier'
\echo '-----------------------------------------'

SELECT
  CASE
    WHEN context_usage_pct >= 75 THEN '🔴 Critical (75-100%)'
    WHEN context_usage_pct >= 50 THEN '🟠 High (50-75%)'
    WHEN context_usage_pct >= 25 THEN '🟡 Medium (25-50%)'
    WHEN context_usage_pct >= 10 THEN '🟢 Low (10-25%)'
    ELSE '⚪ Minimal (<10%)'
  END as usage_tier,
  COUNT(*) as chat_count,
  SUM(total_tokens) as total_tokens_in_tier,
  ROUND(AVG(total_tokens), 0) as avg_tokens,
  MAX(total_tokens) as max_tokens
FROM chat_token_usage
GROUP BY
  CASE
    WHEN context_usage_pct >= 75 THEN '🔴 Critical (75-100%)'
    WHEN context_usage_pct >= 50 THEN '🟠 High (50-75%)'
    WHEN context_usage_pct >= 25 THEN '🟡 Medium (25-50%)'
    WHEN context_usage_pct >= 10 THEN '🟢 Low (10-25%)'
    ELSE '⚪ Minimal (<10%)'
  END
ORDER BY max_tokens DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 6: Token Growth Rate (requires multiple data points)
-- ----------------------------------------------------------------------------
-- Purpose: Track how quickly conversations are consuming tokens over time
-- Note: This is a snapshot - for true growth rate, run periodically and compare
-- Use case: Predict when conversations will hit limits
-- ----------------------------------------------------------------------------

\echo '6. Token Efficiency Metrics'
\echo '-----------------------------------------'

SELECT
  chat_number,
  title,
  total_messages,
  total_tokens,
  ROUND(total_tokens::numeric / NULLIF(total_messages, 0), 0) as tokens_per_message,
  ROUND(total_input_tokens::numeric / NULLIF(llm_response_count, 0), 0) as avg_input_per_request,
  ROUND(total_output_tokens::numeric / NULLIF(llm_response_count, 0), 0) as avg_output_per_request,
  CASE
    WHEN total_tokens::numeric / NULLIF(total_messages, 0) > 2000 THEN '⚠️ High token/message ratio'
    ELSE '✓ Normal'
  END as efficiency_status
FROM chat_token_usage
WHERE total_messages > 0
ORDER BY tokens_per_message DESC
LIMIT 10;

\echo ''
\echo '========================================='
\echo 'End of Chat Monitoring Report'
\echo '========================================='
