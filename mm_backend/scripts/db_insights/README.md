# Database Insights - Token Usage & Performance Monitoring

This directory contains SQL scripts for monitoring LLM token usage, costs, and performance in the MortgageMate application.

## 📋 Quick Start

### 1. Create the Views (Run Once)
```bash
cd /home/pete/Documents/MortgageCalculator/mm_backend/scripts/db_insights
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 01_create_views.sql
```

### 2. Run Monitoring Reports (As Needed)
```bash
# Chat monitoring
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 02_chat_monitoring.sql

# User analytics
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 03_user_analytics.sql

# Alerts (run regularly!)
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 04_alerts.sql

# Performance metrics
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 05_performance_metrics.sql
```

## 📁 File Overview

### `01_create_views.sql` - Database Views ⭐ RUN FIRST
**Purpose**: Create reusable database views for token usage analysis

**Views Created:**
- `chat_token_usage` - Per-chat token statistics with context utilization
- `daily_token_usage` - Daily aggregated usage and costs
- `user_token_summary` - Per-user token consumption summary

**When to run**: Once initially, then again if schema changes

**Example query after creating views:**
```sql
SELECT * FROM chat_token_usage ORDER BY total_tokens DESC LIMIT 10;
```

---

### `02_chat_monitoring.sql` - Chat-Level Monitoring
**Purpose**: Monitor individual conversations for size and token usage

**Reports:**
1. All Active Chats Overview
2. Heavy Conversations (>10K tokens)
3. Active Chats with High Message Counts
4. Detailed Chat Breakdown
5. Chats by Context Usage Tiers
6. Token Efficiency Metrics

**When to run**: Daily or when investigating specific chats

**Key use cases:**
- Find chats approaching context limits
- Identify candidates for truncation
- Monitor conversation growth patterns

---

### `03_user_analytics.sql` - User-Level Analytics
**Purpose**: Analyze token usage and activity patterns by user

**Reports:**
1. User Token Usage Summary
2. Top 10 Token Consumers
3. User Activity Patterns
4. Token Usage Distribution
5. User Efficiency Analysis
6. Per-User Chat Breakdown
7. Cost Analysis per User

**When to run**: Weekly for user reports, or for billing analysis

**Key use cases:**
- Identify power users
- Quota management
- Usage billing
- User engagement metrics

---

### `04_alerts.sql` - Alerts & Warnings ⚠️ RUN REGULARLY
**Purpose**: Identify conversations and users requiring immediate attention

**Alert Levels:**
- 🔴 **CRITICAL** (>75% context): Immediate truncation required
- 🟠 **HIGH** (50-75% context): Plan truncation, monitor closely
- 🟡 **MEDIUM** (25-50% context): Early warning, consider optimization
- ⚠️ **WARNING**: High token-per-message ratio (inefficient)
- ℹ️ **INFO**: Stale high-token chats (archival candidates)
- 🔍 **ANOMALY**: Unusual user consumption patterns

**When to run**:
- **Hourly** for production systems
- **Daily** minimum for active monitoring
- Integrate with alerting/monitoring systems

**Recommended automation:**
```bash
# Add to crontab for hourly monitoring
0 * * * * cd /path/to/scripts && PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 04_alerts.sql > /tmp/token_alerts.log
```

---

### `05_performance_metrics.sql` - LLM Performance & Costs
**Purpose**: Analyze LLM request performance, latency, and errors

**Reports:**
1. Overall Performance Summary
2. Token Usage Statistics
3. Latency Analysis (avg, p50, p90, p95, p99)
4. Slow Requests (>10 seconds)
5. Error Analysis
6. Cost Analysis (when pricing implemented)
7. Daily Usage Trends
8. Model Performance Comparison
9. Implementation Mode Comparison (Legacy vs LangChain)

**When to run**:
- Daily for performance monitoring
- After deployments to verify performance
- When investigating latency issues

**Key metrics to watch:**
- Success rate (target: >99%)
- Average latency (target: <5s)
- Error rate (target: <1%)
- Token efficiency (compare across models)

---

## 📊 Common Workflows

### Daily Health Check
```bash
# Quick morning routine
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev << EOF
-- Check alert summary
SELECT * FROM chat_token_usage WHERE context_usage_pct > 50;

-- Check yesterday's performance
SELECT * FROM daily_token_usage ORDER BY date DESC LIMIT 1;

-- Check for errors
SELECT COUNT(*), error_type FROM llm_requests WHERE status != 'completed'
  AND start_time > NOW() - INTERVAL '24 hours' GROUP BY error_type;
EOF
```

