# Plex Monitor Implementation Plan

**Timestamp:** 2026-01-23 18:58 UTC+11:00

## Current Status: ✅ Complete

All core components have been implemented and integrated into Controlyze.

## Implementation Summary

### 1. Core Monitoring Service ✅
**File:** `src/lib/plex/monitor.ts`

- Plex API integration for library health checks
- Container restart orchestration (pd_zurg → plex)
- Consecutive failure tracking
- Automatic recovery mechanism

### 2. Database Schema ✅
**File:** `src/lib/db/schema.ts`

Added `plexMonitorLogs` table:
- Tracks all monitoring events
- Stores health status, errors, and restart actions
- Enables historical analysis and uptime calculations

### 3. API Endpoints ✅

**Created:**
- `src/app/api/plex/monitor/route.ts` - Manual health check trigger
- `src/app/api/plex/status/route.ts` - Status and history retrieval

**Modified:**
- `src/app/api/cron/route.ts` - Integrated Plex monitoring into cron system

### 4. UI Dashboard ✅
**File:** `src/app/(dashboard)/plex/page.tsx`

Features:
- Real-time status cards (health, uptime, failures, restarts)
- Media unavailable alerts with library details
- Recent activity log (last 20 checks)
- Manual check trigger
- Auto-refresh every 30 seconds

### 5. Navigation Integration ✅
**File:** `src/components/dashboard/app-sidebar.tsx`

- Added "Plex Monitor" to Observability section
- Film icon for visual identification

### 6. Documentation ✅

**Created:**
- `docs/PLEX_MONITOR.md` - Complete user documentation
- `docs/PLEX_MONITOR_IMPLEMENTATION.md` - This file
- `.env.example` - Environment variable template

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Controlyze Cron Job                      │
│                    (Every 30-60 seconds)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Plex Monitor Service                        │
│                  (src/lib/plex/monitor.ts)                   │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch Plex Libraries                                     │
│  2. Check First Item Accessibility                           │
│  3. Track Consecutive Failures                               │
│  4. Trigger Restart if Threshold Met                         │
└────────────┬────────────────────────┬───────────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────────┐  ┌────────────────────────────────┐
│   Docker Client        │  │   Database (SQLite)            │
│   (Dockerode)          │  │   (plexMonitorLogs)            │
├────────────────────────┤  ├────────────────────────────────┤
│ • Restart pd_zurg      │  │ • Log all checks               │
│ • Wait 5 seconds       │  │ • Store health status          │
│ • Restart plex         │  │ • Track restart actions        │
└────────────────────────┘  └────────────────────────────────┘
             │                        │
             │                        │
             └────────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   UI Dashboard        │
              │   (/plex)             │
              ├───────────────────────┤
              │ • Current Status      │
              │ • Uptime Stats        │
              │ • Recent Logs         │
              │ • Manual Trigger      │
              └───────────────────────┘
```

## Configuration Flow

```
.env.local
    │
    ├─ PLEX_URL ──────────────┐
    ├─ PLEX_TOKEN ────────────┤
    ├─ PLEX_CONTAINER_NAME ───┼──► PlexMonitorConfig
    ├─ ZURG_CONTAINER_NAME ───┤
    ├─ PLEX_CHECK_INTERVAL ───┤
    └─ PLEX_MAX_FAILURES ─────┘
                │
                ▼
        Cron Job reads config
                │
                ▼
        Passes to checkPlexHealth()
```

## Restart Logic

```typescript
Failure Detected
    │
    ▼
consecutiveFailures++
    │
    ▼
consecutiveFailures >= maxConsecutiveFailures?
    │
    ├─ No ──► Continue monitoring
    │
    └─ Yes ──► Restart Sequence:
                  │
                  ├─ 1. Restart pd_zurg container
                  ├─ 2. Wait 5 seconds
                  ├─ 3. Restart plex container
                  ├─ 4. Log action to database
                  └─ 5. Reset consecutiveFailures = 0
