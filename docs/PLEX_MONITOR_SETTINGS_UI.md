# Plex Monitor Settings UI

**Timestamp:** 2026-01-23 19:12 UTC+11:00

## Overview

All Plex monitoring configuration can now be managed through the Controlyze settings UI instead of environment variables. Settings are stored in the database and can be updated without restarting the application.

## Accessing Settings

Navigate to **Settings** → **Plex Monitor** in the Controlyze dashboard.

## Configuration Options

### Basic Configuration

| Setting | Description | Default | Required |
|---------|-------------|---------|----------|
| **Enable Plex Monitoring** | Master switch for monitoring | `false` | Yes |
| **Plex Server URL** | Full URL to your Plex server | - | Yes |
| **Plex Token** | Authentication token from Plex | - | Yes |
| **Plex Container Name** | Docker container name for Plex | `plex` | Yes |
| **Zurg Container Name** | Docker container name for Zurg | `pd_zurg` | Yes |

### Monitoring Settings

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| **Check Interval** | Seconds between health checks | `60` | 10-600 |
| **Max Failures** | Consecutive failures before restart | `3` | 1-10 |
| **Restart Delay** | Seconds between container restarts | `5` | 1-60 |
| **Monitored Libraries** | Specific libraries to monitor | All | Optional |

### Notifications & Integrations

| Setting | Description | Required |
|---------|-------------|----------|
| **Discord Webhook URL** | Send notifications to Discord | No |
| **Custom Webhook URL** | Send events to external systems | No |
| **Enable Alert Integration** | Create alerts in Controlyze | No |

## Settings Priority

The system checks for configuration in this order:

1. **Database Settings** (via UI) - Highest priority
2. **Environment Variables** - Fallback if database settings not configured

This allows you to:
- Use environment variables for initial setup
- Migrate to UI-based configuration
- Override environment variables through the UI

## API Endpoints

### GET /api/settings/plex

Retrieve current Plex monitor settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "plexUrl": "http://plex:32400",
    "plexToken": "••••••••",
    "plexContainerName": "plex",
    "zurgContainerName": "pd_zurg",
    "checkIntervalSeconds": 60,
    "maxConsecutiveFailures": 3,
    "restartDelaySeconds": 5,
    "discordWebhookUrl": "",
    "webhookUrl": "",
    "monitoredLibraries": ["Movies", "TV Shows"],
    "enableAlerts": true
  }
}
```

### POST /api/settings/plex

Save Plex monitor settings.

**Request Body:**
```json
{
  "enabled": true,
  "plexUrl": "http://plex:32400",
  "plexToken": "your-token-here",
  "plexContainerName": "plex",
  "zurgContainerName": "pd_zurg",
  "checkIntervalSeconds": 60,
  "maxConsecutiveFailures": 3,
  "restartDelaySeconds": 5,
  "discordWebhookUrl": "https://discord.com/api/webhooks/...",
  "webhookUrl": "https://your-domain.com/api/events",
  "monitoredLibraries": ["Movies", "TV Shows"],
  "enableAlerts": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plex settings saved successfully"
}
```

## Security

- **Plex Token:** Masked in the UI as `••••••••` after saving
- **Stored Encrypted:** Tokens stored securely in database
- **No Exposure:** Never exposed to frontend after initial save
- **Authentication Required:** Settings API requires authentication

## Status Page Integration

When Plex monitoring is enabled:
- Automatically appears on status page at `/status`
- Service name: "Plex Media Server"
- Status updates every check interval
- Included in overall uptime calculations
- Visible in uptime history graph

## Migration from Environment Variables

### Step 1: Current Environment Variables

If you have existing environment variables:
```bash
PLEX_URL=http://plex:32400
PLEX_TOKEN=your-token
PLEX_CONTAINER_NAME=plex
ZURG_CONTAINER_NAME=pd_zurg
PLEX_CHECK_INTERVAL=60
PLEX_MAX_FAILURES=3
PLEX_RESTART_DELAY=5
PLEX_DISCORD_WEBHOOK_URL=https://discord.com/...
PLEX_WEBHOOK_URL=https://your-domain.com/...
PLEX_MONITORED_LIBRARIES=Movies,TV Shows
PLEX_ENABLE_ALERTS=true
```

### Step 2: Access Settings UI

1. Navigate to Settings → Plex Monitor
2. Settings will auto-populate from environment variables
3. Review and adjust as needed
4. Click "Save Settings"

### Step 3: Remove Environment Variables (Optional)

After saving to database, you can optionally remove environment variables from `.env.local`. The system will continue using database settings.

## Adding to Settings Page

To add the Plex Monitor settings to your main settings page:

```tsx
import { PlexMonitorSettings } from "@/components/settings/PlexMonitorSettings";

// In your settings page component:
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="plex">Plex Monitor</TabsTrigger>
    {/* other tabs */}
  </TabsList>
  
  <TabsContent value="plex">
    <PlexMonitorSettings />
  </TabsContent>
</Tabs>
```

## Troubleshooting

### Settings Not Saving

1. Check browser console for errors
2. Verify authentication is valid
3. Ensure database is accessible
4. Check server logs for errors

### Settings Not Taking Effect

1. Settings apply on next monitoring cycle
2. Wait for check interval duration
3. Trigger manual check from `/plex` dashboard
4. Verify settings were saved (refresh page)

### Environment Variables Still Used

1. Database settings take priority
2. Check if "Enable Plex Monitoring" is toggled on
3. Verify Plex URL and Token are not empty
4. Check database for `plex_monitor` key in settings table

### Token Not Updating

If you see `••••••••` in the token field:
- This is normal - token is masked for security
- To update token, clear field and enter new token
- Leaving `••••••••` will keep existing token

## Best Practices

### Initial Setup

1. Start with environment variables for testing
2. Migrate to UI once configuration is stable
3. Use UI for ongoing adjustments

### Security

1. Never share screenshots with visible tokens
2. Rotate tokens periodically
3. Use webhook URLs with authentication
4. Limit Discord webhook permissions

### Monitoring

1. Start with conservative settings (longer intervals, more failures)
2. Adjust based on your infrastructure reliability
3. Monitor restart frequency
4. Review logs regularly

### Libraries

1. Monitor all libraries initially
2. Narrow down to critical libraries if needed
3. Use library names for readability
4. Use library keys for stability

## Database Schema

Settings are stored in the `settings` table:

```sql
SELECT * FROM settings WHERE key = 'plex_monitor';
```

**Structure:**
- `key`: `plex_monitor`
- `value`: JSON string of all settings
- `category`: `monitoring`
- `updatedAt`: Last modification timestamp

---

**Documentation Updated:** 2026-01-23 19:12 UTC+11:00  
**Settings UI:** ✅ Complete and Ready for Use
