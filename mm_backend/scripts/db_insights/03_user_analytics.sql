-- ============================================================================
-- User-Level Token Usage Analytics
-- ============================================================================
-- Purpose: Analyze token usage, costs, and activity patterns at the user level
--
-- Prerequisites: Run 01_create_views.sql first to create required views
--
-- Usage: Run for user-level reporting, quota management, and billing analysis
-- ============================================================================

\echo '========================================='
\echo 'User Token Usage Analytics Report'
\echo '========================================='
\echo ''

-- ----------------------------------------------------------------------------
-- Query 1: User Summary Overview
-- ----------------------------------------------------------------------------
-- Purpose: High-level overview of all users and their token consumption
-- Use case: Identify power users, monitor overall platform usage
-- ----------------------------------------------------------------------------

\echo '1. User Token Usage Summary'
\echo '-----------------------------------------'

SELECT
  user_id,
  active_chats,
  total_messages,
  total_tokens_used,
  avg_tokens_per_chat,
  total_cost,
  DATE(last_activity) as last_active,
  DATE(first_chat_created) as user_since
FROM user_token_summary
ORDER BY total_tokens_used DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 2: Top Token Consumers
-- ----------------------------------------------------------------------------
-- Purpose: Identify users consuming the most tokens
-- Threshold: Top 10 users
-- Use case: Usage monitoring, quota enforcement, billing verification
-- ----------------------------------------------------------------------------

\echo '2. Top 10 Token Consumers'
\echo '-----------------------------------------'

SELECT
  user_id,
  active_chats,
  total_tokens_used,
  ROUND(total_tokens_used::numeric / 1000, 2) || 'K' as tokens_formatted,
  total_cost,
  ROUND(avg_tokens_per_chat, 0) as avg_per_chat,
  largest_chat_tokens as largest_chat,
  total_messages,
  DATE(last_activity) as last_active
FROM user_token_summary
ORDER BY total_tokens_used DESC
LIMIT 10;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 3: User Activity Patterns
-- ----------------------------------------------------------------------------
-- Purpose: Understand user engagement levels
-- Use case: Identify active vs inactive users, engagement analytics
-- ----------------------------------------------------------------------------

\echo '3. User Activity Patterns (Last 30 Days)'
\echo '-----------------------------------------'

SELECT
  user_id,
  active_chats,
  total_messages,
  total_tokens_used,
  CASE
    WHEN last_activity > NOW() - INTERVAL '1 day' THEN '🟢 Active Today'
    WHEN last_activity > NOW() - INTERVAL '7 days' THEN '🟡 Active This Week'
    WHEN last_activity > NOW() - INTERVAL '30 days' THEN '🟠 Active This Month'
    ELSE '⚪ Inactive'
  END as activity_status,
  DATE(last_activity) as last_seen,
  EXTRACT(DAY FROM (NOW() - last_activity)) as days_since_activity
FROM user_token_summary
ORDER BY last_activity DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 4: User Token Distribution Analysis
-- ----------------------------------------------------------------------------
-- Purpose: Understand how token usage is distributed across users
-- Use case: Platform capacity planning, fair usage policy
-- ----------------------------------------------------------------------------

\echo '4. Token Usage Distribution'
\echo '-----------------------------------------'

SELECT
  CASE
    WHEN total_tokens_used >= 100000 THEN '🔴 Heavy (>100K)'
    WHEN total_tokens_used >= 50000 THEN '🟠 High (50-100K)'
    WHEN total_tokens_used >= 10000 THEN '🟡 Medium (10-50K)'
    WHEN total_tokens_used >= 1000 THEN '🟢 Low (1-10K)'
    ELSE '⚪ Minimal (<1K)'
  END as usage_tier,
  COUNT(*) as user_count,
  SUM(total_tokens_used) as tokens_in_tier,
  ROUND(AVG(total_tokens_used), 0) as avg_tokens,
  SUM(total_cost) as cost_in_tier