```

## Database Migration Required

After deployment, run:
```bash
bun run db:generate
bun run db:push
```

This creates the `plex_monitor_logs` table.

## Testing Checklist

- [ ] Set environment variables in `.env.local`
- [ ] Run database migration
- [ ] Verify Plex API connectivity
- [ ] Test manual check via UI
- [ ] Verify cron job integration
- [ ] Test container restart functionality
- [ ] Check logs are being recorded
- [ ] Verify UI displays correct status

## Deployment Steps

1. **Update Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Plex details
   ```

2. **Run Database Migration**
   ```bash
   bun run db:generate
   bun run db:push
   ```

3. **Restart Controlyze**
   ```bash
   docker-compose restart controlyze
   ```

4. **Verify Monitoring**
   - Navigate to `/plex` in Controlyze UI
   - Click "Manual Check" button
   - Verify status appears

5. **Setup Cron Job**
   - Configure external cron to call `/api/cron` every 60 seconds
   - Or use Kubernetes CronJob
   - Example: `* * * * * curl -X POST http://localhost:3000/api/cron`

## Git Commit Strategy

Following best practices, changes will be committed as:

1. **Database Schema** - Add plex_monitor_logs table
2. **Core Service** - Implement Plex monitoring library
3. **API Endpoints** - Add Plex monitor and status routes
4. **Cron Integration** - Integrate monitoring into cron job
5. **UI Dashboard** - Create Plex monitoring page
6. **Navigation** - Add Plex monitor to sidebar
7. **Documentation** - Add comprehensive docs and examples

## Next Steps (Future Enhancements)

1. **Notifications**
   - Discord webhook on restart
   - Email alerts for repeated failures

2. **Advanced Monitoring**
   - Per-library health tracking
   - Custom library selection
   - Configurable restart delays

3. **Analytics**
   - Grafana dashboard integration
   - Uptime trends and reports
   - Failure pattern analysis

4. **Alerting**
   - Create alert rules for Plex failures
   - Integrate with existing incident management

## Files Modified/Created

### Created
- `src/lib/plex/monitor.ts`
- `src/app/api/plex/monitor/route.ts`
- `src/app/api/plex/status/route.ts`
- `src/app/(dashboard)/plex/page.tsx`
- `docs/PLEX_MONITOR.md`
- `docs/PLEX_MONITOR_IMPLEMENTATION.md`
- `.env.example`

### Modified
- `src/lib/db/schema.ts` (added plexMonitorLogs table)
- `src/app/api/cron/route.ts` (integrated Plex monitoring)
- `src/components/dashboard/app-sidebar.tsx` (added navigation link)

## Technical Decisions

### Why TypeScript?
- Matches existing codebase
- Type safety for API responses
- Better IDE support and refactoring

### Why Integrated into Cron?
- Reuses existing scheduling infrastructure
- Consistent with other monitoring tasks
- Single endpoint for all periodic checks

### Why Restart pd_zurg First?
- Zurg provides the mount points for Plex
- Plex needs Zurg to be ready before starting
- 5-second delay ensures Zurg initialization

### Why SQLite?
- Matches existing database choice
- Sufficient for monitoring logs
- No additional infrastructure needed

## Performance Impact

- **API Calls:** 1 per library per check (~5-10 libraries typical)
- **Database Writes:** 1 per check (every 60 seconds)
- **Container Restarts:** Only on failure threshold (rare)
- **UI Polling:** Every 30 seconds (minimal overhead)

**Estimated Load:** Negligible for typical deployments

## Maintenance

### Log Retention
Consider implementing log cleanup:
```sql
DELETE FROM plex_monitor_logs 
WHERE timestamp < datetime('now', '-30 days');
```

### Monitoring the Monitor
- Check cron job execution logs
- Monitor database size growth
- Review restart frequency patterns

---

**Implementation Completed:** 2026-01-23 18:58 UTC+11:00
**Status:** Ready for deployment and testing
