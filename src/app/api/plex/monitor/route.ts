import { NextResponse } from "next/server";
import { checkPlexHealth, PlexMonitorConfig } from "@/lib/plex/monitor";
import { db } from "@/lib/db";
import { plexMonitorLogs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const config = await getPlexMonitorConfig();
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: "Plex monitor not configured" },
        { status: 400 }
      );
    }

    const result = await checkPlexHealth(config);

    await db.insert(plexMonitorLogs).values({
      id: `plex_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: result.timestamp,
      isHealthy: result.isHealthy,
      mediaAvailable: result.mediaAvailable,
      error: result.error,
      librariesChecked: result.librariesChecked,
      unavailableLibraries: JSON.stringify(result.unavailableLibraries),
      consecutiveFailures: result.consecutiveFailures,
      actionTaken: result.actionTaken,
      restartedContainers: result.restartedContainers ? JSON.stringify(result.restartedContainers) : null,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in Plex monitor:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to check Plex health",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

async function getPlexMonitorConfig(): Promise<PlexMonitorConfig | null> {
  const plexUrl = process.env.PLEX_URL;
  const plexToken = process.env.PLEX_TOKEN;
  const plexContainerName = process.env.PLEX_CONTAINER_NAME || "plex";
  const zurgContainerName = process.env.ZURG_CONTAINER_NAME || "pd_zurg";
  const checkIntervalSeconds = parseInt(process.env.PLEX_CHECK_INTERVAL || "60");
  const maxConsecutiveFailures = parseInt(process.env.PLEX_MAX_FAILURES || "3");

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
  };
}
