# Database Migrations Guide

**Timestamp:** 2026-01-23 19:18 UTC+11:00

## Overview

Controlyze uses Drizzle ORM for database management with SQLite. Database migrations are automatically applied on container startup, ensuring your schema is always up to date.

## Automatic Migrations (Docker)

### How It Works

When the Docker container starts:
1. The entrypoint script (`docker-entrypoint.sh`) runs
2. Checks if `drizzle-kit` is available
3. Runs `drizzle-kit push` to apply any schema changes
4. Starts the application

**No manual intervention required!** Migrations run automatically every time the container starts.

### What Gets Migrated

- New tables
- New columns
- Schema changes from code updates
- Index changes
- Constraint modifications

### Logs

Check migration status in container logs:
```bash
docker logs controlyze
```

You'll see output like:
```
🚀 Starting Controlyze...
📦 Running database migrations...
   - Pushing schema changes to database...
✅ Database migrations completed
🎯 Starting application...
```

## Manual Migration Execution

### Inside Running Container

To manually run migrations in a running container:

```bash
# Execute migration inside the container
docker exec controlyze drizzle-kit push --config=/app/drizzle.config.ts
```

Or use the combined script:
```bash
docker exec controlyze npm run db:migrate
```

### Local Development

For local development without Docker:

```bash
# Generate migration files
bun run db:generate

# Apply migrations to database
bun run db:push

# Or do both at once
bun run db:migrate
```

### Using Bun in Container

If you prefer using bun:
```bash
docker exec controlyze bun run db:generate
docker exec controlyze bun run db:push
```

## Migration Scripts

Available npm scripts:

| Script | Command | Description |
|--------|---------|-------------|
| `db:generate` | `drizzle-kit generate` | Generate migration files from schema |
| `db:push` | `drizzle-kit push` | Push schema changes to database |
| `db:migrate` | `generate && push` | Generate and apply migrations |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio GUI |

## Database Location

The SQLite database is stored in the mounted volume:

```yaml
volumes:
  - ./data:/app/data
```

**Database file:** `./data/controlyze.db`

This ensures:
- Data persists across container restarts
- Migrations are applied to the persistent database
- Backups are easy (just copy the `data` directory)

## Troubleshooting

### Migration Fails on Startup

If migrations fail, the container will still start but log a warning:
```
⚠️  Migration failed, but continuing startup...
```

**To fix:**
1. Check container logs: `docker logs controlyze`
2. Manually run migration: `docker exec controlyze npm run db:migrate`
3. Check for schema conflicts or errors

### Database Locked

If you see "database is locked" errors:
1. Stop the container: `docker stop controlyze`
2. Ensure no other processes are accessing the database
3. Start the container: `docker start controlyze`

### Missing Migrations Directory

If you see "No migrations directory found":
- This is normal for fresh installations
- Migrations will be created when schema changes are detected
- The application will still start normally

### Permission Issues

If migrations fail due to permissions:
```bash
# Fix ownership of data directory
sudo chown -R 1001:1001 ./data
```

## Schema Changes Workflow

### Development Workflow

1. **Modify Schema** - Edit files in `src/lib/db/schema.ts`
2. **Generate Migration** - Run `bun run db:generate` (local dev)
3. **Test Locally** - Run `bun run db:push` to apply changes
4. **Commit Changes** - Commit schema and migration files
5. **Deploy** - Migrations apply automatically on container startup

### Production Deployment

1. **Pull Latest Code** - `git pull origin main`
2. **Rebuild Container** - `docker-compose build`
3. **Restart Container** - `docker-compose up -d`
4. **Migrations Run Automatically** - Check logs to confirm

## Backup Before Migrations

**Best Practice:** Backup your database before major schema changes:

```bash
# Create backup
cp ./data/controlyze.db ./data/controlyze.db.backup-$(date +%Y%m%d-%H%M%S)

# Or use docker cp
docker cp controlyze:/app/data/controlyze.db ./backup-$(date +%Y%m%d-%H%M%S).db
```

## Drizzle Studio

Access the database GUI for inspection and manual queries:

```bash
# Local development
bun run db:studio

# Inside Docker container
docker exec -it controlyze npm run db:studio
```

Then open: `https://local.drizzle.studio`

## Migration Files

Migration files are stored in the `drizzle` directory:
```
drizzle/
├── 0000_initial_schema.sql
├── 0001_add_plex_monitor.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

**Important:** Always commit migration files to git!

## Environment Variables

No special environment variables needed for migrations. The database path is configured in `drizzle.config.ts`:

```typescript
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./data/controlyze.db",
  },
};
```

## Rollback Strategy

SQLite doesn't support automatic rollbacks. To rollback:

1. **Restore from backup:**
   ```bash
   docker stop controlyze
   cp ./data/controlyze.db.backup ./data/controlyze.db
   docker start controlyze
   ```

2. **Or revert code changes:**
   ```bash
   git revert <commit-hash>
   docker-compose build
   docker-compose up -d
   ```

## CI/CD Integration

For automated deployments, migrations run automatically:

```yaml
# Example GitHub Actions workflow
- name: Build and Deploy
  run: |
    docker-compose build
    docker-compose up -d
    # Migrations run automatically on startup
    docker logs controlyze | grep "migrations"
```

## Health Checks

Verify migrations completed successfully:

```bash
# Check logs
docker logs controlyze | grep -A 5 "database migrations"

# Verify database exists
docker exec controlyze ls -lh /app/data/controlyze.db

# Check schema version
docker exec controlyze sqlite3 /app/data/controlyze.db ".tables"
```

## Common Issues

### Issue: "drizzle-kit not found"

**Solution:** Rebuild the Docker image to include drizzle-kit:
```bash
docker-compose build --no-cache
```

### Issue: "Cannot find module 'drizzle.config.ts'"

**Solution:** Ensure the config file is copied in the Dockerfile:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
```

### Issue: Migrations run but changes don't apply

**Solution:** 
1. Check if the schema file was updated
2. Verify migration files were generated
3. Manually run: `docker exec controlyze npm run db:generate`

## Best Practices

1. **Always backup before major changes**
2. **Test migrations locally first**
3. **Commit migration files to git**
4. **Monitor logs after deployment**
5. **Use semantic versioning for schema changes**
6. **Document breaking changes in commit messages**

## Quick Reference

```bash
# View migration logs
docker logs controlyze | grep migration

# Manual migration
docker exec controlyze npm run db:migrate

# Backup database
docker cp controlyze:/app/data/controlyze.db ./backup.db

# Restore database
docker cp ./backup.db controlyze:/app/data/controlyze.db
docker restart controlyze

# Access database directly
docker exec -it controlyze sqlite3 /app/data/controlyze.db

# View schema
docker exec controlyze sqlite3 /app/data/controlyze.db ".schema"
```

---

**Documentation Updated:** 2026-01-23 19:18 UTC+11:00  
**Automatic Migrations:** ✅ Enabled by Default
