# Plex Monitor Enhancements

**Timestamp:** 2026-01-23 19:03 UTC+11:00  
**Status:** ✅ Complete

## Overview

This document details the enhanced features added to the Plex monitoring system, including configurable restart delays, Discord notifications, custom library selection, webhook support, Grafana integration, and alert rules.

## New Features

### 1. Configurable Restart Delay Between Containers

**Environment Variable:** `PLEX_RESTART_DELAY`  
**Default:** 5 seconds  
**Type:** Integer

Allows customization of the delay between restarting the pd_zurg and Plex containers. This ensures zurg has sufficient time to initialize before Plex starts.

```bash
# Wait 10 seconds between container restarts
PLEX_RESTART_DELAY=10
```

**Use Cases:**
- Slower systems may need longer delays
- Faster systems can reduce delay for quicker recovery
- Network-mounted storage may require additional time

---

### 2. Discord Notifications on Restart

**Environment Variable:** `PLEX_DISCORD_WEBHOOK_URL`  
**Type:** String (URL)

Sends rich Discord notifications when containers are restarted due to media unavailability.

```bash
PLEX_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Notification Content:**
- 🔄 Title: "Plex Media Server Restarted"
- Unavailable libraries list
- Restarted containers list
- Timestamp
- Controlyze branding

**Setting Up Discord Webhook:**
1. Go to Discord Server Settings → Integrations → Webhooks
2. Click "New Webhook"
3. Name it "Plex Monitor"
4. Copy the webhook URL
5. Add to `.env.local`

---

### 3. Custom Library Selection for Monitoring

**Environment Variable:** `PLEX_MONITORED_LIBRARIES`  
**Type:** Comma-separated string

Monitor only specific Plex libraries instead of all libraries. Useful for focusing on critical libraries or excluding problematic ones.

```bash
# Monitor only Movies and TV Shows libraries
PLEX_MONITORED_LIBRARIES=Movies,TV Shows,Anime

# Or use library keys
PLEX_MONITORED_LIBRARIES=1,2,3
```

**Benefits:**
- Reduce API calls for large Plex servers
- Focus monitoring on critical libraries
- Exclude libraries with known issues
- Faster health checks

**Finding Library Names/Keys:**
1. Navigate to Plex web interface
2. Click on a library
3. Check URL: `/library/sections/[KEY]/all`
4. Or use library title as shown in Plex

---

### 4. Webhook Support for External Integrations

**Environment Variable:** `PLEX_WEBHOOK_URL`  
**Type:** String (URL)

Send HTTP POST webhooks to external systems when restarts occur. Perfect for integrating with home automation, monitoring systems, or custom applications.

```bash
PLEX_WEBHOOK_URL=https://your-domain.com/api/plex-events
```

**Webhook Payload:**
```json
{
  "event": "plex_restart",
  "timestamp": "2026-01-23T08:03:00.000Z",
  "unavailableLibraries": ["Movies", "TV Shows"],
  "restartedContainers": ["pd_zurg", "plex"],
  "consecutiveFailures": 3
}
```

**Integration Examples:**
- **Home Assistant:** Trigger automations
- **n8n/Zapier:** Workflow automation
- **Custom APIs:** Log to external systems
- **Slack/Teams:** Alternative notifications
- **PagerDuty:** Incident management

---

### 5. Status Page & Grafana Integration

#### In-House Status Page (Primary)

Plex monitoring is automatically integrated into your Controlyze status page at `/status`:
- Displays "Plex Media Server" as a monitored service
- Shows real-time operational/degraded/down status
- Includes in uptime percentage calculations
- Appears in the uptime history graph
- No additional configuration needed

#### Grafana Dashboard (Optional)

**Metrics Endpoint:** `/api/metrics/plex`  
**Format:** Prometheus text format  
**Dashboard:** `grafana/plex-monitor-dashboard.json`

Export Plex monitoring metrics in Prometheus format for external Grafana visualization.

#### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `plex_monitor_health_status` | Gauge | Current health (1=healthy, 0=unhealthy) |
| `plex_monitor_consecutive_failures` | Gauge | Current consecutive failure count |
| `plex_monitor_libraries_checked` | Gauge | Libraries checked in last run |
| `plex_monitor_libraries_unavailable` | Gauge | Unavailable libraries in last run |
| `plex_monitor_uptime_percent` | Gauge | Uptime % over last 24 hours |
| `plex_monitor_restarts_total` | Counter | Total restarts in last 24 hours |
| `plex_monitor_notifications_sent_total` | Counter | Total notifications sent |
| `plex_monitor_checks_total` | Counter | Total health checks performed |
| `plex_monitor_last_check_timestamp` | Gauge | Unix timestamp of last check |

#### Prometheus Configuration

Add to `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'plex_monitor'
    scrape_interval: 30s
    static_configs:
      - targets: ['controlyze:3000']
    metrics_path: '/api/metrics/plex'
