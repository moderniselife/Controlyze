# Controlyze Configuration Schema

**Last Updated:** 2025-12-15T11:30:00+11:00

## Example Configuration

```yaml
# controlyze.yml
version: "1"

# Docker connection settings
docker:
  connection:
    type: socket  # socket | tcp | ssh
    socket_path: /var/run/docker.sock
    # tcp_host: "tcp://192.168.1.100:2375"
    # tls:
    #   enabled: true
    #   ca: /path/to/ca.pem
    #   cert: /path/to/cert.pem
    #   key: /path/to/key.pem

# Stack detection and profiles
stacks:
  detection:
    enabled: true
    paths:
      - /home/*/docker-*.yml
      - /opt/stacks/**/docker-compose.yml
  
  profiles:
    schrostack:
      enabled: true
      compose_file: docker-SchroStack.yml
      services:
        media:
          - plex
          - tunarr
          - overseerr
          - tautulli
        indexers:
          - prowlarr
          - flaresolverr*
        automation:
          - schrodrive
          - watchtower
          - pd_zurg
        infrastructure:
          - cloudflare-tunnel
          - flaresolverr-lb

# Alert rules
alerts:
  rules:
    - name: container_unhealthy
      enabled: true
      condition:
        type: health_status
        status: unhealthy
        duration: 30s
      severity: warning
      routing:
        discord: true
        
    - name: restart_loop
      enabled: true
      condition:
        type: restart_count
        threshold: 3
        window: 5m
      severity: critical
      routing:
        discord: true
        auto_ticket: true
        
    - name: high_memory
      enabled: true
      condition:
        type: resource_threshold
        metric: memory_percent
        threshold: 90
        duration: 2m
      severity: warning
      
    - name: log_error
      enabled: true
      condition:
        type: log_pattern
        pattern: "(?i)(error|exception|fatal)"
        exclude_pattern: "(?i)(expected|handled)"
      severity: info
      dedup_window: 5m

  defaults:
    cooldown: 5m
    dedup_enabled: true

# Discord integration
discord:
  enabled: true
  webhook_url: ${DISCORD_WEBHOOK_URL}
  # bot_token: ${DISCORD_BOT_TOKEN}  # Optional for threading
  
  routing:
    default_channel: alerts
    severity_channels:
      critical: critical-alerts
      warning: alerts
      info: logs
      
  format:
    include_logs: true
    log_lines: 10
    include_metrics: true

# Ticketing integration
ticketing:
  provider: linear  # linear | github | webhook
  
  linear:
    api_key: ${LINEAR_API_KEY}
    team_id: ${LINEAR_TEAM_ID}
    
  mapping:
    severity_to_priority:
      critical: urgent
      high: high
      medium: medium
      low: low
    stack_to_project:
      schrostack: "Media Infrastructure"

# Log settings
logs:
  retention_days: 7
  index_enabled: true
  redaction:
    enabled: true
    patterns:
      - "(?i)(api[_-]?key|token|secret|password)\\s*[=:]\\s*\\S+"
      - "Bearer\\s+[A-Za-z0-9\\-_.]+"

# UI settings
ui:
  theme: dark
  default_view: overview
  refresh_interval: 5s

# Auth settings (optional)
auth:
  enabled: false
  # provider: local  # local | oauth | proxy
  # local:
  #   users:
  #     - username: admin
  #       password_hash: ${ADMIN_PASSWORD_HASH}
```

## Schema Definition (Zod)

See `src/lib/config/schema.ts` for the full Zod schema definition.

## Environment Variables

The following environment variables can be referenced in the config:

| Variable | Description |
|----------|-------------|
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for alerts |
| `DISCORD_BOT_TOKEN` | Optional Discord bot token |
| `LINEAR_API_KEY` | Linear API key for ticketing |
| `LINEAR_TEAM_ID` | Linear team ID |
| `ADMIN_PASSWORD_HASH` | Admin password hash for local auth |

## SchroStack Profile

The built-in `schrostack` profile provides:
- Automatic detection of `docker-SchroStack.yml`
- Service grouping (media, indexers, automation, infrastructure)
- Predefined alert rules for media services
- Dashboard layouts optimized for media stacks
