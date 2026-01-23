# Plex Monitor

**Timestamp:** 2026-01-23 18:58 UTC+11:00

## Overview

The Plex Monitor is a TypeScript-based monitoring solution integrated into Controlyze that automatically detects when Plex media becomes unavailable and triggers container restarts for both Plex and pd_zurg containers.

## Architecture

### Components

1. **Monitoring Service** (`src/lib/plex/monitor.ts`)
   - Core monitoring logic
   - Plex API integration
   - Container restart orchestration
   - Failure tracking

2. **API Endpoints**
   - `/api/plex/monitor` - Manual health check trigger
   - `/api/plex/status` - Retrieve monitoring status and history
   - `/api/cron` - Integrated automated monitoring

3. **Database Schema** (`src/lib/db/schema.ts`)
   - `plexMonitorLogs` table for tracking all monitoring events
   - Stores health status, library availability, errors, and restart actions

4. **UI Dashboard** (`src/app/(dashboard)/plex/page.tsx`)
   - Real-time status display
   - Historical uptime statistics
   - Recent activity logs
   - Manual check trigger

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Required
PLEX_URL=http://your-plex-server:32400
PLEX_TOKEN=your-plex-token

# Optional (with defaults)
PLEX_CONTAINER_NAME=plex
ZURG_CONTAINER_NAME=pd_zurg
PLEX_CHECK_INTERVAL=60
PLEX_MAX_FAILURES=3
```

### Getting Your Plex Token

1. Sign in to Plex Web App
2. Open any media item
3. Click "Get Info" → "View XML"
4. Look for `X-Plex-Token` in the URL

### Container Names

The monitor needs to know the exact Docker container names:
- Default Plex container: `plex`
- Default Zurg container: `pd_zurg`

You can find your container names with:
```bash
docker ps --format "{{.Names}}"
```

## How It Works

### Monitoring Flow

1. **Scheduled Check** (via cron job every 30-60 seconds)
   - Fetches all Plex libraries
   - Checks first item in each library for accessibility
   - Records results to database

2. **Failure Detection**
   - Tracks consecutive failures
   - When failures reach threshold (default: 3), triggers restart

3. **Container Restart Sequence**
   - Restarts `pd_zurg` container first
   - Waits 5 seconds for zurg to initialize
   - Restarts `plex` container
   - Logs all actions to database

4. **Recovery**
   - Resets failure counter after successful restart
   - Continues monitoring

### Library Availability Check

The monitor checks library availability by:
1. Fetching the first item from each library
2. Checking if media parts are accessible
3. Marking library as unavailable if media cannot be accessed

## Database Schema

```sql
CREATE TABLE plex_monitor_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  is_healthy INTEGER NOT NULL,
  media_available INTEGER NOT NULL,
  error TEXT,
  libraries_checked INTEGER NOT NULL,
  unavailable_libraries TEXT,
  consecutive_failures INTEGER NOT NULL,
  action_taken TEXT,
  restarted_containers TEXT
);
```

## API Reference

### GET /api/plex/monitor

Triggers a manual health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-01-23T07:58:00.000Z",
    "isHealthy": true,
    "mediaAvailable": true,
    "librariesChecked": 5,
    "unavailableLibraries": [],
    "consecutiveFailures": 0,
    "actionTaken": null
  }
}
```

### GET /api/plex/status?hours=24&limit=100

Retrieves monitoring status and history.

**Query Parameters:**
- `hours` (default: 24) - Hours of history to retrieve
- `limit` (default: 100) - Maximum number of logs to return

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStatus": {
      "isHealthy": true,
      "mediaAvailable": true,
      "timestamp": "2026-01-23T07:58:00.000Z",
      "consecutiveFailures": 0,
      "unavailableLibraries": []
    },
    "statistics": {
      "totalChecks": 2880,
      "healthyChecks": 2875,
      "uptimePercent": 99.83,
      "restartCount": 2,
      "period": {
        "hours": 24,
        "from": "2026-01-22T07:58:00.000Z",
        "to": "2026-01-23T07:58:00.000Z"
      }
    },
    "recentLogs": [...]
  }
}
```

## UI Features

### Dashboard (`/plex`)

- **Current Status Card** - Real-time health indicator
- **Uptime Statistics** - 24-hour uptime percentage
- **Consecutive Failures** - Current failure count
- **Auto Restarts** - Number of automatic restarts triggered
- **Media Unavailable Alert** - Shows which libraries are down
- **Recent Activity Log** - Last 20 monitoring checks with details

### Actions

- **Refresh** - Reload current status
- **Manual Check** - Trigger immediate health check

## Troubleshooting

### Monitor Not Running

1. Check environment variables are set correctly
2. Verify Plex URL is accessible from Controlyze container
3. Check Plex token is valid
4. Review logs: `docker logs controlyze`

### Containers Not Restarting

1. Verify Docker socket is mounted: `/var/run/docker.sock`
2. Check container names match configuration
3. Ensure Controlyze has permissions to restart containers
4. Review error messages in Plex monitor logs

### False Positives

If the monitor triggers restarts unnecessarily:
1. Increase `PLEX_MAX_FAILURES` (default: 3)
2. Increase `PLEX_CHECK_INTERVAL` (default: 60 seconds)
3. Check network connectivity between Controlyze and Plex

### Database Issues

Generate and push database schema:
```bash
bun run db:generate
bun run db:push
```

## Integration with Cron System

The Plex monitor is integrated into the existing cron job system at `/api/cron`. This endpoint should be called periodically (every 30-60 seconds) by:

1. External cron service (e.g., cron-job.org)
2. Kubernetes CronJob
3. Frontend polling (not recommended for production)

Example cron configuration:
```bash
# Every minute
* * * * * curl -X POST http://localhost:3000/api/cron
```

## Performance Considerations

- Each check queries Plex API for all libraries
- Checking first item in each library adds minimal overhead
- Database writes are async and non-blocking
- Container restarts take 5-10 seconds total

## Security

- Plex token stored in environment variables (never exposed to frontend)
- API endpoints respect authentication middleware
- Database logs contain no sensitive information
- Container operations require Docker socket access

## Enhanced Features

All requested enhancements have been implemented! See `PLEX_MONITOR_ENHANCEMENTS.md` for detailed documentation.

- [x] Configurable restart delay between containers
- [x] Discord notifications on restart
- [x] Custom library selection for monitoring
- [x] Webhook support for external integrations
- [x] Grafana dashboard integration
- [x] Alert rules for repeated failures

## Future Enhancements

Potential future additions:

- [ ] Email notifications
- [ ] SMS notifications via Twilio
- [ ] Slack integration
- [ ] Microsoft Teams integration
- [ ] Per-library restart thresholds
- [ ] Smart restart scheduling
- [ ] Predictive failure detection
