CREATE TABLE `alert_events` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text NOT NULL,
	`container_id` text,
	`stack_name` text,
	`service_name` text,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`details` text,
	`acknowledged` integer DEFAULT false,
	`acknowledged_by` text,
	`acknowledged_at` integer,
	`incident_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT true,
	`condition_type` text NOT NULL,
	`condition_config` text NOT NULL,
	`severity` text DEFAULT 'warning' NOT NULL,
	`routing` text,
	`cooldown_minutes` integer DEFAULT 5,
	`dedup_enabled` integer DEFAULT true,
	`last_triggered_at` integer,
	`trigger_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `container_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`container_id` text NOT NULL,
	`cpu_percent` real,
	`memory_usage` integer,
	`memory_limit` integer,
	`memory_percent` real,
	`network_rx_bytes` integer,
	`network_tx_bytes` integer,
	`block_read_bytes` integer,
	`block_write_bytes` integer,
	`pids` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `containers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`image` text NOT NULL,
	`image_id` text,
	`status` text NOT NULL,
	`state` text NOT NULL,
	`health_status` text,
	`health_output` text,
	`restart_count` integer DEFAULT 0,
	`stack_name` text,
	`service_name` text,
	`labels` text,
	`ports` text,
	`mounts` text,
	`network_mode` text,
	`created_at` integer,
	`started_at` integer,
	`last_seen` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `docker_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`action` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text,
	`actor_attributes` text,
	`time_nano` integer,
	`correlated_alert_id` text,
	`correlated_incident_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `host_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`cpu_percent` real,
	`memory_used` integer,
	`memory_total` integer,
	`memory_percent` real,
	`disk_used` integer,
	`disk_total` integer,
	`disk_percent` real,
	`load_avg_1` real,
	`load_avg_5` real,
	`load_avg_15` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incident_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`is_public` integer DEFAULT true,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`severity` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`affected_containers` text,
	`affected_stacks` text,
	`affected_services` text,
	`notes` text,
	`runbook` text,
	`log_excerpts` text,
	`discord_thread_id` text,
	`is_public` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`mitigated_at` integer,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE TABLE `plex_monitor_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`is_healthy` integer NOT NULL,
	`media_available` integer NOT NULL,
	`error` text,
	`libraries_checked` integer NOT NULL,
	`unavailable_libraries` text,
	`consecutive_failures` integer NOT NULL,
	`action_taken` text,
	`restarted_containers` text,
	`notifications_sent` text,
	`webhook_delivered` integer,
	`alert_triggered` integer
);
--> statement-breakpoint
CREATE TABLE `saved_views` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`view_type` text DEFAULT 'logs' NOT NULL,
	`filters` text NOT NULL,
	`columns` text,
	`sort_by` text,
	`is_default` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stacks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`compose_file` text,
	`working_dir` text,
	`profile` text,
	`service_count` integer DEFAULT 0,
	`running_count` integer DEFAULT 0,
	`notes` text,
	`runbook` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stacks_name_unique` ON `stacks` (`name`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`external_url` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text,
	`sync_enabled` integer DEFAULT true,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `uptime_records` (
	`id` text PRIMARY KEY NOT NULL,
	`service_name` text NOT NULL,
	`status` text NOT NULL,
	`checked_at` integer NOT NULL
);
