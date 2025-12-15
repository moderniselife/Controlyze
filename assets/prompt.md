# Controlyze — Product Build Prompt

Build an open-source, self-hosted web dashboard called **Controlyze** for monitoring a Docker server. The primary use-case is viewing container logs, health/status, resource usage, alerts, and incidents. The system must integrate deeply with a Docker Compose stack named **docker-SchroStack.yml**, but remain fully stack-agnostic and configurable to support any Docker stack.

---

## Core Goals

- Single place to view: containers, logs, health, metrics, events, alerts, and incidents/tickets.
- Designed for self-hosting and low-friction setup.
- Fully configurable via:
  1. Web UI setup wizard
  2. Settings pages
  3. A config file (YAML/TOML/JSON) that can reproduce the full UI state
- Default support for docker-SchroStack.yml, with flexible mappings for any Docker stack.

---

## Pages & Information Architecture

### Setup & Onboarding

**Welcome / Setup Wizard**
- Detect Docker connection (local socket, TCP, SSH)
- Auto-discover compose stacks and services
- Detect docker-SchroStack.yml and apply defaults
- Choose auth mode (local, OAuth, SSO proxy)
- Configure alert destinations (Discord)
- Configure ticketing provider (Linear-style)
- Save config and generate config file

**Connections**
- Docker Engine connection settings
- Support local socket, TCP+TLS, SSH
- Multi-host support (optional / future)
- Connection test + permission validation

---

### Dashboard Core

**Overview**
- Health summary: running/unhealthy/restarting containers
- Recent changes feed (events + alerts)
- Quick actions: restart, view logs, open incident

**Stacks**
- List compose projects
- Stack detail:
  - Services, replicas, health, ports, volumes
  - Stack-specific notes and runbooks
  - SchroStack enhanced view if detected

**Containers**
- Filter by stack, service, label, status
- Container detail:
  - Status, healthcheck output, restarts
  - Image tag & digest
  - CPU, memory, network metrics
  - Actions: start/stop/restart (exec optional)

---

### Observability

**Logs**
- Live tail + historical logs
- Filters: stack, service, container, stdout/stderr
- Regex search and severity heuristics
- Saved log views
- Export and share links

**Metrics**
- Host metrics: CPU, RAM, disk, load
- Container metrics: CPU, memory, network
- Optional Prometheus data source

**Events**
- Docker events timeline
- Correlate events with alerts and incidents

---

### Reliability Workflow

**Alerts**
- Rule-based alerts:
  - Unhealthy containers
  - Restart loops
  - Log pattern matches
  - Resource thresholds
  - Disk space warnings
- Deduplication and cooldowns
- Routing by stack and severity

**Incidents**
- Group alerts, events, and log excerpts
- Incident lifecycle:
  - Open → Investigating → Mitigated → Resolved
- Notes, runbooks, and actions
- One-click ticket creation
- Auto-ticket creation for high severity

**Tickets**
- Linked tickets per incident
- Status sync (open/closed)
- Provider mapping and routing rules

---

### Admin & Configuration

**Settings**
- Global configuration UI
- Import/export config file
- Secrets handling (env vars / secret store)
- Role-based access control

**Integrations**
- Discord (first-class)
- Ticketing:
  - Linear
  - Generic webhook
  - GitHub Issues (optional)
- Future-ready for Slack, Jira, PagerDuty, Email

---

## Integrations

### Discord

- Webhook-based posting
- Optional bot token mode
- Thread per incident
- Buttons: Acknowledge, Create Ticket, Mute
- Message format:
  - Summary, severity, affected services
  - Log excerpts
  - Deep link to incident
- Routing rules per stack and severity

### Ticketing (Linear-style)

- Provider interface abstraction
- Ticket payload:
  - Title, severity, timestamps
  - Affected services/containers
  - Logs and events
  - Link back to Controlyze
- Mapping:
  - Stack/service → team/project
  - Severity → priority
  - Labels/tags via rules

---

## Configuration System

### Config File (e.g. controlyze.yml)

- Docker connections
- Stack detection rules
- Label and naming mappings
- Log retention and indexing
- Alert rules and routing
- Discord configuration
- Ticketing configuration
- Auth and RBAC
- UI import/export parity
- Diff preview before apply

### SchroStack Profile

- Built-in profile named `schrostack`
- Detect docker-SchroStack.yml
- Predefined service mappings
- Default alert rules and dashboards
- Fully editable and overrideable

---

## UX Constraints

- Dark mode first
- Minimal, Vercel-style UI
- Fast global search
- Keyboard-friendly log navigation
- Responsive and low-latency
- Use ShadCN for the UI Library

---

## Safety & Non-Goals

- No plain-text secrets in exports by default
- Log redaction rules for tokens/keys
- Exec into containers disabled by default
- Explicit warnings for destructive actions

---

## Deliverables

- Product specification
- Page-by-page component outline
- Config schema and example config for SchroStack
- Backend API design
- Integration interfaces (Discord + ticketing)
- Minimal database schema (incidents, alerts, saved views)

---

## Optional Extensions

- Alert rule DSL (YAML)
- Example controlyze.yml
- Route map and component list for frontend
- CLI companion for quick status/log access