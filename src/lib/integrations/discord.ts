import type { Incident, AlertEvent } from "@/lib/db/schema";

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

const SEVERITY_COLORS = {
  info: 0x3b82f6,
  warning: 0xeab308,
  critical: 0xef4444,
};

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Discord API error: ${response.status} - ${text}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function buildAlertEmbed(
  alert: {
    name: string;
    severity: "info" | "warning" | "critical";
    message: string;
    containerId?: string;
    containerName?: string;
    stackName?: string;
  },
  baseUrl: string
): DiscordEmbed {
  const fields: DiscordEmbed["fields"] = [];

  if (alert.containerName) {
    fields.push({
      name: "Container",
      value: alert.containerName,
      inline: true,
    });
  }

  if (alert.stackName) {
    fields.push({
      name: "Stack",
      value: alert.stackName,
      inline: true,
    });
  }

  return {
    title: `🔔 ${alert.name}`,
    description: alert.message,
    color: SEVERITY_COLORS[alert.severity],
    timestamp: new Date().toISOString(),
    fields,
    footer: {
      text: "Controlyze",
    },
  };
}

export function buildIncidentEmbed(
  incident: {
    id: string;
    title: string;
    description?: string;
    severity: "info" | "warning" | "critical";
    status: string;
    affectedServices: string[];
  },
  baseUrl: string
): DiscordEmbed {
  return {
    title: `🚨 Incident: ${incident.title}`,
    description: incident.description || "No description provided",
    color: SEVERITY_COLORS[incident.severity],
    url: `${baseUrl}/incidents/${incident.id}`,
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: "Status",
        value: incident.status.charAt(0).toUpperCase() + incident.status.slice(1),
        inline: true,
      },
      {
        name: "Severity",
        value: incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1),
        inline: true,
      },
      {
        name: "Affected Services",
        value: incident.affectedServices.join(", ") || "None",
        inline: false,
      },
    ],
    footer: {
      text: `Incident ID: ${incident.id}`,
    },
  };
}

export function buildContainerStatusEmbed(
  container: {
    name: string;
    status: string;
    healthStatus?: string;
    image: string;
    stackName?: string;
  },
  action: "started" | "stopped" | "restarted" | "unhealthy" | "healthy"
): DiscordEmbed {
  const actionEmoji = {
    started: "▶️",
    stopped: "⏹️",
    restarted: "🔄",
    unhealthy: "❌",
    healthy: "✅",
  };

  const actionColor = {
    started: 0x22c55e,
    stopped: 0x6b7280,
    restarted: 0xf59e0b,
    unhealthy: 0xef4444,
    healthy: 0x22c55e,
  };

  return {
    title: `${actionEmoji[action]} Container ${action}: ${container.name}`,
    color: actionColor[action],
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: "Image",
        value: container.image,
        inline: true,
      },
      ...(container.stackName
        ? [{ name: "Stack", value: container.stackName, inline: true }]
        : []),
    ],
    footer: {
      text: "Controlyze",
    },
  };
}

export async function sendAlert(
  webhookUrl: string,
  alert: {
    name: string;
    severity: "info" | "warning" | "critical";
    message: string;
    containerId?: string;
    containerName?: string;
    stackName?: string;
    logExcerpt?: string;
  },
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const embed = buildAlertEmbed(alert, baseUrl);

  if (alert.logExcerpt) {
    embed.fields = embed.fields || [];
    embed.fields.push({
      name: "Log Excerpt",
      value: `\`\`\`\n${alert.logExcerpt.slice(0, 1000)}\n\`\`\``,
      inline: false,
    });
  }

  return sendDiscordWebhook(webhookUrl, {
    username: "Controlyze",
    embeds: [embed],
  });
}

export async function sendIncidentNotification(
  webhookUrl: string,
  incident: {
    id: string;
    title: string;
    description?: string;
    severity: "info" | "warning" | "critical";
    status: string;
    affectedServices: string[];
  },
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const embed = buildIncidentEmbed(incident, baseUrl);

  return sendDiscordWebhook(webhookUrl, {
    username: "Controlyze",
    embeds: [embed],
  });
}
