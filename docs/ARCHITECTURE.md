# Controlyze Architecture

**Last Updated:** 2025-12-15T11:30:00+11:00

## Overview

Controlyze is a self-hosted Docker monitoring dashboard built with Next.js 15, designed for observability, alerting, and incident management.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | TailwindCSS 4 |
| **UI Components** | ShadCN UI |
| **Icons** | Lucide React |
| **Database** | SQLite (better-sqlite3) |
| **ORM** | Drizzle ORM |
| **Docker API** | dockerode |
| **State Management** | Zustand |
| **Configuration** | YAML (yaml package) |
| **Validation** | Zod |

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Dashboard layout group
│   │   ├── overview/       # Overview page
│   │   ├── stacks/         # Stacks management
│   │   ├── containers/     # Container management
│   │   ├── logs/           # Log viewer
│   │   ├── metrics/        # Metrics dashboard
│   │   ├── events/         # Docker events
│   │   ├── alerts/         # Alert rules
│   │   ├── incidents/      # Incident management
│   │   ├── tickets/        # Ticket tracking
│   │   └── settings/       # Configuration
│   ├── (setup)/            # Setup wizard layout
│   │   └── setup/          # Setup wizard pages
│   └── api/                # API routes
│       ├── docker/         # Docker API endpoints
│       ├── alerts/         # Alert management
│       ├── incidents/      # Incident management
│       ├── config/         # Configuration API
│       └── integrations/   # Discord, ticketing
├── components/
│   ├── ui/                 # ShadCN components
│   ├── dashboard/          # Dashboard components
│   ├── logs/               # Log viewer components
│   ├── containers/         # Container components
│   └── shared/             # Shared components
├── lib/
│   ├── db/                 # Database setup & schema
│   ├── docker/             # Docker API wrapper
│   ├── config/             # Configuration management
│   ├── integrations/       # Integration providers
│   └── utils.ts            # Utility functions
├── hooks/                  # React hooks
├── types/                  # TypeScript types
└── stores/                 # Zustand stores
```

## Database Schema

### Core Tables

- **containers** - Cached container state
- **stacks** - Compose stack metadata
- **alerts** - Alert rules and state
- **incidents** - Incident lifecycle tracking
- **tickets** - External ticket references
- **events** - Docker event log
- **saved_views** - User-saved log views
- **settings** - Application settings

## API Design

### Docker Endpoints
- `GET /api/docker/containers` - List containers
- `GET /api/docker/containers/[id]` - Container details
- `POST /api/docker/containers/[id]/start` - Start container
- `POST /api/docker/containers/[id]/stop` - Stop container
- `POST /api/docker/containers/[id]/restart` - Restart container
- `GET /api/docker/containers/[id]/logs` - Container logs
- `GET /api/docker/containers/[id]/stats` - Container stats
- `GET /api/docker/stacks` - List compose stacks
- `GET /api/docker/events` - Docker events stream

### Alert Endpoints
- `GET /api/alerts` - List alert rules
- `POST /api/alerts` - Create alert rule
- `PUT /api/alerts/[id]` - Update alert rule
- `DELETE /api/alerts/[id]` - Delete alert rule

### Incident Endpoints
- `GET /api/incidents` - List incidents
- `POST /api/incidents` - Create incident
- `PUT /api/incidents/[id]` - Update incident
- `POST /api/incidents/[id]/ticket` - Create ticket

### Config Endpoints
- `GET /api/config` - Get current config
- `POST /api/config` - Update config
- `GET /api/config/export` - Export config file
- `POST /api/config/import` - Import config file

## Integration Architecture

### Discord Integration
- Webhook-based for simplicity
- Optional bot token for threading
- Incident-per-thread pattern
- Interactive buttons (Acknowledge, Create Ticket, Mute)

### Ticketing Integration
- Provider abstraction layer
- Initial providers: Linear, GitHub Issues, Generic Webhook
- Bidirectional status sync

## Configuration System

Configuration stored in `controlyze.yml`:
- Docker connection settings
- Stack detection rules
- Alert rules and routing
- Integration credentials (env var references)
- UI preferences

## Security Considerations

- Secrets referenced via environment variables
- Log redaction for tokens/keys
- Container exec disabled by default
- RBAC for multi-user setups
- Explicit warnings for destructive actions
