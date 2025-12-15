import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const containers = sqliteTable("containers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  imageId: text("image_id"),
  status: text("status").notNull(),
  state: text("state").notNull(),
  healthStatus: text("health_status"),
  healthOutput: text("health_output"),
  restartCount: integer("restart_count").default(0),
  stackName: text("stack_name"),
  serviceName: text("service_name"),
  labels: text("labels"),
  ports: text("ports"),
  mounts: text("mounts"),
  networkMode: text("network_mode"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  startedAt: integer("started_at", { mode: "timestamp" }),
  lastSeen: integer("last_seen", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const stacks = sqliteTable("stacks", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  composeFile: text("compose_file"),
  workingDir: text("working_dir"),
  profile: text("profile"),
  serviceCount: integer("service_count").default(0),
  runningCount: integer("running_count").default(0),
  notes: text("notes"),
  runbook: text("runbook"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  conditionType: text("condition_type").notNull(),
  conditionConfig: text("condition_config").notNull(),
  severity: text("severity").notNull().default("warning"),
  routing: text("routing"),
  cooldownMinutes: integer("cooldown_minutes").default(5),
  dedupEnabled: integer("dedup_enabled", { mode: "boolean" }).default(true),
  lastTriggeredAt: integer("last_triggered_at", { mode: "timestamp" }),
  triggerCount: integer("trigger_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const alertEvents = sqliteTable("alert_events", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull().references(() => alerts.id),
  containerId: text("container_id"),
  stackName: text("stack_name"),
  serviceName: text("service_name"),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  details: text("details"),
  acknowledged: integer("acknowledged", { mode: "boolean" }).default(false),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }),
  incidentId: text("incident_id").references(() => incidents.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  affectedContainers: text("affected_containers"),
  affectedStacks: text("affected_stacks"),
  affectedServices: text("affected_services"), // For status page display
  notes: text("notes"),
  runbook: text("runbook"),
  logExcerpts: text("log_excerpts"),
  discordThreadId: text("discord_thread_id"),
  isPublic: integer("is_public", { mode: "boolean" }).default(true), // Show on status page
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  mitigatedAt: integer("mitigated_at", { mode: "timestamp" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
});

export const incidentUpdates = sqliteTable("incident_updates", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().references(() => incidents.id),
  status: text("status").notNull(), // investigating, identified, monitoring, resolved
  message: text("message").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).default(true),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().references(() => incidents.id),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  externalUrl: text("external_url"),
  title: text("title").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority"),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).default(true),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const dockerEvents = sqliteTable("docker_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  action: text("action").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name"),
  actorAttributes: text("actor_attributes"),
  timeNano: integer("time_nano"),
  correlatedAlertId: text("correlated_alert_id"),
  correlatedIncidentId: text("correlated_incident_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const savedViews = sqliteTable("saved_views", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  viewType: text("view_type").notNull().default("logs"),
  filters: text("filters").notNull(),
  columns: text("columns"),
  sortBy: text("sort_by"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  category: text("category").notNull().default("general"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const containerMetrics = sqliteTable("container_metrics", {
  id: text("id").primaryKey(),
  containerId: text("container_id").notNull(),
  cpuPercent: real("cpu_percent"),
  memoryUsage: integer("memory_usage"),
  memoryLimit: integer("memory_limit"),
  memoryPercent: real("memory_percent"),
  networkRxBytes: integer("network_rx_bytes"),
  networkTxBytes: integer("network_tx_bytes"),
  blockReadBytes: integer("block_read_bytes"),
  blockWriteBytes: integer("block_write_bytes"),
  pids: integer("pids"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const hostMetrics = sqliteTable("host_metrics", {
  id: text("id").primaryKey(),
  cpuPercent: real("cpu_percent"),
  memoryUsed: integer("memory_used"),
  memoryTotal: integer("memory_total"),
  memoryPercent: real("memory_percent"),
  diskUsed: integer("disk_used"),
  diskTotal: integer("disk_total"),
  diskPercent: real("disk_percent"),
  loadAvg1: real("load_avg_1"),
  loadAvg5: real("load_avg_5"),
  loadAvg15: real("load_avg_15"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Container = typeof containers.$inferSelect;
export type NewContainer = typeof containers.$inferInsert;
export type Stack = typeof stacks.$inferSelect;
export type NewStack = typeof stacks.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type AlertEvent = typeof alertEvents.$inferSelect;
export type NewAlertEvent = typeof alertEvents.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type IncidentUpdate = typeof incidentUpdates.$inferSelect;
export type NewIncidentUpdate = typeof incidentUpdates.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type DockerEvent = typeof dockerEvents.$inferSelect;
export type NewDockerEvent = typeof dockerEvents.$inferInsert;
export type SavedView = typeof savedViews.$inferSelect;
export type NewSavedView = typeof savedViews.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type ContainerMetric = typeof containerMetrics.$inferSelect;
export type NewContainerMetric = typeof containerMetrics.$inferInsert;
export type HostMetric = typeof hostMetrics.$inferSelect;
export type NewHostMetric = typeof hostMetrics.$inferInsert;

export const uptimeRecords = sqliteTable("uptime_records", {
  id: text("id").primaryKey(),
  serviceName: text("service_name").notNull(),
  status: text("status").notNull(), // operational, degraded, down
  checkedAt: integer("checked_at", { mode: "timestamp" }).notNull(),
});

export type UptimeRecord = typeof uptimeRecords.$inferSelect;
export type NewUptimeRecord = typeof uptimeRecords.$inferInsert;

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
