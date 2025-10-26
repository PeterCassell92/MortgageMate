#!/bin/bash

# Script to create and apply Prisma migrations with proper environment setup
# Usage: ./nameAndApplyMigration.sh <migration-name>

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if migration name was provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Migration name is required${NC}"
    echo "Usage: ./nameAndApplyMigration.sh <migration-name>"
    echo "Example: ./nameAndApplyMigration.sh add_api_wrapper_to_llm_requests"
    exit 1
fi

MIGRATION_NAME=$1

# Get the root project directory (two levels up from scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$BACKEND_DIR")"

echo -e "${YELLOW}Starting Prisma migration: ${MIGRATION_NAME}${NC}"
echo "Backend directory: ${BACKEND_DIR}"
echo "Root directory: ${ROOT_DIR}"

# Check if .env file exists
if [ ! -f "${ROOT_DIR}/.env" ]; then
    echo -e "${RED}Error: .env file not found at ${ROOT_DIR}/.env${NC}"
    exit 1
fi

# Load DATABASE_URL from .env
export $(grep -v '^#' "${ROOT_DIR}/.env" | grep DATABASE_URL | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env file${NC}"
    exit 1
fi

echo -e "${GREEN}DATABASE_URL loaded successfully${NC}"
echo "Database: $(echo $DATABASE_URL | sed 's/postgresql:\/\/[^@]*@/postgresql:\/\/***@/')"

# Navigate to backend directory
cd "$BACKEND_DIR" || exit 1

# Run Prisma migration
echo -e "${YELLOW}Running: npx prisma migrate dev --name ${MIGRATION_NAME}${NC}"
npx prisma migrate dev --name "$MIGRATION_NAME"

# Check exit status
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration '${MIGRATION_NAME}' completed successfully!${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
fi
