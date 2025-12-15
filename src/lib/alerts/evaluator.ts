import { listContainers, getContainerStats, getContainerLogs } from "@/lib/docker/containers";
import { loadRawConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { alerts, incidents, alertEvents, tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditionType: string;
  conditionConfig: Record<string, any>;
  severity: string;
  routing: Record<string, any> | null;
  cooldownMinutes: number;
  dedupEnabled: boolean;
  dedupWindowMinutes: number;
  lastTriggeredAt: Date | null;
  source?: string;
}

interface Container {
  id: string;
  name: string;
  state: string;
  healthStatus?: string;
  restartCount?: number;
  cpuPercent?: number;
  memoryPercent?: number;
}

interface IncidentContext {
  triggerType: string;
  triggerValue?: string | number;
  threshold?: string | number;
  logs?: string;
  metrics?: {
    cpu?: number;
    memory?: number;
    memoryUsed?: number;
    memoryLimit?: number;
  };
  containerState?: string;
  healthStatus?: string;
  restartCount?: number;
  timestamp: string;
}

interface EvaluationResult {
  alertId: string;
  alertName: string;
  triggered: boolean;
  containerId?: string;
  containerName?: string;
  message: string;
  severity: string;
  context?: IncidentContext;
}

// Cooldown cache: alertId -> timestamp
const cooldownCache = new Map<string, number>();

// Dedup cache: alertId:containerId -> timestamp (for per-alert dedup windows)
const dedupCache = new Map<string, number>();

// Duration tracking: alertId:containerId -> first triggered timestamp
const durationCache = new Map<string, number>();

// Restart tracking: containerId -> { count, windowStart }
const restartWindowCache = new Map<string, { count: number; windowStart: number }>();

// Parse duration string like "30s", "2m", "1h" to milliseconds
function parseDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)(s|m|h)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    default: return 0;
  }
}

// Check if container name matches filter (supports wildcards like "flaresolverr*")
function matchesContainerFilter(containerName: string, filter: string | undefined): boolean {
  if (!filter) return true; // No filter = match all
  const lowerName = containerName.toLowerCase();
  const lowerFilter = filter.toLowerCase();
  
  if (lowerFilter.endsWith("*")) {
    // Wildcard match
    const prefix = lowerFilter.slice(0, -1);
    return lowerName.startsWith(prefix) || lowerName.includes(prefix);
  }
  
  // Exact match (case insensitive)
  return lowerName === lowerFilter || lowerName.includes(lowerFilter);
}

