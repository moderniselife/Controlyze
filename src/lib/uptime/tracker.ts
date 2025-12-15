import { db } from "@/lib/db";
import { uptimeChecks } from "@/lib/db/schema";
import { listContainers } from "@/lib/docker/containers";
import { nanoid } from "nanoid";
import { gte, and, sql } from "drizzle-orm";

const PUBLIC_SERVICES = [
  "plex",
  "overseerr",
  "tautulli",
  "tunarr",
  "prowlarr",
  "schrodrive",
  "cloudflare-tunnel",
  "sonarr",
  "radarr",
  "jellyfin",
  "portainer",
];

function getServiceStatus(state: string, healthStatus?: string): string {
  if (state !== "running") return "down";
  if (healthStatus === "unhealthy") return "degraded";
  return "operational";
}

export async function recordUptimeCheck(): Promise<{ servicesChecked: number }> {
  const containers = await listContainers(true);
  const now = new Date();
  const serviceStatuses = new Map<string, string>();

  for (const container of containers) {
    const serviceName = container.serviceName || container.name;
    const lowerName = serviceName.toLowerCase();

    const matchedService = PUBLIC_SERVICES.find(
      (ps) => lowerName.includes(ps) || lowerName === ps
    );

    if (matchedService) {
      const status = getServiceStatus(container.state, container.healthStatus);
      
      // Keep worst status for each service
      const currentStatus = serviceStatuses.get(matchedService);
      if (!currentStatus || 
          (status === "down") || 
          (status === "degraded" && currentStatus === "operational")) {
        serviceStatuses.set(matchedService, status);
      }
    }
  }

  // Record a check for each service
  for (const [serviceName, status] of serviceStatuses) {
    await db.insert(uptimeChecks).values({
      id: nanoid(),
      serviceName,
      status,
      checkedAt: now,
    });
  }

  // Also record "overall" status
  const allStatuses = Array.from(serviceStatuses.values());
  const overallStatus = allStatuses.includes("down") 
    ? "down" 
    : allStatuses.includes("degraded") 
    ? "degraded" 
    : "operational";

  await db.insert(uptimeChecks).values({
    id: nanoid(),
    serviceName: "_overall",
    status: overallStatus,
    checkedAt: now,
  });

  return { servicesChecked: serviceStatuses.size };
}

export async function calculateUptime(
  serviceName: string = "_overall",
  hours: number = 24
): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const checks = await db
    .select()
    .from(uptimeChecks)
    .where(
      and(
        sql`${uptimeChecks.serviceName} = ${serviceName}`,
        gte(uptimeChecks.checkedAt, since)
      )
    );

  if (checks.length === 0) {
    return 100; // No data, assume 100%
  }

  const operationalChecks = checks.filter((c) => c.status === "operational").length;
  const percentage = (operationalChecks / checks.length) * 100;

  return Math.round(percentage * 10) / 10; // Round to 1 decimal
}

export async function getUptimeStats(): Promise<{
  last24h: number;
  last7d: number;
  last30d: number;
}> {
  const [last24h, last7d, last30d] = await Promise.all([
    calculateUptime("_overall", 24),
    calculateUptime("_overall", 24 * 7),
    calculateUptime("_overall", 24 * 30),
  ]);

  return { last24h, last7d, last30d };
}

export async function cleanupOldChecks(daysToKeep: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const result = await db
    .delete(uptimeChecks)
    .where(sql`${uptimeChecks.checkedAt} < ${cutoff.getTime()}`);

  return 0; // SQLite doesn't return affected rows easily
}
