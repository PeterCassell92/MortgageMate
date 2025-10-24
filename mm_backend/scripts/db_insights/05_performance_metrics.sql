-- ============================================================================
-- LLM Performance and Cost Metrics
-- ============================================================================
-- Purpose: Analyze LLM request performance, latency, errors, and costs
--
-- Prerequisites: None (queries llm_requests and llm_responses directly)
--
-- Usage: Run for performance monitoring, cost tracking, and optimization
-- ============================================================================

\echo '========================================='
\echo 'LLM Performance & Cost Metrics Report'
\echo '========================================='
\echo ''

-- ----------------------------------------------------------------------------
-- Query 1: Overall Performance Summary
-- ----------------------------------------------------------------------------
-- Purpose: High-level overview of all LLM requests
-- Use case: Daily health check, performance baseline
-- ----------------------------------------------------------------------------

\echo '1. Overall LLM Performance Summary'
\echo '-----------------------------------------'

SELECT
  -- Request counts
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_requests,
  COUNT(CASE WHEN status != 'completed' THEN 1 END) as failed_requests,
  ROUND(100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*), 2) || '%' as success_rate,

  -- Implementation breakdown
  COUNT(CASE WHEN implementation_mode = 'legacy' THEN 1 END) as legacy_requests,
  COUNT(CASE WHEN implementation_mode = 'langchain' THEN 1 END) as langchain_requests,

  -- Model usage
  COUNT(DISTINCT model) as unique_models_used,

  -- Date range
  MIN(DATE(start_time)) as first_request,
  MAX(DATE(start_time)) as last_request

FROM llm_requests;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 2: Token Usage Statistics
-- ----------------------------------------------------------------------------
-- Purpose: Detailed token consumption analysis
-- Use case: Cost forecasting, usage optimization
-- ----------------------------------------------------------------------------

\echo '2. Token Usage Statistics'
\echo '-----------------------------------------'

SELECT
  -- Total tokens
  SUM(lresp.input_tokens) as total_input_tokens,
  SUM(lresp.output_tokens) as total_output_tokens,
  SUM(lresp.total_tokens) as total_tokens,

  -- Averages
  ROUND(AVG(lresp.input_tokens), 2) as avg_input_tokens,
  ROUND(AVG(lresp.output_tokens), 2) as avg_output_tokens,
  ROUND(AVG(lresp.total_tokens), 2) as avg_total_tokens,

  -- Min/Max
  MIN(lresp.total_tokens) as min_tokens,
  MAX(lresp.total_tokens) as max_tokens,

  -- Input/Output ratio
  ROUND(SUM(lresp.input_tokens)::numeric / NULLIF(SUM(lresp.output_tokens), 0), 2) as input_output_ratio

FROM llm_requests lr
JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
WHERE lr.status = 'completed';

\echo ''

-- ----------------------------------------------------------------------------
-- Query 3: Latency Analysis
-- ----------------------------------------------------------------------------
-- Purpose: Analyze request latency and performance
-- Use case: Identify slow requests, optimize performance
-- ----------------------------------------------------------------------------

\echo '3. Latency Performance Analysis'
\echo '-----------------------------------------'

SELECT
  -- Count
  COUNT(*) as requests_with_latency,

  -- Latency statistics (in milliseconds)
  ROUND(AVG(lresp.latency_ms), 0) as avg_latency_ms,
  ROUND(AVG(lresp.latency_ms) / 1000.0, 2) as avg_latency_sec,
  MIN(lresp.latency_ms) as min_latency_ms,
  MAX(lresp.latency_ms) as max_latency_ms,

  -- Percentiles (approximation)
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY lresp.latency_ms) as p50_median_ms,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY lresp.latency_ms) as p90_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lresp.latency_ms) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY lresp.latency_ms) as p99_ms,

  -- Performance classification
  COUNT(CASE WHEN lresp.latency_ms < 3000 THEN 1 END) || ' (<3s)' as fast_requests,
  COUNT(CASE WHEN lresp.latency_ms BETWEEN 3000 AND 10000 THEN 1 END) || ' (3-10s)' as normal_requests,
  COUNT(CASE WHEN lresp.latency_ms > 10000 THEN 1 END) || ' (>10s)' as slow_requests

FROM llm_requests lr
JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
WHERE lr.status = 'completed'
  AND lresp.latency_ms IS NOT NULL;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 4: Slow Request Analysis
-- ----------------------------------------------------------------------------
-- Purpose: Identify and analyze slow requests
-- Threshold: >10 seconds
-- Use case: Performance optimization
-- ----------------------------------------------------------------------------

\echo '4. Slow Requests (>10 seconds)'
\echo '-----------------------------------------'

SELECT
  lr.id as request_id,
  lr.user_id,
  lr.model,
  lr.implementation_mode,
  ROUND(lresp.latency_ms / 1000.0, 2) as latency_seconds,
  lresp.input_tokens,
  lresp.output_tokens,
  lresp.total_tokens,
  lr.start_time,
  CASE
    WHEN lresp.total_tokens > 5000 THEN 'Large token count'
    WHEN lresp.output_tokens > 1000 THEN 'Large output'
    ELSE 'Check API performance'
  END as possible_cause
FROM llm_requests lr
JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
WHERE lr.status = 'completed'
  AND lresp.latency_ms > 10000
ORDER BY lresp.latency_ms DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 5: Error Analysis
-- ----------------------------------------------------------------------------
-- Purpose: Analyze failed requests and error patterns
-- Use case: Reliability monitoring, debugging
-- ----------------------------------------------------------------------------

\echo '5. Error Analysis (Failed Requests)'
\echo '-----------------------------------------'

