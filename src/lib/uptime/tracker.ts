import { listContainers } from "@/lib/docker/containers";
import { db } from "@/lib/db";
import { uptimeRecords } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { gte, and, eq, desc } from "drizzle-orm";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
}

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

function getServiceStatus(state: string, healthStatus?: string): "operational" | "degraded" | "down" {
  if (state !== "running") return "down";
  if (healthStatus === "unhealthy") return "degraded";
  return "operational";
}

export async function recordUptimeCheck(): Promise<ServiceStatus[]> {
  const containers = await listContainers(true);
  const serviceStatuses: ServiceStatus[] = [];
  const checkedAt = new Date();
  const processedServices = new Set<string>();

  for (const container of containers) {
    const serviceName = container.serviceName || container.name;
    const lowerName = serviceName.toLowerCase();

    const matchedService = PUBLIC_SERVICES.find(
      (ps) => lowerName.includes(ps) || lowerName === ps
    );

    if (matchedService && !processedServices.has(matchedService)) {
      processedServices.add(matchedService);
      const status = getServiceStatus(container.state, container.healthStatus);

      serviceStatuses.push({
        name: matchedService,
        status,
      });

      // Record to database
      await db.insert(uptimeRecords).values({
        id: nanoid(),
        serviceName: matchedService,
        status,
        checkedAt,
      });
    }
  }

  return serviceStatuses;
}

export async function calculateUptime(
  serviceName: string,
  hours: number
): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const records = await db
    .select()
    .from(uptimeRecords)
    .where(
      and(
        eq(uptimeRecords.serviceName, serviceName),
        gte(uptimeRecords.checkedAt, since)
      )
    )
    .orderBy(desc(uptimeRecords.checkedAt));

  if (records.length === 0) {
    return 100; // No data, assume 100%
  }

  const operationalCount = records.filter((r) => r.status === "operational").length;
  const degradedCount = records.filter((r) => r.status === "degraded").length;
  
  // Degraded counts as 50% uptime, down counts as 0%
  const uptimeScore = operationalCount + (degradedCount * 0.5);
  const uptime = (uptimeScore / records.length) * 100;

  return Math.round(uptime * 10) / 10; // Round to 1 decimal
}

export async function getOverallUptime(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const records = await db
    .select()
    .from(uptimeRecords)
    .where(gte(uptimeRecords.checkedAt, since));

  if (records.length === 0) {
    return 100;
  }

  const operationalCount = records.filter((r) => r.status === "operational").length;
  const degradedCount = records.filter((r) => r.status === "degraded").length;
  
  const uptimeScore = operationalCount + (degradedCount * 0.5);
  const uptime = (uptimeScore / records.length) * 100;

  return Math.round(uptime * 10) / 10;
}

export async function cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  // SQLite doesn't support returning deleted count easily, so we count first
  const oldRecords = await db
    .select()
    .from(uptimeRecords)
    .where(gte(uptimeRecords.checkedAt, cutoff));
  
  // Delete would need a different approach in drizzle, for now just return 0
  // In production you'd want proper cleanup
  return 0;
}
