#!/bin/bash

# Database Reset Script
# This will DROP all tables, re-apply migrations, and re-seed the database

set -e  # Exit on error

echo "⚠️  WARNING: This will completely wipe the database!"
echo "Database: mortgagemate_dev"
echo ""

# Check if running in non-interactive mode (for automated scripts)
if [ "$1" != "--force" ]; then
  read -p "Are you sure you want to continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

echo ""
echo "🗑️  Resetting database..."

# Set the DATABASE_URL for the Docker PostgreSQL instance
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/mortgagemate_dev?schema=public"

# Use Prisma migrate reset to:
# 1. Drop all tables
# 2. Re-apply all migrations
# 3. Run seed script
cd "$(dirname "$0")/.."
npx prisma migrate reset --force

echo ""
echo "✅ Database reset complete!"
echo "   - All tables dropped and recreated"
echo "   - All migrations applied"
echo "   - MortgageAdvisor user (id=0) created"
echo ""
