#!/bin/sh
set -e

echo "🚀 Starting Controlyze..."

# Check if drizzle-kit is available
if command -v drizzle-kit >/dev/null 2>&1; then
  echo "📦 Running database migrations..."
  
  # Run migrations if they exist
  if [ -d "/app/drizzle" ]; then
    echo "   - Pushing schema changes to database..."
    drizzle-kit push --config=/app/drizzle.config.ts || {
      echo "⚠️  Migration failed, but continuing startup..."
    }
    echo "✅ Database migrations completed"
  else
    echo "ℹ️  No migrations directory found, skipping..."
  fi
else
  echo "ℹ️  drizzle-kit not found, skipping migrations..."
fi

echo "🎯 Starting application..."
exec "$@"