SELECT
  COUNT(*) as total_errors,
  error_type,
  LEFT(error_message, 100) as error_preview,
  COUNT(*) as occurrence_count,
  MIN(start_time) as first_occurrence,
  MAX(start_time) as last_occurrence,
  ARRAY_AGG(DISTINCT model) as affected_models
FROM llm_requests
WHERE status != 'completed'
GROUP BY error_type, LEFT(error_message, 100)
ORDER BY occurrence_count DESC;

-- Show error rate
\echo ''
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No errors found'
    ELSE '⚠️ ' || COUNT(*) || ' failed request(s) detected'
  END as error_status
FROM llm_requests
WHERE status != 'completed';

\echo ''

-- ----------------------------------------------------------------------------
-- Query 6: Cost Analysis
-- ----------------------------------------------------------------------------
-- Purpose: Track estimated costs and spending trends
-- Use case: Budget monitoring, cost optimization
-- Note: Costs will show as 0 until pricing lookup is implemented
-- ----------------------------------------------------------------------------

\echo '6. Cost Analysis'
\echo '-----------------------------------------'

SELECT
  -- Total costs
  SUM(lresp.estimated_cost) as total_estimated_cost,
  AVG(lresp.estimated_cost) as avg_cost_per_request,

  -- Cost by implementation
  SUM(CASE WHEN lr.implementation_mode = 'legacy' THEN lresp.estimated_cost ELSE 0 END) as legacy_cost,
  SUM(CASE WHEN lr.implementation_mode = 'langchain' THEN lresp.estimated_cost ELSE 0 END) as langchain_cost,

  -- Projected costs (if pattern continues)
  ROUND(
    SUM(lresp.estimated_cost) /
    NULLIF(EXTRACT(DAY FROM (MAX(lr.start_time) - MIN(lr.start_time))), 0) * 30,
    2
  ) as projected_monthly_cost

FROM llm_requests lr
JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
WHERE lr.status = 'completed';

\echo ''
\echo 'Note: Cost tracking requires pricing implementation.'
\echo 'See TODO in CLAUDE.md'
\echo ''

-- ----------------------------------------------------------------------------
-- Query 7: Daily Trends
-- ----------------------------------------------------------------------------
-- Purpose: View daily patterns in usage and performance
-- Use case: Identify usage spikes, plan capacity
-- ----------------------------------------------------------------------------

\echo '7. Daily Usage Trends (Last 7 Days)'
\echo '-----------------------------------------'

SELECT
  DATE(lr.start_time) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN lr.status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN lr.status != 'completed' THEN 1 END) as failed,
  SUM(lresp.total_tokens) as total_tokens,
  ROUND(AVG(lresp.total_tokens), 0) as avg_tokens,
  ROUND(AVG(lresp.latency_ms), 0) as avg_latency_ms,
  SUM(lresp.estimated_cost) as daily_cost
FROM llm_requests lr
LEFT JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
WHERE lr.start_time > NOW() - INTERVAL '7 days'
GROUP BY DATE(lr.start_time)
ORDER BY date DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 8: Model Comparison
-- ----------------------------------------------------------------------------
-- Purpose: Compare performance across different models
-- Use case: Model selection, optimization
-- ----------------------------------------------------------------------------

\echo '8. Model Performance Comparison'
\echo '-----------------------------------------'

SELECT
  lr.model,
  COUNT(*) as request_count,
  ROUND(AVG(lresp.total_tokens), 0) as avg_total_tokens,
  ROUND(AVG(lresp.input_tokens), 0) as avg_input,
  ROUND(AVG(lresp.output_tokens), 0) as avg_output,
  ROUND(AVG(lresp.latency_ms), 0) as avg_latency_ms,
  ROUND(AVG(lresp.estimated_cost), 6) as avg_cost,
  COUNT(CASE WHEN lr.status != 'completed' THEN 1 END) as failures
FROM llm_requests lr
LEFT JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
GROUP BY lr.model
ORDER BY request_count DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Query 9: Token Efficiency by Implementation Mode
-- ----------------------------------------------------------------------------
-- Purpose: Compare token efficiency between legacy and LangChain
-- Use case: Validate implementation migration benefits
-- ----------------------------------------------------------------------------

\echo '9. Implementation Mode Comparison'
\echo '-----------------------------------------'

SELECT
  lr.implementation_mode,
  COUNT(*) as request_count,
  ROUND(AVG(lresp.total_tokens), 0) as avg_tokens,
  ROUND(AVG(lresp.latency_ms), 0) as avg_latency_ms,
  COUNT(CASE WHEN lr.status != 'completed' THEN 1 END) as error_count,
  ROUND(100.0 * COUNT(CASE WHEN lr.status = 'completed' THEN 1 END) / COUNT(*), 2) || '%' as success_rate
FROM llm_requests lr
LEFT JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
GROUP BY lr.implementation_mode
ORDER BY request_count DESC;

\echo ''

-- ----------------------------------------------------------------------------
-- Performance Summary Dashboard
-- ----------------------------------------------------------------------------

\echo '========================================='
\echo 'Performance Summary'
\echo '========================================='

WITH stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as success,
    AVG(lresp.latency_ms) as avg_latency,
    SUM(lresp.total_tokens) as total_tokens
  FROM llm_requests lr
  LEFT JOIN llm_responses lresp ON lresp.llm_request_id = lr.id
)
SELECT
  '✓ Total Requests: ' || total as metric_1,
  '✓ Success Rate: ' || ROUND(100.0 * success / total, 1) || '%' as metric_2,
  '✓ Avg Latency: ' || ROUND(avg_latency / 1000.0, 2) || 's' as metric_3,
  '✓ Total Tokens: ' || total_tokens as metric_4
FROM stats;

\echo ''
\echo '========================================='
\echo 'End of Performance Report'
\echo '========================================='
