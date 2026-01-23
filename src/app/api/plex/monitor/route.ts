import { NextResponse } from "next/server";
import { checkPlexHealth } from "@/lib/plex/monitor";
import { getPlexMonitorConfig } from "@/lib/plex/settings";
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
      notificationsSent: result.notificationsSent ? JSON.stringify(result.notificationsSent) : null,
      webhookDelivered: result.webhookDelivered,
      alertTriggered: result.alertTriggered,
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

