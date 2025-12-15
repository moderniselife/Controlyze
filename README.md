# Controlyze

**Self-hosted Docker monitoring dashboard** for viewing container logs, health/status, resource usage, alerts, and incidents.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## Features

- **Container Monitoring** - Real-time container status, health checks, and restart tracking
- **Log Viewer** - Live tail and historical logs with regex search and severity highlighting
- **Metrics Dashboard** - CPU, memory, network, and I/O metrics per container
- **Event Timeline** - Docker events with correlation to alerts and incidents
- **Alert Rules** - Configurable alerts for unhealthy containers, restart loops, resource thresholds
- **Incident Management** - Group alerts, track lifecycle (Open → Investigating → Resolved)
- **Ticket Integration** - Linear, GitHub Issues, and webhook support
- **Discord Notifications** - Webhook-based alerts with embed formatting
- **Stack Detection** - Auto-detect Docker Compose projects
- **SchroStack Profile** - Built-in support for media server stacks

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **UI Components**: ShadCN UI
- **Database**: SQLite (Drizzle ORM)
- **Docker API**: dockerode
- **Configuration**: YAML

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Docker running locally or accessible via TCP/SSH

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/controlyze.git
cd controlyze

# Install dependencies
bun install

# Generate database
bun run db:generate
bun run db:push

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## Configuration

Controlyze can be configured via the web UI or a YAML config file at `./data/controlyze.yml`.

### Example Configuration

```yaml
version: "1"

docker:
  connection:
    type: socket
    socketPath: /var/run/docker.sock

stacks:
  detection:
    enabled: true
  profiles:
    schrostack:
      enabled: true

alerts:
  rules:
    - name: container_unhealthy
      enabled: true
      condition:
        type: health_status
        status: unhealthy
      severity: warning
      routing:
        discord: true

discord:
  enabled: true
  webhookUrl: ${DISCORD_WEBHOOK_URL}

ticketing:
  provider: linear
  linear:
    apiKey: ${LINEAR_API_KEY}
    teamId: ${LINEAR_TEAM_ID}

ui:
  theme: dark
  refreshInterval: 5s
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_PATH` | SQLite database path (default: `./data/controlyze.db`) |
| `CONFIG_PATH` | Configuration file path (default: `./data/controlyze.yml`) |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for alerts |
| `LINEAR_API_KEY` | Linear API key for ticketing |
| `LINEAR_TEAM_ID` | Linear team ID |

## Pages

| Page | Description |
|------|-------------|
| `/` | Overview dashboard with health summary |
| `/stacks` | Docker Compose stacks |
| `/containers` | Container list with actions |
| `/logs` | Live log viewer |
| `/metrics` | Resource usage metrics |
| `/events` | Docker event timeline |
| `/alerts` | Alert rules configuration |
| `/incidents` | Incident management |
| `/tickets` | Ticket tracking |
| `/integrations` | Discord & ticketing setup |
| `/connections` | Docker connection settings |
| `/settings` | Application settings |

## API Endpoints

### Docker
- `GET /api/docker/containers` - List containers
- `GET /api/docker/containers/[id]` - Container details
- `GET /api/docker/containers/[id]/logs` - Container logs
- `GET /api/docker/containers/[id]/stats` - Container stats
- `POST /api/docker/containers/[id]/start` - Start container
- `POST /api/docker/containers/[id]/stop` - Stop container
- `POST /api/docker/containers/[id]/restart` - Restart container
- `GET /api/docker/stacks` - List stacks
- `GET /api/docker/events` - Docker events
- `POST /api/docker/connection/test` - Test Docker connection

### SchroStack
- `GET /api/schrostack/detect` - Detect SchroStack profile

## SchroStack Profile

Controlyze has built-in support for media server stacks like SchroStack. When detected, it provides:

- **Service grouping**: Media, Indexers, Automation, Infrastructure
- **Predefined alerts**: Plex health, indexer issues, Zurg mount failures
- **Quick actions**: Restart Plex, check indexers, view media logs

## Development

```bash
# Run development server
bun run dev

# Run linting
bun run lint

# Generate database migrations
bun run db:generate

# Push database changes
bun run db:push
```

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── api/                # API routes
│   ├── containers/         # Container management
│   ├── logs/               # Log viewer
│   ├── alerts/             # Alert rules
│   └── ...
├── components/
│   ├── ui/                 # ShadCN components
│   └── dashboard/          # Dashboard components
├── lib/
│   ├── db/                 # Database schema
│   ├── docker/             # Docker API
│   ├── config/             # Configuration
│   ├── integrations/       # Discord, ticketing
│   └── schrostack/         # SchroStack profile
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Acknowledgments

- [ShadCN UI](https://ui.shadcn.com/) for the beautiful components
- [dockerode](https://github.com/apocas/dockerode) for Docker API access
- [Drizzle ORM](https://orm.drizzle.team/) for database management