FROM user_token_summary
GROUP BY
  CASE
    WHEN total_tokens_used >= 100000 THEN '🔴 Heavy (>100K)'
    WHEN total_tokens_used >= 50000 THEN '🟠 High (50-100K)'
    WHEN total_tokens_used >= 10000 THEN '🟡 Medium (10-50K)'
    WHEN total_tokens_used >= 1000 THEN '🟢 Low (1-10K)'
    ELSE '⚪ Minimal (<1K)'
  END
ORDER BY avg_tokens DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 5: User Efficiency Metrics
-- ----------------------------------------------------------------------------
-- Purpose: Compare how efficiently users are using the platform
-- Use case: Identify users with unusually high token consumption per message
-- ----------------------------------------------------------------------------

\echo '5. User Efficiency Analysis'
\echo '-----------------------------------------'

SELECT
  user_id,
  active_chats,
  total_messages,
  total_tokens_used,
  ROUND(total_tokens_used::numeric / NULLIF(total_messages, 0), 0) as tokens_per_message,
  ROUND(avg_tokens_per_chat, 0) as avg_per_chat,
  ROUND(total_messages::numeric / NULLIF(active_chats, 0), 1) as messages_per_chat,
  CASE
    WHEN total_tokens_used::numeric / NULLIF(total_messages, 0) > 3000 THEN '⚠️ High consumption'
    WHEN total_tokens_used::numeric / NULLIF(total_messages, 0) > 1500 THEN '🟡 Above average'
    ELSE '✓ Normal'
  END as efficiency_status
FROM user_token_summary
WHERE total_messages > 0
ORDER BY tokens_per_message DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 6: Per-User Chat Details
-- ----------------------------------------------------------------------------
-- Purpose: Detailed breakdown of each user's chats
-- Use case: User support, investigating specific user issues
-- ----------------------------------------------------------------------------

\echo '6. Per-User Chat Breakdown (Users with >1 chat)'
\echo '-----------------------------------------'

SELECT
  ctu.user_id,
  ctu.chat_number,
  ctu.title,
  ctu.total_messages,
  ctu.total_tokens,
  ROUND(ctu.context_usage_pct, 2) || '%' as context_used,
  ctu.total_cost,
  DATE(ctu.last_message_time) as last_active,
  EXTRACT(DAY FROM (NOW() - ctu.last_message_time)) as days_idle
FROM chat_token_usage ctu
WHERE ctu.user_id IN (
  SELECT user_id
  FROM user_token_summary
  WHERE active_chats > 1
)
ORDER BY ctu.user_id, ctu.total_tokens DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 7: Cost Analysis per User
-- ----------------------------------------------------------------------------
-- Purpose: Breakdown of costs by user
-- Use case: Billing, cost allocation, budget tracking
-- Note: Costs will be 0.000000 until pricing lookup is implemented
-- ----------------------------------------------------------------------------

\echo '7. User Cost Analysis'
\echo '-----------------------------------------'

SELECT
  user_id,
  active_chats,
  total_tokens_used,
  total_cost,
  ROUND(total_cost / NULLIF(active_chats, 0), 4) as avg_cost_per_chat,
  ROUND(total_cost / NULLIF(total_messages, 0), 6) as avg_cost_per_message,
  CASE
    WHEN total_cost > 10 THEN '🔴 High Cost User'
    WHEN total_cost > 5 THEN '🟠 Medium Cost User'
    WHEN total_cost > 1 THEN '🟡 Low Cost User'
    ELSE '🟢 Minimal Cost'
  END as cost_tier
FROM user_token_summary
WHERE total_cost > 0
ORDER BY total_cost DESC;

\echo ''
\echo 'Note: Cost tracking requires pricing implementation.'
\echo 'See TODO in CLAUDE.md: "Implement pricing lookup"'
\echo ''

\echo '========================================='
\echo 'End of User Analytics Report'
\echo '========================================='
