import { NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import { recordUptimeCheck } from "@/lib/uptime/tracker";
import { checkPlexHealth } from "@/lib/plex/monitor";
import { getPlexMonitorConfig } from "@/lib/plex/settings";
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
    const plexConfig = await getPlexMonitorConfig();
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
          notificationsSent: plexResult.notificationsSent ? JSON.stringify(plexResult.notificationsSent) : null,
          webhookDelivered: plexResult.webhookDelivered,
          alertTriggered: plexResult.alertTriggered,
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

