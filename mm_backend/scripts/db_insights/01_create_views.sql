-- ============================================================================
-- Database Views for Token Usage Monitoring
-- ============================================================================
-- Purpose: Create reusable database views for tracking LLM token usage,
--          costs, and conversation sizes across the application.
--
-- Usage: Run this script once to create the views:
--        psql -h localhost -U postgres -d mortgagemate_dev -f 01_create_views.sql
--
-- Dependencies: Requires tables: chats, messages, llm_requests, llm_responses
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: chat_token_usage
-- ----------------------------------------------------------------------------
-- Purpose: Comprehensive per-chat token usage statistics
--
-- Provides:
--   - Message counts (total, AI, user)
--   - Token usage (input, output, total)
--   - Context window utilization percentage (based on Claude's 200K limit)
--   - Cost tracking (estimated)
--   - Activity timestamps
--
-- Use cases:
--   - Monitor which chats are approaching context limits
--   - Track token usage per conversation
--   - Identify conversations that need truncation/summarization
--   - Calculate costs per chat session
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW chat_token_usage AS
SELECT
  -- Chat identifiers
  c.id as chat_id,
  c.chat_id as chat_uuid,
  c.user_id,
  c.non_unique_numerical_id as chat_number,
  c.title,

  -- Timestamps
  c.created_at as chat_created,
  c.latest_view_time,
  MAX(m.sent_time) as last_message_time,

  -- Message counts
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT CASE WHEN m.from_user_id = 0 THEN m.id END) as ai_messages,
  COUNT(DISTINCT CASE WHEN m.from_user_id != 0 THEN m.id END) as user_messages,
  COUNT(DISTINCT lresp.id) as llm_response_count,

  -- Token usage
  COALESCE(SUM(lresp.input_tokens), 0) as total_input_tokens,
  COALESCE(SUM(lresp.output_tokens), 0) as total_output_tokens,
  COALESCE(SUM(lresp.total_tokens), 0) as total_tokens,

  -- Context window utilization (based on Claude Sonnet 4's 200K token limit)
  ROUND((COALESCE(SUM(lresp.total_tokens), 0)::numeric / 200000) * 100, 2) as context_usage_pct,

  -- Cost tracking
  COALESCE(SUM(lresp.estimated_cost), 0) as total_cost

FROM chats c
LEFT JOIN messages m ON m.chat_id = c.id
LEFT JOIN llm_responses lresp ON lresp.id = m.llm_response_id
WHERE c.overall_status = 'active'
GROUP BY
  c.id,
  c.chat_id,
  c.user_id,
  c.non_unique_numerical_id,
  c.title,
  c.created_at,
  c.latest_view_time;

COMMENT ON VIEW chat_token_usage IS
  'Per-chat token usage statistics including message counts, token consumption, and context utilization';


-- ----------------------------------------------------------------------------
-- View: daily_token_usage
-- ----------------------------------------------------------------------------
-- Purpose: Daily aggregation of token usage and costs
--
-- Provides:
--   - Daily request counts
--   - Daily token consumption
--   - Daily cost estimates
--
-- Use cases:
--   - Monitor daily API usage trends
--   - Budget tracking and forecasting
--   - Identify usage spikes or anomalies
--   - Generate usage reports
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW daily_token_usage AS
SELECT
  DATE(lr.start_time) as date,

  -- Request counts
  COUNT(DISTINCT lr.id) as total_requests,
  COUNT(DISTINCT CASE WHEN lr.implementation_mode = 'legacy' THEN lr.id END) as legacy_requests,
  COUNT(DISTINCT CASE WHEN lr.implementation_mode = 'langchain' THEN lr.id END) as langchain_requests,

  -- Token usage
  SUM(lresp.input_tokens) as total_input_tokens,
  SUM(lresp.output_tokens) as total_output_tokens,
  SUM(lresp.total_tokens) as total_tokens,

  -- Averages
  ROUND(AVG(lresp.input_tokens), 2) as avg_input_tokens,
  ROUND(AVG(lresp.output_tokens), 2) as avg_output_tokens,

  -- Cost tracking
  SUM(lresp.estimated_cost) as daily_cost,

  -- Performance metrics
  ROUND(AVG(lresp.latency_ms), 2) as avg_latency_ms,
  MAX(lresp.latency_ms) as max_latency_ms

FROM llm_requests lr
JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
WHERE lr.status = 'completed'
GROUP BY DATE(lr.start_time)
ORDER BY date DESC;

COMMENT ON VIEW daily_token_usage IS
  'Daily aggregated token usage, request counts, and performance metrics';


-- ----------------------------------------------------------------------------
-- View: user_token_summary
-- ----------------------------------------------------------------------------
-- Purpose: Per-user token usage and activity summary
--
-- Provides:
--   - Active chat counts per user
--   - Total and average token usage
--   - Cost tracking per user
--   - Activity indicators
--
-- Use cases:
--   - User-level billing/quota management
--   - Identify power users
--   - Monitor user engagement
--   - Generate user usage reports
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW user_token_summary AS
SELECT
  user_id,

  -- Chat counts
  COUNT(*) as active_chats,

  -- Message counts
  SUM(total_messages) as total_messages,
  SUM(ai_messages) as total_ai_messages,
  SUM(user_messages) as total_user_messages,

  -- Token usage
  SUM(total_tokens) as total_tokens_used,
  ROUND(AVG(total_tokens), 2) as avg_tokens_per_chat,
  MAX(total_tokens) as largest_chat_tokens,
  MIN(total_tokens) as smallest_chat_tokens,

  -- Cost tracking
  SUM(total_cost) as total_cost,

  -- Activity indicators
  MAX(last_message_time) as last_activity,
  MIN(chat_created) as first_chat_created

FROM chat_token_usage
GROUP BY user_id
ORDER BY total_tokens_used DESC;

COMMENT ON VIEW user_token_summary IS
  'Per-user aggregated statistics for token usage, costs, and activity';


-- ============================================================================
-- Verification
-- ============================================================================
-- Quick check to verify views were created successfully
-- ============================================================================

\echo 'Views created successfully!'
\echo ''
\echo 'Available views:'
\echo '  - chat_token_usage: Per-chat token statistics'
\echo '  - daily_token_usage: Daily aggregated usage'
\echo '  - user_token_summary: Per-user usage summary'
\echo ''
\echo 'Example usage:'
\echo '  SELECT * FROM chat_token_usage ORDER BY total_tokens DESC LIMIT 10;'
