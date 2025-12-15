import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = process.env.DATABASE_PATH || "./data/controlyze.db";

const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS containers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    image_id TEXT,
    status TEXT NOT NULL,
    state TEXT NOT NULL,
    health_status TEXT,
    health_output TEXT,
    restart_count INTEGER DEFAULT 0,
    stack_name TEXT,
    service_name TEXT,
    labels TEXT,
    ports TEXT,
    mounts TEXT,
    network_mode TEXT,
    created_at INTEGER,
    started_at INTEGER,
    last_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stacks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    compose_file TEXT,
    working_dir TEXT,
    profile TEXT,
    service_count INTEGER DEFAULT 0,
    running_count INTEGER DEFAULT 0,
    unhealthy_count INTEGER DEFAULT 0,
    notes TEXT,
    runbook TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    condition_type TEXT NOT NULL,
    condition_config TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    routing TEXT,
    cooldown_minutes INTEGER DEFAULT 5,
    dedup_enabled INTEGER DEFAULT 1,
    last_triggered_at INTEGER,
    trigger_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    affected_containers TEXT,
    affected_stacks TEXT,
    notes TEXT,
    runbook TEXT,
    log_excerpts TEXT,
    discord_thread_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    mitigated_at INTEGER,
    resolved_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    incident_id TEXT,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,
    external_url TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT,
    sync_enabled INTEGER DEFAULT 1,
    last_synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS docker_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT,
    actor_attributes TEXT,
    time_nano INTEGER,
    correlated_alert_id TEXT,
    correlated_incident_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS container_metrics (
    id TEXT PRIMARY KEY,
    container_id TEXT NOT NULL,
    cpu_percent REAL,
    memory_usage INTEGER,
    memory_limit INTEGER,
    memory_percent REAL,
    network_rx_bytes INTEGER,
    network_tx_bytes INTEGER,
    block_read_bytes INTEGER,
    block_write_bytes INTEGER,
    pids INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alert_events (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    container_id TEXT,
    stack_name TEXT,
    service_name TEXT,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_by TEXT,
    acknowledged_at INTEGER,
    incident_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS uptime_records (
    id TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL,
    checked_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_uptime_service_time ON uptime_records(service_name, checked_at);

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

export const db = drizzle(sqlite, { schema });

export { schema };
