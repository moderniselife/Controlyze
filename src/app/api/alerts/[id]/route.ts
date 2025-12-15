import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { loadRawConfig, saveRawConfig, resetConfigCache } from "@/lib/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alert = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);

    if (alert.length === 0) {
      return NextResponse.json(
        { success: false, error: "Alert not found" },
        { status: 404 }
      );
    }

    const formatted = {
      ...alert[0],
      conditionConfig: JSON.parse(alert[0].conditionConfig || "{}"),
      routing: alert[0].routing ? JSON.parse(alert[0].routing) : null,
    };

    return NextResponse.json({
      success: true,
      data: formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alert" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle config-based alerts (prefixed with "config-")
    if (id.startsWith("config-")) {
      const alertName = id.replace("config-", "");
      const config = loadRawConfig();
      
      if (!config.alerts?.rules) {
        return NextResponse.json(
          { success: false, error: "No alert rules in config" },
          { status: 404 }
        );
      }

      const ruleIndex = config.alerts.rules.findIndex((r: any) => r.name === alertName);
      if (ruleIndex === -1) {
        return NextResponse.json(
          { success: false, error: "Alert not found in config" },
          { status: 404 }
        );
      }

      // Update the rule in config
      config.alerts.rules[ruleIndex] = {
        ...config.alerts.rules[ruleIndex],
        name: body.name ?? config.alerts.rules[ruleIndex].name,
        enabled: body.enabled ?? config.alerts.rules[ruleIndex].enabled,
        condition: {
          type: body.conditionType ?? config.alerts.rules[ruleIndex].condition?.type,
          ...body.conditionConfig,
        },
        severity: body.severity ?? config.alerts.rules[ruleIndex].severity,
        routing: body.routing ?? config.alerts.rules[ruleIndex].routing,
      };

      saveRawConfig(config);
      resetConfigCache();

      return NextResponse.json({
        success: true,
        data: {
          id,
          ...config.alerts.rules[ruleIndex],
          source: "config",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Handle database alerts
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.conditionType !== undefined) updateData.conditionType = body.conditionType;
    if (body.conditionConfig !== undefined) updateData.conditionConfig = JSON.stringify(body.conditionConfig);
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.routing !== undefined) updateData.routing = JSON.stringify(body.routing);
    if (body.cooldownMinutes !== undefined) updateData.cooldownMinutes = body.cooldownMinutes;
    if (body.dedupEnabled !== undefined) updateData.dedupEnabled = body.dedupEnabled;

    await db.update(alerts).set(updateData).where(eq(alerts.id, id));

    const updated = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);

    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated[0],
        conditionConfig: JSON.parse(updated[0].conditionConfig || "{}"),
        routing: updated[0].routing ? JSON.parse(updated[0].routing) : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Handle config-based alerts
    if (id.startsWith("config-")) {
      const alertName = id.replace("config-", "");
      const config = loadRawConfig();
      
      if (!config.alerts?.rules) {
        return NextResponse.json(
          { success: false, error: "No alert rules in config" },
          { status: 404 }
        );
      }

      const ruleIndex = config.alerts.rules.findIndex((r: any) => r.name === alertName);
      if (ruleIndex === -1) {
        return NextResponse.json(
          { success: false, error: "Alert not found in config" },
          { status: 404 }
        );
      }

      config.alerts.rules.splice(ruleIndex, 1);
      saveRawConfig(config);
      resetConfigCache();

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle database alerts
    await db.delete(alerts).where(eq(alerts.id, id));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
