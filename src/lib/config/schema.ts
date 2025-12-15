import { z } from "zod";

export const dockerConnectionSchema = z.object({
  type: z.enum(["socket", "tcp", "ssh"]).default("socket"),
  socketPath: z.string().optional().default("/var/run/docker.sock"),
  host: z.string().optional(),
  port: z.number().optional(),
  tls: z
    .object({
      enabled: z.boolean().default(false),
      ca: z.string().optional(),
      cert: z.string().optional(),
      key: z.string().optional(),
    })
    .optional(),
});

export const stackProfileSchema = z.object({
  enabled: z.boolean().default(true),
  composeFile: z.string().optional(),
  services: z.record(z.string(), z.array(z.string())).optional(),
});

export const stacksConfigSchema = z.object({
  detection: z
    .object({
      enabled: z.boolean().default(true),
      paths: z.array(z.string()).optional(),
    })
    .optional(),
  profiles: z.record(z.string(), stackProfileSchema).optional(),
});

export const alertConditionSchema = z.object({
  type: z.enum([
    "health_status",
    "restart_count",
    "resource_threshold",
    "log_pattern",
  ]),
  status: z.string().optional(),
  duration: z.string().optional(),
  threshold: z.number().optional(),
  window: z.string().optional(),
  metric: z.string().optional(),
  pattern: z.string().optional(),
  excludePattern: z.string().optional(),
});

export const alertRoutingSchema = z.object({
  discord: z.boolean().optional(),
  autoTicket: z.boolean().optional(),
});

export const alertRuleSchema = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  condition: alertConditionSchema,
  severity: z.enum(["info", "warning", "critical"]).default("warning"),
  routing: alertRoutingSchema.optional(),
  dedupWindow: z.string().optional(),
});

export const alertsConfigSchema = z.object({
  rules: z.array(alertRuleSchema).optional(),
  defaults: z
    .object({
      cooldown: z.string().optional().default("5m"),
      dedupEnabled: z.boolean().optional().default(true),
    })
    .optional(),
});

export const discordConfigSchema = z.object({
  enabled: z.boolean().default(false),
  webhookUrl: z.string().optional(),
  botToken: z.string().optional(),
  routing: z
    .object({
      defaultChannel: z.string().optional(),
      severityChannels: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  format: z
    .object({
      includeLogs: z.boolean().optional().default(true),
      logLines: z.number().optional().default(10),
      includeMetrics: z.boolean().optional().default(true),
    })
    .optional(),
});

export const ticketingConfigSchema = z.object({
  provider: z.enum(["linear", "github", "webhook"]).optional(),
  linear: z
    .object({
      apiKey: z.string().optional(),
      teamId: z.string().optional(),
    })
    .optional(),
  github: z
    .object({
      token: z.string().optional(),
      owner: z.string().optional(),
      repo: z.string().optional(),
    })
    .optional(),
  webhook: z
    .object({
      url: z.string().optional(),
      headers: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  mapping: z
    .object({
      severityToPriority: z.record(z.string(), z.string()).optional(),
      stackToProject: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export const logsConfigSchema = z.object({
  retentionDays: z.number().optional().default(7),
  indexEnabled: z.boolean().optional().default(true),
  redaction: z
    .object({
      enabled: z.boolean().optional().default(true),
      patterns: z.array(z.string()).optional(),
    })
    .optional(),
});

export const uiConfigSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional().default("dark"),
  defaultView: z.string().optional().default("overview"),
  refreshInterval: z.string().optional().default("5s"),
});

export const authConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(["local", "oauth", "proxy"]).optional(),
});

export const controlyzeConfigSchema = z.object({
  version: z.string().default("1"),
  docker: z
    .object({
      connection: dockerConnectionSchema.optional(),
    })
    .optional(),
  stacks: stacksConfigSchema.optional(),
  alerts: alertsConfigSchema.optional(),
  discord: discordConfigSchema.optional(),
  ticketing: ticketingConfigSchema.optional(),
  logs: logsConfigSchema.optional(),
  ui: uiConfigSchema.optional(),
  auth: authConfigSchema.optional(),
});

export type ControlyzeConfig = z.infer<typeof controlyzeConfigSchema>;
export type DockerConnection = z.infer<typeof dockerConnectionSchema>;
export type AlertRule = z.infer<typeof alertRuleSchema>;
export type DiscordConfig = z.infer<typeof discordConfigSchema>;
export type TicketingConfig = z.infer<typeof ticketingConfigSchema>;
