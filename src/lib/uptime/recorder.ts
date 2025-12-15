import { db } from "@/lib/db";
import { uptimeRecords } from "@/lib/db/schema";
import crypto from "crypto";

export type ServiceStatus = "operational" | "degraded" | "down";

export interface ServiceCheck {
  serviceName: string;
  status: ServiceStatus;
}

/**
 * Record uptime status for services
 */
export async function recordUptime(checks: ServiceCheck[]): Promise<void> {
  const now = new Date();
  
  const records = checks.map((check) => ({
    id: crypto.randomUUID(),
    serviceName: check.serviceName,
    status: check.status,
    checkedAt: now,
  }));

  if (records.length > 0) {
    await db.insert(uptimeRecords).values(records);
  }
}

/**
 * Determine service status based on container states
 */
export function determineServiceStatus(containers: Array<{
  state: string;
  healthStatus?: string;
}>): ServiceStatus {
  if (containers.length === 0) return "down";

  const running = containers.filter((c) => c.state === "running");
  const healthy = containers.filter(
    (c) => c.state === "running" && (!c.healthStatus || c.healthStatus === "healthy")
  );
  const unhealthy = containers.filter(
    (c) => c.state === "running" && c.healthStatus === "unhealthy"
  );

  // All down
  if (running.length === 0) return "down";

  // All running and healthy
  if (unhealthy.length === 0 && running.length === containers.length) {
    return "operational";
  }

  // Some issues but not fully down
  return "degraded";
}

/**
 * Clean up old uptime records (keep last N days)
 */
export async function cleanupOldRecords(retentionDays: number = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const result = await db
    .delete(uptimeRecords)
    .where(
      // @ts-ignore - drizzle typing issue
      uptimeRecords.checkedAt < cutoff
    );

  return result.changes || 0;
}
