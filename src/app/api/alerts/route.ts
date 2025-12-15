import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const allAlerts = await db.select().from(alerts).orderBy(desc(alerts.createdAt));
    
    const formatted = allAlerts.map((alert) => ({
      ...alert,
      conditionConfig: JSON.parse(alert.conditionConfig || "{}"),
      routing: alert.routing ? JSON.parse(alert.routing) : null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newAlert = {
      id: nanoid(),
      name: body.name,
      description: body.description || null,
      enabled: body.enabled ?? true,
      conditionType: body.conditionType,
      conditionConfig: JSON.stringify(body.conditionConfig || {}),
      severity: body.severity || "warning",
      routing: body.routing ? JSON.stringify(body.routing) : null,
      cooldownMinutes: body.cooldownMinutes || 5,
      dedupEnabled: body.dedupEnabled ?? true,
      triggerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(alerts).values(newAlert);

    return NextResponse.json({
      success: true,
      data: {
        ...newAlert,
        conditionConfig: body.conditionConfig || {},
        routing: body.routing || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
