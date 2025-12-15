import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertEvents, incidents } from "@/lib/db/schema";
import { desc, gte } from "drizzle-orm";

export async function GET() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get recent alert events
    const recentAlerts = await db
      .select()
      .from(alertEvents)
      .where(gte(alertEvents.createdAt, oneDayAgo))
      .orderBy(desc(alertEvents.createdAt))
      .limit(20);

    // Get recent incidents
    const recentIncidents = await db
      .select()
      .from(incidents)
      .where(gte(incidents.createdAt, oneDayAgo))
      .orderBy(desc(incidents.createdAt))
      .limit(20);

    // Combine and format notifications
    const notifications = [
      ...recentAlerts.map((alert) => ({
        id: alert.id,
        type: "alert" as const,
        title: alert.message || "Alert triggered",
        subtitle: alert.serviceName || "Unknown service",
        severity: alert.severity,
        timestamp: alert.createdAt.toISOString(),
        read: alert.acknowledged ?? false,
      })),
      ...recentIncidents.map((incident) => ({
        id: incident.id,
        type: "incident" as const,
        title: incident.title,
        subtitle: incident.status,
        severity: incident.severity,
        timestamp: incident.createdAt.toISOString(),
        read: incident.status === "resolved",
      })),
    ];

    // Sort by timestamp descending
    notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Count unread
    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.slice(0, 20),
        unreadCount,
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (action === "markRead" && id) {
      // Mark alert event as acknowledged
      await db.update(alertEvents)
        .set({ acknowledged: true })
        .where(desc(alertEvents.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
