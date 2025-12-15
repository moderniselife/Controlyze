import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertEvents, alerts } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const acknowledged = searchParams.get("acknowledged");

    let query = db
      .select({
        id: alertEvents.id,
        alertId: alertEvents.alertId,
        alertName: alerts.name,
        containerId: alertEvents.containerId,
        stackName: alertEvents.stackName,
        serviceName: alertEvents.serviceName,
        severity: alertEvents.severity,
        message: alertEvents.message,
        details: alertEvents.details,
        acknowledged: alertEvents.acknowledged,
        acknowledgedBy: alertEvents.acknowledgedBy,
        acknowledgedAt: alertEvents.acknowledgedAt,
        incidentId: alertEvents.incidentId,
        createdAt: alertEvents.createdAt,
      })
      .from(alertEvents)
      .leftJoin(alerts, eq(alertEvents.alertId, alerts.id))
      .orderBy(desc(alertEvents.createdAt))
      .limit(limit);

    const events = await query;

    // Filter by acknowledged status if specified
    let filteredEvents = events;
    if (acknowledged === "true") {
      filteredEvents = events.filter((e) => e.acknowledged);
    } else if (acknowledged === "false") {
      filteredEvents = events.filter((e) => !e.acknowledged);
    }

    return NextResponse.json({
      success: true,
      data: filteredEvents,
    });
  } catch (error) {
    console.error("Failed to fetch alert events:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alert events" },
      { status: 500 }
    );
  }
}
