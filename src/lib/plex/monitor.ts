import { getDockerClient } from "@/lib/docker/client";
import { restartContainer, getContainer } from "@/lib/docker/containers";
import { recordUptime } from "@/lib/uptime/recorder";

export interface PlexMonitorConfig {
  plexUrl: string;
  plexToken: string;
  plexContainerName: string;
  zurgContainerName: string;
  checkIntervalSeconds: number;
  maxConsecutiveFailures: number;
  restartDelaySeconds?: number;
  discordWebhookUrl?: string;
  webhookUrl?: string;
  monitoredLibraries?: string[];
  enableAlerts?: boolean;
}

export interface PlexMonitorResult {
  timestamp: Date;
  isHealthy: boolean;
  mediaAvailable: boolean;
  error?: string;
  librariesChecked: number;
  unavailableLibraries: string[];
  consecutiveFailures: number;
  actionTaken?: "restart" | "none";
  restartedContainers?: string[];
  notificationsSent?: string[];
  webhookDelivered?: boolean;
  alertTriggered?: boolean;
}

export interface PlexLibrary {
  key: string;
  title: string;
  type: string;
  available: boolean;
}

let consecutiveFailures = 0;

export async function checkPlexHealth(config: PlexMonitorConfig): Promise<PlexMonitorResult> {
  const result: PlexMonitorResult = {
    timestamp: new Date(),
    isHealthy: true,
    mediaAvailable: true,
    librariesChecked: 0,
    unavailableLibraries: [],
    consecutiveFailures: 0,
  };

  try {
    const libraries = await getPlexLibraries(
      config.plexUrl,
      config.plexToken,
      config.monitoredLibraries
    );
    result.librariesChecked = libraries.length;

    const unavailable = libraries.filter((lib) => !lib.available);
    
    if (unavailable.length > 0) {
      result.mediaAvailable = false;
      result.unavailableLibraries = unavailable.map((lib) => lib.title);
      consecutiveFailures++;
      result.consecutiveFailures = consecutiveFailures;

      if (consecutiveFailures >= config.maxConsecutiveFailures) {
        result.actionTaken = "restart";
        result.restartedContainers = await restartPlexContainers(
          config.plexContainerName,
          config.zurgContainerName,
          config.restartDelaySeconds
        );
        
        result.notificationsSent = await sendNotifications(
          config,
          result.unavailableLibraries,
          result.restartedContainers
        );
        
        if (config.webhookUrl) {
          result.webhookDelivered = await sendWebhook(config.webhookUrl, result);
        }
        
        if (config.enableAlerts) {
          result.alertTriggered = await triggerAlert(result);
        }
        
        consecutiveFailures = 0;
      }
    } else {
      consecutiveFailures = 0;
      result.consecutiveFailures = 0;
    }

    result.isHealthy = result.mediaAvailable;
    
    // Record uptime for status page
    await recordUptime([{
      serviceName: "Plex Media Server",
      status: result.mediaAvailable ? "operational" : "degraded",
    }]);
  } catch (error) {
    result.isHealthy = false;
    result.error = error instanceof Error ? error.message : String(error);
    consecutiveFailures++;
    result.consecutiveFailures = consecutiveFailures;

    if (consecutiveFailures >= config.maxConsecutiveFailures) {
      try {
        result.actionTaken = "restart";
        result.restartedContainers = await restartPlexContainers(
          config.plexContainerName,
          config.zurgContainerName,
          config.restartDelaySeconds
        );
        
        result.notificationsSent = await sendNotifications(
          config,
          [],
          result.restartedContainers
        );
        
        if (config.webhookUrl) {
          result.webhookDelivered = await sendWebhook(config.webhookUrl, result);
        }
        
        if (config.enableAlerts) {
          result.alertTriggered = await triggerAlert(result);
        }
        
        consecutiveFailures = 0;
      } catch (restartError) {
        result.error = `${result.error}; Restart failed: ${restartError instanceof Error ? restartError.message : String(restartError)}`;
      }
    }
    
    // Record uptime for status page (error case)
    await recordUptime([{
      serviceName: "Plex Media Server",
      status: "down",
    }]);
  }

  return result;
}

async function getPlexLibraries(
  plexUrl: string,
  plexToken: string,
  monitoredLibraries?: string[]
): Promise<PlexLibrary[]> {
  const url = `${plexUrl}/library/sections?X-Plex-Token=${plexToken}`;
  
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Plex API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  let sections = data.MediaContainer?.Directory || [];

  if (monitoredLibraries && monitoredLibraries.length > 0) {
    sections = sections.filter((section: any) =>
      monitoredLibraries.includes(section.title) ||
      monitoredLibraries.includes(section.key)
    );
  }

  const libraries: PlexLibrary[] = [];

  for (const section of sections) {
    const available = await checkLibraryAvailability(
      plexUrl,
      plexToken,
      section.key
    );
    
    libraries.push({
      key: section.key,
      title: section.title,
      type: section.type,
      available,
    });
  }

  return libraries;
}

