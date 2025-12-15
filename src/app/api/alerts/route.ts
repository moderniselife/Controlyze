import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { loadRawConfig } from "@/lib/config";

export async function GET() {
  try {
    // Get alerts from database
    const dbAlerts = await db.select().from(alerts).orderBy(desc(alerts.createdAt));
    
    const formattedDbAlerts = dbAlerts.map((alert) => ({
      ...alert,
      source: "database" as const,
      conditionConfig: JSON.parse(alert.conditionConfig || "{}"),
      routing: alert.routing ? JSON.parse(alert.routing) : null,
    }));

    // Get alerts from config file
    const config = loadRawConfig();
    const configAlerts = (config.alerts?.rules || []).map((rule: any, index: number) => ({
      id: `config-${rule.name || index}`,
      name: rule.name,
      description: rule.description || null,
      enabled: rule.enabled ?? true,
      conditionType: rule.condition?.type,
      conditionConfig: rule.condition || {},
      severity: rule.severity || "warning",
      routing: rule.routing || null,
      cooldownMinutes: rule.dedupWindow ? parseInt(rule.dedupWindow) : 5,
      dedupEnabled: config.alerts?.defaults?.dedupEnabled ?? true,
      lastTriggeredAt: null,
      triggerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: "config" as const,
    }));

    // Merge: DB alerts first, then config alerts (exclude if name matches)
    const dbNames = new Set(formattedDbAlerts.map(a => a.name));
    const mergedAlerts = [
      ...formattedDbAlerts,
      ...configAlerts.filter((a: any) => !dbNames.has(a.name)),
    ];

    return NextResponse.json({
      success: true,
      data: mergedAlerts,
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
