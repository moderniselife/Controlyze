#!/bin/sh
set -e

echo "🚀 Starting Controlyze..."

# Database path
DB_PATH="${DATABASE_PATH:-/app/data/controlyze.db}"

echo "📦 Running database migrations..."

# Check if database exists, if not create directory
mkdir -p "$(dirname "$DB_PATH")"

# Apply SQL migrations directly if they exist
if [ -d "/app/drizzle" ] && [ -n "$(ls -A /app/drizzle/*.sql 2>/dev/null)" ]; then
  echo "   - Applying SQL migrations to database..."
  for migration in /app/drizzle/*.sql; do
    if [ -f "$migration" ]; then
      echo "   - Running migration: $(basename "$migration")"
      # Convert backticks to double quotes for SQLite compatibility
      sed 's/`/"/g' "$migration" | sqlite3 "$DB_PATH" 2>&1 | grep -v "table .* already exists" || true
    fi
  done
  echo "✅ Database migrations completed"
else
  echo "ℹ️  No migration files found, skipping..."
fi

echo "🎯 Starting application..."
exec "$@"
