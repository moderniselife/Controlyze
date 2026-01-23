#!/bin/sh
set -e

echo "🚀 Starting Controlyze..."

# Check if drizzle-kit is available
if command -v drizzle-kit >/dev/null 2>&1; then
  echo "📦 Running database migrations..."
  
  # Generate migrations if they don't exist
  if [ ! -f "/app/drizzle/0000_*.sql" ]; then
    echo "   - Generating initial migrations..."
    drizzle-kit generate --config=/app/drizzle.config.ts || {
      echo "⚠️  Migration generation failed, but continuing..."
    }
  fi
  
  # Push schema changes to database
  echo "   - Pushing schema changes to database..."
  drizzle-kit push --config=/app/drizzle.config.ts || {
    echo "⚠️  Migration push failed, but continuing startup..."
  }
  echo "✅ Database migrations completed"
else
  echo "ℹ️  drizzle-kit not found, skipping migrations..."
fi

echo "🎯 Starting application..."
exec "$@"