```

#### Grafana Dashboard Setup

1. Import dashboard from `grafana/plex-monitor-dashboard.json`
2. Configure Prometheus data source
3. Dashboard includes:
   - Health status indicator
   - Uptime percentage gauge
   - Consecutive failures counter
   - Restart count
   - Health status timeline
   - Library availability charts
   - Restart event bars
   - Notification delivery stats
   - Webhook success rate
   - Alert trigger count

---

### 6. Alert Rules for Repeated Failures

**Environment Variable:** `PLEX_ENABLE_ALERTS`  
**Type:** Boolean (true/false)  
**Default:** false

Integrate with Controlyze's alert system to trigger alerts when Plex media becomes unavailable.

```bash
PLEX_ENABLE_ALERTS=true
```

**Alert Details:**
- **Type:** `plex_media_unavailable`
- **Severity:** `critical`
- **Message:** Lists affected libraries
- **Details:** Includes unavailable libraries, restarted containers, and failure count

**Alert Integration:**
- Creates alert events in Controlyze
- Can trigger incident creation
- Integrates with existing notification channels
- Supports alert routing and escalation
- Enables alert deduplication

**Use Cases:**
- Track Plex issues in incident management
- Correlate with other system alerts
- Create tickets automatically
- Escalate to on-call teams
- Historical alert analysis

---

## Configuration Summary

### Complete Environment Variables

```bash
# Required
PLEX_URL=http://your-plex-server:32400
PLEX_TOKEN=your-plex-token

# Basic Configuration
PLEX_CONTAINER_NAME=plex
ZURG_CONTAINER_NAME=pd_zurg
PLEX_CHECK_INTERVAL=60
PLEX_MAX_FAILURES=3

# Enhanced Features
PLEX_RESTART_DELAY=5
PLEX_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PLEX_WEBHOOK_URL=https://your-domain.com/api/plex-events
PLEX_MONITORED_LIBRARIES=Movies,TV Shows,Anime
PLEX_ENABLE_ALERTS=true
```

---

## Database Schema Updates

New fields added to `plex_monitor_logs` table:

```sql
ALTER TABLE plex_monitor_logs ADD COLUMN notifications_sent TEXT;
ALTER TABLE plex_monitor_logs ADD COLUMN webhook_delivered INTEGER;
ALTER TABLE plex_monitor_logs ADD COLUMN alert_triggered INTEGER;
```

**Field Descriptions:**
- `notifications_sent`: JSON array of notification channels (e.g., `["discord"]`)
- `webhook_delivered`: Boolean indicating webhook delivery success
- `alert_triggered`: Boolean indicating if alert was triggered

---

## API Updates

### Enhanced Response Format

All monitoring endpoints now return additional fields:

```json
{
  "success": true,
  "data": {
    "timestamp": "2026-01-23T08:03:00.000Z",
    "isHealthy": true,
    "mediaAvailable": true,
    "librariesChecked": 3,
    "unavailableLibraries": [],
    "consecutiveFailures": 0,
    "actionTaken": null,
    "restartedContainers": null,
    "notificationsSent": null,
    "webhookDelivered": null,
    "alertTriggered": null
  }
}
```

---

## UI Enhancements

### Activity Log Badges

The Plex monitoring dashboard now displays additional badges:

- 📢 **Notifications Badge** (Blue): Shows which notification channels were used
- 🔗 **Webhook Badge** (Purple): Indicates webhook was delivered successfully
- 🚨 **Alert Badge** (Orange): Shows alert was triggered in Controlyze

### Visual Indicators

All badges are color-coded for quick identification:
- **Restart**: Outline with refresh icon
- **Failures**: Secondary (gray)
- **Unavailable**: Destructive (red)
- **Notifications**: Blue background
- **Webhook**: Purple background
- **Alert**: Orange background

---

## Testing the Enhancements

### 1. Test Discord Notifications

```bash
# Trigger a manual check that will fail
# (temporarily stop pd_zurg to simulate failure)
docker stop pd_zurg

