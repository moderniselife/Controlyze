import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plexMonitorLogs } from "@/lib/db/schema";
import { desc, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24");
    const limit = parseInt(searchParams.get("limit") || "100");

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const logs = await db
      .select()
      .from(plexMonitorLogs)
      .where(gte(plexMonitorLogs.timestamp, since))
      .orderBy(desc(plexMonitorLogs.timestamp))
      .limit(limit);

    const parsedLogs = logs.map((log) => ({
      ...log,
      unavailableLibraries: log.unavailableLibraries
        ? JSON.parse(log.unavailableLibraries)
        : [],
      restartedContainers: log.restartedContainers
        ? JSON.parse(log.restartedContainers)
        : null,
    }));

    const latestLog = parsedLogs[0];
    const totalChecks = logs.length;
    const healthyChecks = logs.filter((log) => log.isHealthy).length;
    const uptimePercent = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 100;
    const restartCount = logs.filter((log) => log.actionTaken === "restart").length;

    return NextResponse.json({
      success: true,
      data: {
        currentStatus: latestLog
          ? {
              isHealthy: latestLog.isHealthy,
              mediaAvailable: latestLog.mediaAvailable,
              timestamp: latestLog.timestamp,
              consecutiveFailures: latestLog.consecutiveFailures,
              unavailableLibraries: latestLog.unavailableLibraries,
              error: latestLog.error,
            }
          : null,
        statistics: {
          totalChecks,
          healthyChecks,
          uptimePercent: Math.round(uptimePercent * 100) / 100,
          restartCount,
          period: {
            hours,
            from: since.toISOString(),
            to: new Date().toISOString(),
          },
        },
        recentLogs: parsedLogs.slice(0, 20),
      },
    });
  } catch (error) {
    console.error("Error fetching Plex status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Plex status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