async function checkLibraryAvailability(
  plexUrl: string,
  plexToken: string,
  libraryKey: string
): Promise<boolean> {
  try {
    const url = `${plexUrl}/library/sections/${libraryKey}/all?X-Plex-Token=${plexToken}&X-Plex-Container-Size=1`;
    
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const metadata = data.MediaContainer?.Metadata || [];
    
    if (metadata.length === 0) {
      return true;
    }

    const firstItem = metadata[0];
    if (firstItem.Media && firstItem.Media.length > 0) {
      const media = firstItem.Media[0];
      if (media.Part && media.Part.length > 0) {
        const part = media.Part[0];
        return part.accessible !== false;
      }
    }

    return true;
  } catch (error) {
    console.error(`Error checking library ${libraryKey}:`, error);
    return false;
  }
}

async function restartPlexContainers(
  plexContainerName: string,
  zurgContainerName: string,
  restartDelaySeconds?: number
): Promise<string[]> {
  const docker = getDockerClient();
  const restartedContainers: string[] = [];
  const delayMs = (restartDelaySeconds || 5) * 1000;

  try {
    const zurgContainer = await getContainer(zurgContainerName);
    if (zurgContainer) {
      await restartContainer(zurgContainer.id);
      restartedContainers.push(zurgContainerName);
      console.log(`Restarted container: ${zurgContainerName}`);
      
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  } catch (error) {
    console.error(`Failed to restart ${zurgContainerName}:`, error);
  }

  try {
    const plexContainer = await getContainer(plexContainerName);
    if (plexContainer) {
      await restartContainer(plexContainer.id);
      restartedContainers.push(plexContainerName);
      console.log(`Restarted container: ${plexContainerName}`);
    }
  } catch (error) {
    console.error(`Failed to restart ${plexContainerName}:`, error);
  }

  return restartedContainers;
}

export async function findContainerByName(name: string): Promise<string | null> {
  try {
    const docker = getDockerClient();
    const containers = await docker.listContainers({ all: true });
    
    const container = containers.find((c) => {
      const containerName = c.Names?.[0]?.replace(/^\//, "") || "";
      return containerName === name || containerName.includes(name);
    });

    return container ? container.Id : null;
  } catch (error) {
    console.error(`Error finding container ${name}:`, error);
    return null;
  }
}

export function resetFailureCount(): void {
  consecutiveFailures = 0;
}

async function sendNotifications(
  config: PlexMonitorConfig,
  unavailableLibraries: string[],
  restartedContainers: string[]
): Promise<string[]> {
  const notifications: string[] = [];

  if (config.discordWebhookUrl) {
    try {
      await sendDiscordNotification(
        config.discordWebhookUrl,
        unavailableLibraries,
        restartedContainers
      );
      notifications.push("discord");
    } catch (error) {
      console.error("Failed to send Discord notification:", error);
    }
  }

  return notifications;
}

async function sendDiscordNotification(
  webhookUrl: string,
  unavailableLibraries: string[],
  restartedContainers: string[]
): Promise<void> {
  const embed = {
    title: "🔄 Plex Media Server Restarted",
    description: "Plex and Zurg containers have been automatically restarted due to media unavailability.",
    color: 0xff6b35,
    fields: [
      {
        name: "Unavailable Libraries",
        value: unavailableLibraries.length > 0
          ? unavailableLibraries.join(", ")
          : "Error detected",
        inline: false,
      },
      {
        name: "Restarted Containers",
        value: restartedContainers.join(", "),
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Controlyze Plex Monitor",
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }
}

async function sendWebhook(
  webhookUrl: string,
  result: PlexMonitorResult
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "plex_restart",
        timestamp: result.timestamp.toISOString(),
        unavailableLibraries: result.unavailableLibraries,
        restartedContainers: result.restartedContainers,
        consecutiveFailures: result.consecutiveFailures,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send webhook:", error);
    return false;
  }
}

async function triggerAlert(result: PlexMonitorResult): Promise<boolean> {
  try {
    const response = await fetch("/api/alerts/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        alertType: "plex_media_unavailable",
        severity: "critical",
        message: `Plex media unavailable. Libraries affected: ${result.unavailableLibraries.join(", ")}`,
        details: {
          unavailableLibraries: result.unavailableLibraries,
          restartedContainers: result.restartedContainers,
          consecutiveFailures: result.consecutiveFailures,
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to trigger alert:", error);
    return false;
  }
}
