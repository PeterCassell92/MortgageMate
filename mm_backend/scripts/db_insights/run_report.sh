#!/bin/bash
# ============================================================================
# MortgageMate Token Usage Reporting Tool
# ============================================================================
# Purpose: Convenient wrapper script for running token usage reports
#
# Usage:
#   ./run_report.sh [report-name]
#
# Available reports:
#   setup         - Create database views (run once)
#   chat          - Chat monitoring report
#   user          - User analytics report
#   alerts        - Alerts and warnings (run regularly!)
#   performance   - LLM performance metrics
#   all           - Run all reports
#   help          - Show this help message
#
# Examples:
#   ./run_report.sh setup
#   ./run_report.sh alerts
#   ./run_report.sh all > daily_report.txt
# ============================================================================

# Database connection settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-mortgagemate_dev}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to run SQL file
run_sql_file() {
    local sql_file="$1"
    local description="$2"

    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Running: ${description}${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""

    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$SCRIPT_DIR/$sql_file"

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Report completed successfully${NC}"
    else
        echo -e "${RED}✗ Report failed with exit code: $exit_code${NC}"
    fi

    echo ""
    return $exit_code
}

# Function to display help
show_help() {
    cat << EOF
${GREEN}MortgageMate Token Usage Reporting Tool${NC}

${YELLOW}Usage:${NC}
  ./run_report.sh [report-name]

${YELLOW}Available Reports:${NC}
  ${GREEN}setup${NC}         Create database views (run this first!)
  ${GREEN}chat${NC}          Chat-level token monitoring
  ${GREEN}user${NC}          User-level analytics and usage patterns
  ${GREEN}alerts${NC}        Alerts and warnings (run regularly!)
  ${GREEN}performance${NC}   LLM performance and cost metrics
  ${GREEN}all${NC}           Run all monitoring reports (not setup)
  ${GREEN}help${NC}          Show this help message

${YELLOW}Examples:${NC}
  # First time setup
  ./run_report.sh setup

  # Daily monitoring
  ./run_report.sh alerts

  # Full daily report
  ./run_report.sh all > daily_report_\$(date +%Y%m%d).txt

  # Check specific chat issues
  ./run_report.sh chat

${YELLOW}Environment Variables:${NC}
  DB_HOST      Database host (default: localhost)
  DB_PORT      Database port (default: 5433)
  DB_USER      Database user (default: postgres)
  DB_PASSWORD  Database password (default: postgres)
  DB_NAME      Database name (default: mortgagemate_dev)

${YELLOW}Example with custom database:${NC}
  DB_HOST=prod.example.com DB_PASSWORD=secret ./run_report.sh alerts

${YELLOW}Files in this directory:${NC}
  01_create_views.sql         - Database view definitions
  02_chat_monitoring.sql      - Chat monitoring queries
  03_user_analytics.sql       - User analytics queries
  04_alerts.sql               - Alert and warning queries
  05_performance_metrics.sql  - Performance metrics queries
  README.md                   - Detailed documentation

${YELLOW}For more information:${NC}
  See README.md in this directory

EOF
}

# Main script logic
case "$1" in
    setup)
        echo -e "${YELLOW}Setting up database views...${NC}"
        run_sql_file "01_create_views.sql" "Database Views Setup"
        ;;

    chat)
        run_sql_file "02_chat_monitoring.sql" "Chat Token Monitoring Report"
        ;;

    user)
        run_sql_file "03_user_analytics.sql" "User Analytics Report"
        ;;

    alerts)
        run_sql_file "04_alerts.sql" "Alerts and Warnings Report"
        ;;

    performance)
        run_sql_file "05_performance_metrics.sql" "Performance Metrics Report"
        ;;

    all)
        echo -e "${YELLOW}Running all monitoring reports...${NC}"
        echo ""
        run_sql_file "02_chat_monitoring.sql" "Chat Token Monitoring Report"
        run_sql_file "03_user_analytics.sql" "User Analytics Report"
        run_sql_file "04_alerts.sql" "Alerts and Warnings Report"
        run_sql_file "05_performance_metrics.sql" "Performance Metrics Report"
        echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}All reports completed${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
        ;;

    help|--help|-h|"")
        show_help
        ;;

    *)
        echo -e "${RED}Error: Unknown report type '$1'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

exit 0