### Investigating a Specific Chat
```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev << EOF
-- Replace 69 with your chat_id
SELECT * FROM chat_token_usage WHERE chat_id = 69;

-- See all messages and their token contributions
SELECT
  m.id,
  m.from_user_id,
  LEFT(m.message_body, 50) as preview,
  lresp.total_tokens
FROM messages m
LEFT JOIN llm_responses lresp ON lresp.id = m.llm_response_id
WHERE m.chat_id = 69
ORDER BY m.sent_time;
EOF
```

### Find Chats Needing Truncation
```bash
# Simple one-liner
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -c \
  "SELECT chat_number, title, total_tokens, context_usage_pct FROM chat_token_usage WHERE context_usage_pct > 50 ORDER BY context_usage_pct DESC;"
```

## 🎯 Context Window Thresholds

Based on Claude Sonnet 4's **200,000 token** context window:

| Threshold | Tokens | % Used | Status | Action Required |
|-----------|--------|--------|--------|-----------------|
| 🟢 **Green** | 0-50K | 0-25% | Normal | Monitor only |
| 🟡 **Yellow** | 50-100K | 25-50% | Elevated | Plan optimization |
| 🟠 **Orange** | 100-150K | 50-75% | High | Truncate soon |
| 🔴 **Red** | 150K+ | 75%+ | Critical | **Truncate immediately** |

## 💡 Tips & Best Practices

### 1. Cost Tracking
Currently showing `$0.00` because pricing lookup isn't implemented. To add pricing:
- Update `mm_backend/src/services/llmLoggingService.ts`
- Implement token cost calculation based on provider rates
- See TODO in `/CLAUDE.md`: "Implement pricing lookup"

**Claude Sonnet 4 Pricing Reference:**
- Input: ~$3 per 1M tokens
- Output: ~$15 per 1M tokens

### 2. Automated Monitoring
Set up automated monitoring with cron:

```bash
# /etc/cron.d/mortgagemate-monitoring
# Run alerts every hour
0 * * * * user cd /path/to/scripts && PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 04_alerts.sql | mail -s "Token Alerts" admin@example.com

# Daily performance report
0 8 * * * user cd /path/to/scripts && PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 05_performance_metrics.sql | mail -s "Daily Performance Report" admin@example.com
```

### 3. Query Optimization
These scripts use views for better performance. If queries become slow:
- Add indexes on `messages.chat_id`, `messages.llm_response_id`
- Consider materialized views for historical reporting
- Partition large tables by date

### 4. Conversation Truncation Strategy
When chats exceed thresholds, implement one of these strategies:

**Option A: Keep Recent Messages**
```sql
-- Keep only last N messages
DELETE FROM messages
WHERE chat_id = ?
  AND id NOT IN (
    SELECT id FROM messages WHERE chat_id = ?
    ORDER BY sent_time DESC LIMIT 50
  );
```

**Option B: Summarization** (Recommended)
```typescript
// Use LLM to summarize old messages
const summary = await llmService.summarizeConversation(oldMessages);
// Store summary in mortgage_scenarios.additional_context
// Delete old messages, keep summary + recent messages
```

## 🔧 Troubleshooting

### Views Not Found
```bash
# Recreate views
cd /path/to/scripts/db_insights
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -f 01_create_views.sql
```

### Permission Denied
```bash
# Ensure user has SELECT permissions
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d mortgagemate_dev -c \
  "GRANT SELECT ON ALL TABLES IN SCHEMA public TO your_user;"
```

### Slow Queries
```sql
-- Add recommended indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_llm_response_id ON messages(llm_response_id);
CREATE INDEX IF NOT EXISTS idx_llm_responses_request_id ON llm_responses(llm_request_id);
CREATE INDEX IF NOT EXISTS idx_llm_requests_start_time ON llm_requests(start_time);
```

## 📈 Next Steps

See `/CLAUDE.md` TODO list for:
- ✅ LLM request/response logging (DONE)
- 🔲 Implement pricing lookup for cost tracking
- 🔲 Conversation truncation/summarization
- 🔲 Automated alerts integration
- 🔲 User quota management
- 🔲 Token usage optimization

## 📞 Support

For questions or issues with these scripts, refer to:
- Main project docs: `/CLAUDE.md`
- Backend docs: `/mm_backend/CLAUDE.md`
- Database schema: `/mm_backend/prisma/schema.prisma`

---

**Last Updated**: 2025-10-24
**Maintained by**: MortgageMate Development Team