# Wait for 3 consecutive failures (3 minutes with default settings)
# Check Discord for notification

# Restart container
docker start pd_zurg
```

### 2. Test Webhook Delivery

Set up a webhook receiver (e.g., webhook.site):

```bash
PLEX_WEBHOOK_URL=https://webhook.site/your-unique-url
```

Trigger a restart and verify payload is received.

### 3. Test Custom Library Selection

```bash
# Monitor only specific libraries
PLEX_MONITORED_LIBRARIES=Movies

# Verify in UI that only Movies library is checked
```

### 4. Test Grafana Metrics

```bash
# Access metrics endpoint
curl http://localhost:3000/api/metrics/plex

# Verify Prometheus format output
# Import dashboard to Grafana
# Verify data is displayed
```

### 5. Test Alert Integration

```bash
PLEX_ENABLE_ALERTS=true

# Trigger failure
# Check Controlyze alerts page for new alert
# Verify alert details include Plex information
```

---

## Performance Considerations

### Additional Overhead

- **Discord Notifications**: ~100-200ms per notification
- **Webhooks**: ~50-500ms depending on endpoint
- **Alert Creation**: ~50-100ms
- **Metrics Export**: Negligible (cached data)

**Total Impact:** Minimal, all operations are async and non-blocking.

### Optimization Tips

1. **Custom Library Selection**: Reduces API calls significantly
2. **Restart Delay**: Balance between speed and reliability
3. **Webhook Timeout**: Configure appropriate timeouts
4. **Metrics Scraping**: Use 30-60 second intervals

---

## Troubleshooting

### Discord Notifications Not Sending

1. Verify webhook URL is correct
2. Check Discord webhook is not rate-limited
3. Review logs for error messages
4. Test webhook manually with curl

### Webhooks Failing

1. Ensure endpoint is accessible from Controlyze
2. Verify endpoint accepts POST requests
3. Check for SSL certificate issues
4. Review endpoint logs for errors

### Metrics Not Appearing in Grafana

1. Verify Prometheus is scraping the endpoint
2. Check Prometheus targets page
3. Ensure data source is configured correctly
4. Verify dashboard is using correct data source

### Alerts Not Triggering

1. Ensure `PLEX_ENABLE_ALERTS=true`
2. Verify alert system is configured in Controlyze
3. Check alert API endpoint is accessible
4. Review logs for alert creation errors

### Custom Libraries Not Working

1. Verify library names match exactly (case-sensitive)
2. Try using library keys instead of names
3. Check for extra spaces in comma-separated list
4. Verify libraries exist in Plex

---

## Migration Guide

### From Basic to Enhanced Setup

1. **Backup Database**
   ```bash
   cp data/controlyze.db data/controlyze.db.backup
   ```

2. **Run Database Migration**
   ```bash
   bun run db:generate
   bun run db:push
   ```

3. **Add New Environment Variables**
   - Add desired enhancement variables to `.env.local`
   - Start with one feature at a time

4. **Test Each Feature**
   - Verify each enhancement works independently
   - Check logs for any errors

5. **Monitor Performance**
   - Watch for any performance degradation
   - Adjust settings as needed

---

## Best Practices

### Notification Strategy

- Use Discord for immediate alerts
- Use webhooks for automation
- Enable alerts for incident tracking
- Avoid notification fatigue

### Library Selection

- Monitor critical libraries only
- Exclude test/development libraries
- Use library keys for stability
- Review selection periodically

### Restart Delay

- Start with default (5 seconds)
- Increase if containers fail to start
- Decrease for faster recovery
- Test thoroughly after changes

### Grafana Dashboards

- Set appropriate refresh intervals
- Use alerting rules in Grafana
- Create custom panels as needed
- Share dashboards with team

---

## Future Enhancements

Potential future additions:

- Email notifications
- SMS notifications via Twilio
- Slack integration
- Microsoft Teams integration
- Per-library restart thresholds
- Smart restart scheduling
- Predictive failure detection
- Multi-server support
- Advanced analytics

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs: `docker logs controlyze`
3. Verify configuration in `.env.local`
4. Check GitHub issues
5. Consult main documentation: `docs/PLEX_MONITOR.md`

---

**Implementation Completed:** 2026-01-23 19:03 UTC+11:00  
**All Features:** ✅ Tested and Ready for Production
