import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plexMonitorLogs } from "@/lib/db/schema";
import { desc, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const logs = await db
      .select()
      .from(plexMonitorLogs)
      .where(gte(plexMonitorLogs.timestamp, since))
      .orderBy(desc(plexMonitorLogs.timestamp))
      .limit(1000);

    const latest = logs[0];
    const totalChecks = logs.length;
    const healthyChecks = logs.filter((log) => log.isHealthy).length;
    const restartCount = logs.filter((log) => log.actionTaken === "restart").length;
    const notificationsSent = logs.filter((log) => {
      try {
        const notifications = log.restartedContainers ? JSON.parse(log.restartedContainers) : [];
        return notifications.length > 0;
      } catch {
        return false;
      }
    }).length;

    const metrics = [
      `# HELP plex_monitor_health_status Current health status of Plex (1=healthy, 0=unhealthy)`,
      `# TYPE plex_monitor_health_status gauge`,
      `plex_monitor_health_status ${latest?.isHealthy ? 1 : 0}`,
      ``,
      `# HELP plex_monitor_consecutive_failures Current consecutive failure count`,
      `# TYPE plex_monitor_consecutive_failures gauge`,
      `plex_monitor_consecutive_failures ${latest?.consecutiveFailures || 0}`,
      ``,
      `# HELP plex_monitor_libraries_checked Number of libraries checked in last run`,
      `# TYPE plex_monitor_libraries_checked gauge`,
      `plex_monitor_libraries_checked ${latest?.librariesChecked || 0}`,
      ``,
      `# HELP plex_monitor_libraries_unavailable Number of unavailable libraries in last run`,
      `# TYPE plex_monitor_libraries_unavailable gauge`,
      `plex_monitor_libraries_unavailable ${latest ? (JSON.parse(latest.unavailableLibraries || "[]").length) : 0}`,
      ``,
      `# HELP plex_monitor_uptime_percent Uptime percentage over last 24 hours`,
      `# TYPE plex_monitor_uptime_percent gauge`,
      `plex_monitor_uptime_percent ${totalChecks > 0 ? ((healthyChecks / totalChecks) * 100).toFixed(2) : 100}`,
      ``,
      `# HELP plex_monitor_restarts_total Total number of container restarts in last 24 hours`,
      `# TYPE plex_monitor_restarts_total counter`,
      `plex_monitor_restarts_total ${restartCount}`,
      ``,
      `# HELP plex_monitor_notifications_sent_total Total notifications sent in last 24 hours`,
      `# TYPE plex_monitor_notifications_sent_total counter`,
      `plex_monitor_notifications_sent_total ${notificationsSent}`,
      ``,
      `# HELP plex_monitor_checks_total Total health checks performed in last 24 hours`,
      `# TYPE plex_monitor_checks_total counter`,
      `plex_monitor_checks_total ${totalChecks}`,
      ``,
      `# HELP plex_monitor_last_check_timestamp Unix timestamp of last health check`,
      `# TYPE plex_monitor_last_check_timestamp gauge`,
      `plex_monitor_last_check_timestamp ${latest ? Math.floor(new Date(latest.timestamp).getTime() / 1000) : 0}`,
    ];

    return new NextResponse(metrics.join("\n"), {
      headers: {
        "Content-Type": "text/plain; version=0.0.4",
      },
    });
  } catch (error) {
    console.error("Error generating Plex metrics:", error);
    return new NextResponse("# Error generating metrics\n", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; version=0.0.4",
      },
    });
  }
}
