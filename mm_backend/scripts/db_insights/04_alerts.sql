-- ============================================================================
-- Token Usage Alerts and Warnings
-- ============================================================================
-- Purpose: Identify conversations and users requiring immediate attention
--          due to approaching context limits, anomalous usage, or other issues
--
-- Prerequisites: Run 01_create_views.sql first to create required views
--
-- Usage: Run regularly (daily/hourly) to catch issues proactively
--        Integrate with monitoring/alerting systems
-- ============================================================================

\echo '========================================='
\echo 'Token Usage Alerts & Warnings'
\echo '========================================='
\echo ''

-- ----------------------------------------------------------------------------
-- CRITICAL ALERT: Conversations Approaching Context Limit
-- ----------------------------------------------------------------------------
-- Purpose: Find chats that will soon exceed the 200K token context window
-- Threshold: >75% of context window (>150K tokens)
-- Action Required: Immediate truncation or summarization needed
-- ----------------------------------------------------------------------------

\echo '🔴 CRITICAL: Chats Approaching Context Limit (>75%)'
\echo '-----------------------------------------'

SELECT
  '🔴 CRITICAL' as alert_level,
  chat_id,
  user_id,
  chat_number,
  title,
  total_messages,
  total_tokens,
  context_usage_pct || '%' as context_used,
  200000 - total_tokens as tokens_remaining,
  'TRUNCATE IMMEDIATELY' as action_required
FROM chat_token_usage
WHERE context_usage_pct > 75
ORDER BY context_usage_pct DESC;

-- Show count
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No critical alerts'
    ELSE '⚠️ ' || COUNT(*) || ' chat(s) require immediate action'
  END as status
FROM chat_token_usage
WHERE context_usage_pct > 75;

\echo ''

-- ----------------------------------------------------------------------------
-- HIGH PRIORITY: Conversations Exceeding 50% Context
-- ----------------------------------------------------------------------------
-- Purpose: Find chats that should be monitored closely
-- Threshold: 50-75% of context window (100K-150K tokens)
-- Action Required: Plan truncation/summarization, monitor growth
-- ----------------------------------------------------------------------------

\echo '🟠 HIGH: Chats Exceeding 50% Context Usage'
\echo '-----------------------------------------'

SELECT
  '🟠 HIGH' as alert_level,
  chat_id,
  user_id,
  chat_number,
  title,
  total_messages,
  total_tokens,
  context_usage_pct || '%' as context_used,
  200000 - total_tokens as tokens_remaining,
  'Monitor closely, plan truncation' as action_required
FROM chat_token_usage
WHERE context_usage_pct > 50 AND context_usage_pct <= 75
ORDER BY context_usage_pct DESC;

-- Show count
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No high priority alerts'
    ELSE '⚠️ ' || COUNT(*) || ' chat(s) approaching limits'
  END as status
FROM chat_token_usage
WHERE context_usage_pct > 50 AND context_usage_pct <= 75;

\echo ''

-- ----------------------------------------------------------------------------
-- MEDIUM PRIORITY: Large Conversations (25-50%)
-- ----------------------------------------------------------------------------
-- Purpose: Early warning for conversations that may become problematic
-- Threshold: 25-50% of context window (50K-100K tokens)
-- Action Required: Monitor, consider optimization
-- ----------------------------------------------------------------------------

\echo '🟡 MEDIUM: Large Conversations (25-50% context)'
\echo '-----------------------------------------'

SELECT
  '🟡 MEDIUM' as alert_level,
  chat_id,
  user_id,
  chat_number,
  title,
  total_messages,
  total_tokens,
  context_usage_pct || '%' as context_used,
  ROUND(total_tokens::numeric / NULLIF(total_messages, 0), 0) as tokens_per_message
FROM chat_token_usage
WHERE context_usage_pct > 25 AND context_usage_pct <= 50
ORDER BY context_usage_pct DESC;

-- Show count
SELECT
  COUNT(*) || ' chat(s) in medium range' as status
FROM chat_token_usage
WHERE context_usage_pct > 25 AND context_usage_pct <= 50;

\echo ''

-- ----------------------------------------------------------------------------
-- WARNING: Rapidly Growing Conversations
-- ----------------------------------------------------------------------------
-- Purpose: Identify chats with unusually high tokens-per-message ratio
--          These may reach limits faster than expected
-- Threshold: >2000 tokens per message average
-- Action Required: Investigate cause, optimize prompts
-- ----------------------------------------------------------------------------

