import { listContainers } from "@/lib/docker/containers";
import { loadRawConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { alerts, incidents, alertEvents, tickets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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
  lastTriggeredAt: Date | null;
  source?: string;
}

interface Container {
  id: string;
  name: string;
  state: string;
  healthStatus?: string;
  restartCount?: number;
}

interface EvaluationResult {
  alertId: string;
  alertName: string;
  triggered: boolean;
  containerId?: string;
  containerName?: string;
  message: string;
  severity: string;
}

const cooldownCache = new Map<string, number>();

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

function evaluateCondition(
  conditionType: string,
  conditionConfig: Record<string, any>,
  container: Container
): { triggered: boolean; message: string } {
  switch (conditionType) {
    case "health_status": {
      const targetStatus = conditionConfig.status || "unhealthy";
      if (container.healthStatus === targetStatus) {
        return {
          triggered: true,
          message: `Container ${container.name} is ${targetStatus}`,
        };
      }
      break;
    }
    case "restart_count": {
      const threshold = conditionConfig.threshold || 3;
      if ((container.restartCount || 0) >= threshold) {
        return {
          triggered: true,
          message: `Container ${container.name} has restarted ${container.restartCount} times (threshold: ${threshold})`,
        };
      }
      break;
    }
    case "container_stopped": {
      if (container.state !== "running") {
        return {
          triggered: true,
          message: `Container ${container.name} is not running (state: ${container.state})`,
        };
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
    lastTriggeredAt: a.lastTriggeredAt,
    source: "database",
  }));

  // Get alerts from config
  const configAlerts = (config.alerts?.rules || [])
    .filter((r: any) => r.enabled !== false)
    .map((r: any, i: number) => ({
      id: `config-${r.name || i}`,
      name: r.name,
      enabled: true,
      conditionType: r.condition?.type,
      conditionConfig: r.condition || {},
      severity: r.severity || "warning",
      routing: r.routing || null,
      cooldownMinutes: 5,
      dedupEnabled: true,
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
      const { triggered, message } = evaluateCondition(
        alert.conditionType,
        alert.conditionConfig,
        container
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
        });

        // Update cooldown
        cooldownCache.set(alert.id, Date.now());

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
          await db.insert(incidents).values({
            id: incidentId,
            title: `Alert: ${alert.name}`,
            description: message,
            severity: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "medium" : "low",
            status: "open",
            affectedContainers: JSON.stringify([container.id]),
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

        // Send Discord notification
        if (alert.routing?.discord && config.discord?.enabled && config.discord?.webhookUrl) {
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
