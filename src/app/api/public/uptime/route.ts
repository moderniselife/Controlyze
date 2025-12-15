import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uptimeRecords } from "@/lib/db/schema";
import { desc, gte, eq, and, sql } from "drizzle-orm";

// GET uptime history for status page
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90");
    const service = searchParams.get("service");

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get uptime records
    const whereClause = service
      ? and(
          gte(uptimeRecords.checkedAt, since),
          eq(uptimeRecords.serviceName, service)
        )
      : gte(uptimeRecords.checkedAt, since);

    const records = await db
      .select()
      .from(uptimeRecords)
      .where(whereClause)
      .orderBy(desc(uptimeRecords.checkedAt))
      .limit(10000);

    // Group records by service and calculate uptime percentages
    const serviceMap = new Map<
      string,
      {
        records: Array<{ status: string; checkedAt: Date }>;
        operational: number;
        degraded: number;
        down: number;
        total: number;
      }
    >();

    for (const record of records) {
      if (!serviceMap.has(record.serviceName)) {
        serviceMap.set(record.serviceName, {
          records: [],
          operational: 0,
          degraded: 0,
          down: 0,
          total: 0,
        });
      }
      const svc = serviceMap.get(record.serviceName)!;
      svc.records.push({ status: record.status, checkedAt: record.checkedAt });
      svc.total++;
      if (record.status === "operational") svc.operational++;
      else if (record.status === "degraded") svc.degraded++;
      else svc.down++;
    }

    // Calculate daily uptime for graph
    const dailyUptime = calculateDailyUptime(records, days);

    // Calculate overall uptime percentages
    const services = Array.from(serviceMap.entries()).map(([name, data]) => ({
      name,
      uptimePercent: data.total > 0 ? (data.operational / data.total) * 100 : 100,
      degradedPercent: data.total > 0 ? (data.degraded / data.total) * 100 : 0,
      downPercent: data.total > 0 ? (data.down / data.total) * 100 : 0,
      totalChecks: data.total,
    }));

    // Calculate overall system uptime
    const totalRecords = records.length;
    const operationalRecords = records.filter(
      (r) => r.status === "operational"
    ).length;
    const overallUptime =
      totalRecords > 0 ? (operationalRecords / totalRecords) * 100 : 100;

    return NextResponse.json({
      success: true,
      data: {
        overallUptime: Math.round(overallUptime * 100) / 100,
        services,
        dailyUptime,
        period: {
          days,
          from: since.toISOString(),
          to: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching uptime:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch uptime data" },
      { status: 500 }
    );
  }
}

function calculateDailyUptime(
  records: Array<{ serviceName: string; status: string; checkedAt: Date }>,
  days: number
): Array<{ date: string; uptime: number; checks: number }> {
  const dailyMap = new Map<
    string,
    { operational: number; total: number }
  >();

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    dailyMap.set(dateStr, { operational: 0, total: 0 });
  }

  // Aggregate records by day
  for (const record of records) {
    const dateStr = record.checkedAt.toISOString().split("T")[0];
    if (dailyMap.has(dateStr)) {
      const day = dailyMap.get(dateStr)!;
      day.total++;
      if (record.status === "operational") day.operational++;
    }
  }

  // Convert to array and calculate percentages
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      uptime: data.total > 0 ? (data.operational / data.total) * 100 : 100,
      checks: data.total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