\echo '⚠️ WARNING: High Token-Per-Message Ratio'
\echo '-----------------------------------------'

SELECT
  '⚠️ WARNING' as alert_level,
  chat_id,
  user_id,
  chat_number,
  title,
  total_messages,
  total_tokens,
  ROUND(total_tokens::numeric / NULLIF(total_messages, 0), 0) as tokens_per_message,
  context_usage_pct || '%' as current_context_used,
  'Check for large system prompts or repeated context' as possible_cause
FROM chat_token_usage
WHERE total_messages > 5  -- Ignore very new chats
  AND total_tokens::numeric / NULLIF(total_messages, 0) > 2000
ORDER BY tokens_per_message DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- INFO: Stale High-Token Chats
-- ----------------------------------------------------------------------------
-- Purpose: Find high-token chats that haven't been accessed recently
--          These may be candidates for archival or cleanup
-- Threshold: >50K tokens AND no activity in 30 days
-- Action Required: Consider archiving or notifying user
-- ----------------------------------------------------------------------------

\echo 'ℹ️ INFO: Stale High-Token Chats (>50K tokens, inactive 30+ days)'
\echo '-----------------------------------------'

SELECT
  'ℹ️ INFO' as alert_level,
  chat_id,
  user_id,
  chat_number,
  title,
  total_tokens,
  context_usage_pct || '%' as context_used,
  DATE(last_message_time) as last_active,
  EXTRACT(DAY FROM (NOW() - last_message_time))::INTEGER as days_inactive,
  'Consider archiving' as action_suggested
FROM chat_token_usage
WHERE total_tokens > 50000
  AND last_message_time < NOW() - INTERVAL '30 days'
ORDER BY total_tokens DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- ANOMALY: Users with Unusually High Token Consumption
-- ----------------------------------------------------------------------------
-- Purpose: Detect users whose usage patterns are anomalous
-- Threshold: >100K tokens total OR >10K avg per chat
-- Action Required: Investigate usage patterns, potential abuse
-- ----------------------------------------------------------------------------

\echo '🔍 ANOMALY: Users with High Token Consumption'
\echo '-----------------------------------------'

SELECT
  '🔍 ANOMALY' as alert_level,
  user_id,
  active_chats,
  total_tokens_used,
  ROUND(avg_tokens_per_chat, 0) as avg_per_chat,
  largest_chat_tokens as largest_chat,
  DATE(last_activity) as last_active,
  CASE
    WHEN total_tokens_used > 100000 THEN 'Very high total usage'
    WHEN avg_tokens_per_chat > 10000 THEN 'High average per chat'
    ELSE 'Check usage patterns'
  END as concern
FROM user_token_summary
WHERE total_tokens_used > 100000
   OR avg_tokens_per_chat > 10000
ORDER BY total_tokens_used DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Alert Summary Dashboard
-- ----------------------------------------------------------------------------
-- Purpose: Quick overview of all alert levels
-- Use case: Daily monitoring dashboard
-- ----------------------------------------------------------------------------

\echo '========================================='
\echo 'Alert Summary Dashboard'
\echo '========================================='

SELECT
  '🔴 CRITICAL (>75%)' as alert_type,
  COUNT(*) as count,
  COALESCE(SUM(total_tokens), 0) as total_tokens
FROM chat_token_usage
WHERE context_usage_pct > 75

UNION ALL

SELECT
  '🟠 HIGH (50-75%)' as alert_type,
  COUNT(*) as count,
  COALESCE(SUM(total_tokens), 0) as total_tokens
FROM chat_token_usage
WHERE context_usage_pct > 50 AND context_usage_pct <= 75

UNION ALL

SELECT
  '🟡 MEDIUM (25-50%)' as alert_type,
  COUNT(*) as count,
  COALESCE(SUM(total_tokens), 0) as total_tokens
FROM chat_token_usage
WHERE context_usage_pct > 25 AND context_usage_pct <= 50

UNION ALL

SELECT
  '🟢 NORMAL (<25%)' as alert_type,
  COUNT(*) as count,
  COALESCE(SUM(total_tokens), 0) as total_tokens
FROM chat_token_usage
WHERE context_usage_pct <= 25;

\echo ''
\echo '========================================='
\echo 'End of Alert Report'
\echo 'Run this report regularly to catch issues early!'
\echo '========================================='
