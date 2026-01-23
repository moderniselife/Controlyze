import { NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import { recordUptimeCheck } from "@/lib/uptime/tracker";
import { checkPlexHealth, PlexMonitorConfig } from "@/lib/plex/monitor";
import { db } from "@/lib/db";
import { plexMonitorLogs } from "@/lib/db/schema";

export async function GET() {
  return POST();
}

export async function POST() {
  const startTime = Date.now();
  
  try {
    const uptimeResults = await recordUptimeCheck();
    
    const alertResults = await evaluateAlerts();
    const triggeredAlerts = alertResults.filter((r) => r.triggered);
    
    let plexResult = null;
    const plexConfig = getPlexMonitorConfig();
    if (plexConfig) {
      try {
        plexResult = await checkPlexHealth(plexConfig);
        
        await db.insert(plexMonitorLogs).values({
          id: `plex_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          timestamp: plexResult.timestamp,
          isHealthy: plexResult.isHealthy,
          mediaAvailable: plexResult.mediaAvailable,
          error: plexResult.error,
          librariesChecked: plexResult.librariesChecked,
          unavailableLibraries: JSON.stringify(plexResult.unavailableLibraries),
          consecutiveFailures: plexResult.consecutiveFailures,
          actionTaken: plexResult.actionTaken,
          restartedContainers: plexResult.restartedContainers ? JSON.stringify(plexResult.restartedContainers) : null,
        });
      } catch (plexError) {
        console.error("Error in Plex monitoring:", plexError);
      }
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: {
        uptime: {
          servicesChecked: uptimeResults.length,
          services: uptimeResults,
        },
        alerts: {
          evaluated: alertResults.length,
          triggered: triggeredAlerts.length,
          details: triggeredAlerts,
        },
        plex: plexResult ? {
          isHealthy: plexResult.isHealthy,
          mediaAvailable: plexResult.mediaAvailable,
          librariesChecked: plexResult.librariesChecked,
          unavailableLibraries: plexResult.unavailableLibraries,
          consecutiveFailures: plexResult.consecutiveFailures,
          actionTaken: plexResult.actionTaken,
        } : null,
        duration: `${duration}ms`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { success: false, error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}

function getPlexMonitorConfig(): PlexMonitorConfig | null {
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