async function sendDiscordNotification(
  webhookUrl: string,
  alert: AlertRule,
  container: Container,
  message: string
) {
  const colors: Record<string, number> = {
    info: 0x3498db,
    warning: 0xf39c12,
    critical: 0xe74c3c,
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: `🚨 Alert: ${alert.name}`,
            description: message,
            color: colors[alert.severity] || colors.warning,
            fields: [
              { name: "Container", value: container.name, inline: true },
              { name: "Severity", value: alert.severity.toUpperCase(), inline: true },
              { name: "Status", value: container.state, inline: true },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "Controlyze Alerts" },
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

async function createLinearTicket(
  apiKey: string,
  teamId: string,
  title: string,
  description: string
): Promise<string | null> {
  try {
    const query = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    `;

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query,
        variables: {
          input: { teamId, title, description, priority: 2 },
        },
      }),
    });

    const data = await response.json();
    if (data.data?.issueCreate?.success) {
      return data.data.issueCreate.issue.id;
    }
  } catch (error) {
    console.error("Failed to create Linear ticket:", error);
  }
  return null;
}

async function evaluateCondition(
  conditionType: string,
  conditionConfig: Record<string, any>,
  container: Container,
  alertId: string
): Promise<{ triggered: boolean; message: string; context?: IncidentContext }> {
  const durationKey = `${alertId}:${container.id}`;
  const requiredDurationMs = parseDuration(conditionConfig.duration);
  
  switch (conditionType) {
    case "health_status": {
      const targetStatus = conditionConfig.status || "unhealthy";
      if (container.healthStatus === targetStatus) {
        // Check duration requirement
        if (requiredDurationMs > 0) {
          const firstTriggered = durationCache.get(durationKey);
          if (!firstTriggered) {
            durationCache.set(durationKey, Date.now());
            return { triggered: false, message: "" }; // Not triggered yet, waiting for duration
          }
          if (Date.now() - firstTriggered < requiredDurationMs) {
            return { triggered: false, message: "" }; // Duration not met yet
          }
        }
        durationCache.delete(durationKey); // Clear duration tracking
        return {
          triggered: true,
          message: `Container ${container.name} is ${targetStatus}`,
          context: {
            triggerType: "health_status",
            triggerValue: targetStatus,
            containerState: container.state,
            healthStatus: container.healthStatus,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        durationCache.delete(durationKey); // Condition cleared, reset duration
      }
      break;
    }
    
    case "restart_count": {
      const threshold = conditionConfig.threshold || 3;
      const windowMs = parseDuration(conditionConfig.window) || 5 * 60 * 1000; // Default 5m
      
      // Track restarts within window
      const restartData = restartWindowCache.get(container.id);
      const currentRestarts = container.restartCount || 0;
      
      if (!restartData) {
        restartWindowCache.set(container.id, { count: currentRestarts, windowStart: Date.now() });
        return { triggered: false, message: "" };
      }
      
      // Check if window expired
      if (Date.now() - restartData.windowStart > windowMs) {
        restartWindowCache.set(container.id, { count: currentRestarts, windowStart: Date.now() });
        return { triggered: false, message: "" };
      }
      
      // Calculate restarts within window
      const restartsInWindow = currentRestarts - restartData.count;
      if (restartsInWindow >= threshold) {
        restartWindowCache.set(container.id, { count: currentRestarts, windowStart: Date.now() });
        return {
          triggered: true,
          message: `Container ${container.name} has restarted ${restartsInWindow} times in the last ${conditionConfig.window || "5m"} (threshold: ${threshold})`,
          context: {
            triggerType: "restart_count",
            triggerValue: restartsInWindow,
            threshold,
            containerState: container.state,
            restartCount: currentRestarts,
            timestamp: new Date().toISOString(),
          },
        };
      }
      break;
    }
    
    case "container_stopped":
    case "container_status": {
      // container_status is a synonym for container_stopped
      const targetStatus = conditionConfig.status || "exited";
      const isNotRunning = container.state !== "running";
      const matchesStatus = targetStatus === "exited" ? isNotRunning : container.state === targetStatus;
      
      if (matchesStatus) {
        return {
          triggered: true,
          message: `Container ${container.name} is not running (state: ${container.state})`,
          context: {
            triggerType: "container_status",
            triggerValue: container.state,
            containerState: container.state,
            healthStatus: container.healthStatus,
            timestamp: new Date().toISOString(),
          },
        };
      }
      break;
    }
    
    case "resource_threshold": {
      const metric = conditionConfig.metric; // "cpu_percent" or "memory_percent"
      const threshold = conditionConfig.threshold || 90;
      
      let currentValue = 0;
      if (metric === "cpu_percent") {
        currentValue = container.cpuPercent || 0;
      } else if (metric === "memory_percent") {
        currentValue = container.memoryPercent || 0;
      }
      
      if (currentValue >= threshold) {
        // Check duration requirement
        if (requiredDurationMs > 0) {
          const firstTriggered = durationCache.get(durationKey);
          if (!firstTriggered) {
            durationCache.set(durationKey, Date.now());
            return { triggered: false, message: "" };
          }
          if (Date.now() - firstTriggered < requiredDurationMs) {
            return { triggered: false, message: "" };
          }
        }
        durationCache.delete(durationKey);
        
        // Get full stats for context
        let stats: any = {};
        try {
          stats = await getContainerStats(container.id);
        } catch (e) { /* ignore */ }
        
        return {
          triggered: true,
          message: `Container ${container.name} ${metric.replace("_", " ")} at ${currentValue.toFixed(1)}% (threshold: ${threshold}%)`,
          context: {
            triggerType: "resource_threshold",
            triggerValue: currentValue,
            threshold,
            metrics: {
              cpu: stats.cpuPercent || container.cpuPercent,
              memory: stats.memoryPercent || container.memoryPercent,
              memoryUsed: stats.memoryUsage,
              memoryLimit: stats.memoryLimit,
            },
            containerState: container.state,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        durationCache.delete(durationKey);
      }
      break;
    }
    
    case "log_pattern": {
      let pattern = conditionConfig.pattern;
      let excludePattern = conditionConfig.excludePattern;
      
      if (!pattern) {
        return { triggered: false, message: "" };
      }
      
      // Strip (?i) inline flag - JS doesn't support it, we add 'i' flag instead
      const hasInlineIgnoreCase = pattern.includes("(?i)");
      pattern = pattern.replace(/\(\?i\)/g, "");
      if (excludePattern) {
        excludePattern = excludePattern.replace(/\(\?i\)/g, "");
      }
      
      try {
        // Get recent logs (last 100 lines, last 5 minutes)
        const logs = await getContainerLogs(container.id, { tail: 100, since: Math.floor(Date.now() / 1000) - 300 });
        
        // Always use case-insensitive matching for log patterns
        const flags = hasInlineIgnoreCase ? "gmi" : "gmi";
        const regex = new RegExp(pattern, flags);
        const excludeRegex = excludePattern ? new RegExp(excludePattern, flags) : null;
        
        const matches = logs.match(regex);
        if (matches && matches.length > 0) {
          // Check exclude pattern
          let finalMatches: string[] = [...matches];
          if (excludeRegex) {
            finalMatches = finalMatches.filter(m => !excludeRegex.test(m));
            if (finalMatches.length === 0) {
              return { triggered: false, message: "" };
            }
          }
          
          // Extract log lines around matches for context (first 10 matches, with surrounding context)
          const logLines = logs.split("\n");
          const matchedLines: string[] = [];
          for (const match of finalMatches.slice(0, 10)) {
            const lineIndex = logLines.findIndex(l => l.includes(match));
            if (lineIndex >= 0) {
              // Get 1 line before and after for context
              const start = Math.max(0, lineIndex - 1);
              const end = Math.min(logLines.length, lineIndex + 2);
              matchedLines.push(...logLines.slice(start, end));
            }
          }
          
          return {
            triggered: true,
            message: `Container ${container.name} logs matched pattern "${pattern}" (${finalMatches.length} matches)`,
            context: {
              triggerType: "log_pattern",
              triggerValue: pattern,
              logs: matchedLines.slice(0, 50).join("\n"), // Limit to 50 lines
              containerState: container.state,
              timestamp: new Date().toISOString(),
            },
          };
        }
      } catch (error) {
        console.error(`[Alerts] Failed to get logs for ${container.name}:`, error);
      }
      break;
    }
  }
  
  return { triggered: false, message: "" };
}

function isInCooldown(alertId: string, cooldownMinutes: number): boolean {
  const lastTriggered = cooldownCache.get(alertId);
  if (!lastTriggered) return false;
  const cooldownMs = cooldownMinutes * 60 * 1000;
  return Date.now() - lastTriggered < cooldownMs;
}

export async function evaluateAlerts(): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  const config = loadRawConfig();

  // Get alerts from database
  const dbAlerts = await db.select().from(alerts).where(eq(alerts.enabled, true));
  const alertRules: AlertRule[] = dbAlerts.map((a) => ({
    id: a.id,
    name: a.name,
    enabled: a.enabled ?? true,
    conditionType: a.conditionType,
    conditionConfig: JSON.parse(a.conditionConfig || "{}"),
    severity: a.severity,
    routing: a.routing ? JSON.parse(a.routing) : null,
    cooldownMinutes: a.cooldownMinutes ?? 5,
    dedupEnabled: a.dedupEnabled ?? true,
    dedupWindowMinutes: 5,
    lastTriggeredAt: a.lastTriggeredAt,
    source: "database",
  }));

  // Get alerts from config
  const configAlerts: AlertRule[] = (config.alerts?.rules || [])
    .filter((r: any) => r.enabled !== false)
    .map((r: any, i: number) => ({
      id: `config-${r.name || i}`,
      name: r.name,
      enabled: true,
      conditionType: r.condition?.type,
      conditionConfig: r.condition || {},
      severity: r.severity || "warning",
      routing: r.routing || null,
      cooldownMinutes: parseDuration(config.alerts?.defaults?.cooldown) / 60000 || 5,
      dedupEnabled: config.alerts?.defaults?.dedupEnabled ?? true,
      dedupWindowMinutes: parseDuration(r.dedupWindow) / 60000 || 5,
      lastTriggeredAt: null,
      source: "config",
    }));

  const allAlerts = [...alertRules, ...configAlerts];
  const containers = await listContainers(true);

  for (const alert of allAlerts) {
    if (isInCooldown(alert.id, alert.cooldownMinutes)) {
      continue;
    }

    for (const container of containers) {
      // Check container filter - if condition has a container field, only match those containers
      const containerFilter = alert.conditionConfig.container;
      if (containerFilter && !matchesContainerFilter(container.name, containerFilter)) {
        continue; // Skip containers that don't match the filter
      }

      // Check per-alert dedup window
      const dedupKey = `${alert.id}:${container.id}`;
      if (alert.dedupEnabled && alert.dedupWindowMinutes > 0) {
        const lastDedup = dedupCache.get(dedupKey);
        if (lastDedup && Date.now() - lastDedup < alert.dedupWindowMinutes * 60 * 1000) {
          continue; // Still in dedup window
        }
      }

      const { triggered, message, context } = await evaluateCondition(
        alert.conditionType,
        alert.conditionConfig,
        container,
        alert.id
      );

      if (triggered) {
        results.push({
          alertId: alert.id,
          alertName: alert.name,
          triggered: true,
          containerId: container.id,
          containerName: container.name,
          message,
          severity: alert.severity,
          context,
        });

        // Update cooldown and dedup cache
        cooldownCache.set(alert.id, Date.now());
        dedupCache.set(dedupKey, Date.now());

        // Create alert event
        const alertEventId = nanoid();
        await db.insert(alertEvents).values({
          id: alertEventId,
          alertId: alert.id.startsWith("config-") ? "config" : alert.id,
          containerId: container.id,
          serviceName: container.name,
          severity: alert.severity,
          message,
          createdAt: new Date(),
        });

        // Create incident if routing.createIncident is true
        if (alert.routing?.createIncident !== false) {
          const incidentId = nanoid();
          
          // Build detailed description with context
          let detailedDescription = message;
          if (context) {
            detailedDescription += `\n\n**Trigger Details:**`;
            detailedDescription += `\n- Type: ${context.triggerType}`;
            if (context.triggerValue !== undefined) {
              detailedDescription += `\n- Value: ${context.triggerValue}`;
            }
            if (context.threshold !== undefined) {
              detailedDescription += `\n- Threshold: ${context.threshold}`;
            }
            if (context.metrics) {
              detailedDescription += `\n\n**Resource Metrics:**`;
              if (context.metrics.cpu !== undefined) {
                detailedDescription += `\n- CPU: ${context.metrics.cpu?.toFixed(1)}%`;
              }
              if (context.metrics.memory !== undefined) {
                detailedDescription += `\n- Memory: ${context.metrics.memory?.toFixed(1)}%`;
              }
              if (context.metrics.memoryUsed && context.metrics.memoryLimit) {
                const usedMB = Math.round(context.metrics.memoryUsed / 1024 / 1024);
                const limitMB = Math.round(context.metrics.memoryLimit / 1024 / 1024);
                detailedDescription += `\n- Memory Used: ${usedMB}MB / ${limitMB}MB`;
              }
            }
            detailedDescription += `\n\n**Container State:** ${context.containerState || 'unknown'}`;
            if (context.healthStatus) {
              detailedDescription += `\n**Health Status:** ${context.healthStatus}`;
            }
            if (context.restartCount !== undefined) {
              detailedDescription += `\n**Restart Count:** ${context.restartCount}`;
            }
          }
          
          await db.insert(incidents).values({
            id: incidentId,
            title: `Alert: ${alert.name}`,
            description: detailedDescription,
            severity: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "medium" : "low",
            status: "investigating",
            affectedContainers: JSON.stringify([container.id]),
            affectedServices: JSON.stringify([container.name]),
            logExcerpts: context?.logs || null,
            isPublic: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Update alert event with incident ID
          await db.update(alertEvents)
            .set({ incidentId })
            .where(eq(alertEvents.id, alertEventId));

          // Auto-create ticket if enabled
          if (alert.routing?.autoTicket && config.ticketing?.provider === "linear") {
            const linearConfig = config.ticketing?.linear;
            if (linearConfig?.apiKey && linearConfig?.teamId) {
              const ticketId = await createLinearTicket(
                linearConfig.apiKey,
                linearConfig.teamId,
                `[${alert.severity.toUpperCase()}] ${alert.name}`,
                `${message}\n\nContainer: ${container.name}\nIncident ID: ${incidentId}`
              );

              if (ticketId) {
                await db.insert(tickets).values({
                  id: nanoid(),
                  incidentId,
                  provider: "linear",
                  externalId: ticketId,
                  title: `[${alert.severity.toUpperCase()}] ${alert.name}`,
                  status: "open",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            }
          }
        }

        // Send Discord notification (send if Discord is enabled globally, unless explicitly disabled for this alert)
        if (config.discord?.enabled && config.discord?.webhookUrl && alert.routing?.discord !== false) {
          console.log(`[Alerts] Sending Discord notification for alert: ${alert.name}`);
          await sendDiscordNotification(
            config.discord.webhookUrl,
            alert,
            container,
            message
          );
        }

        // Update last triggered time in database
        if (alert.source === "database") {
          await db.update(alerts)
            .set({ 
              lastTriggeredAt: new Date(),
              triggerCount: (dbAlerts.find(a => a.id === alert.id)?.triggerCount || 0) + 1
            })
            .where(eq(alerts.id, alert.id));
        }

        // Only trigger once per container per alert in this evaluation
        break;
      }
    }
  }

  return results;
}
