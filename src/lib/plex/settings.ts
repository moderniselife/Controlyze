import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PlexMonitorConfig } from "./monitor";

interface PlexSettings {
  enabled: boolean;
  plexUrl: string;
  plexToken: string;
  plexContainerName: string;
  zurgContainerName: string;
  checkIntervalSeconds: number;
  maxConsecutiveFailures: number;
  restartDelaySeconds: number;
  discordWebhookUrl: string;
  webhookUrl: string;
  monitoredLibraries: string[];
  enableAlerts: boolean;
}

export async function getPlexMonitorConfig(): Promise<PlexMonitorConfig | null> {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "plex_monitor"));

    if (result.length === 0) {
      return getConfigFromEnv();
    }

    const plexSettings = JSON.parse(result[0].value) as PlexSettings;

    if (!plexSettings.enabled || !plexSettings.plexUrl || !plexSettings.plexToken) {
      return getConfigFromEnv();
    }

    return {
      plexUrl: plexSettings.plexUrl,
      plexToken: plexSettings.plexToken,
      plexContainerName: plexSettings.plexContainerName,
      zurgContainerName: plexSettings.zurgContainerName,
      checkIntervalSeconds: plexSettings.checkIntervalSeconds,
      maxConsecutiveFailures: plexSettings.maxConsecutiveFailures,
      restartDelaySeconds: plexSettings.restartDelaySeconds,
      discordWebhookUrl: plexSettings.discordWebhookUrl || undefined,
      webhookUrl: plexSettings.webhookUrl || undefined,
      monitoredLibraries: plexSettings.monitoredLibraries.length > 0 
        ? plexSettings.monitoredLibraries 
        : undefined,
      enableAlerts: plexSettings.enableAlerts,
    };
  } catch (error) {
    console.error("Error loading Plex settings from database:", error);
    return getConfigFromEnv();
  }
}

function getConfigFromEnv(): PlexMonitorConfig | null {
  const plexUrl = process.env.PLEX_URL;
  const plexToken = process.env.PLEX_TOKEN;
  const plexContainerName = process.env.PLEX_CONTAINER_NAME || "plex";
  const zurgContainerName = process.env.ZURG_CONTAINER_NAME || "pd_zurg";
  const checkIntervalSeconds = parseInt(process.env.PLEX_CHECK_INTERVAL || "60");
  const maxConsecutiveFailures = parseInt(process.env.PLEX_MAX_FAILURES || "3");
  const restartDelaySeconds = parseInt(process.env.PLEX_RESTART_DELAY || "5");
  const discordWebhookUrl = process.env.PLEX_DISCORD_WEBHOOK_URL;
  const webhookUrl = process.env.PLEX_WEBHOOK_URL;
  const monitoredLibraries = process.env.PLEX_MONITORED_LIBRARIES
    ? process.env.PLEX_MONITORED_LIBRARIES.split(",").map((lib) => lib.trim())
    : undefined;
  const enableAlerts = process.env.PLEX_ENABLE_ALERTS === "true";

  if (!plexUrl || !plexToken) {
    return null;
  }

  return {
    plexUrl,
    plexToken,
    plexContainerName,
    zurgContainerName,
    checkIntervalSeconds,
    maxConsecutiveFailures,
    restartDelaySeconds,
    discordWebhookUrl,
    webhookUrl,
    monitoredLibraries,
    enableAlerts,
  };
}
