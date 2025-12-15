import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/lib/scheduler";

export async function GET() {
  try {
    const status = getSchedulerStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        lastRunAt: status.lastRunAt?.toISOString() || null,
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get scheduler status" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Manually trigger a scheduler run
    const { evaluateAlerts } = await import("@/lib/alerts/evaluator");
    const { recordUptimeCheck } = await import("@/lib/uptime/tracker");

    const uptimeResult = await recordUptimeCheck();
    await evaluateAlerts();

    return NextResponse.json({
      success: true,
      message: "Scheduler run completed",
      servicesChecked: uptimeResult.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error running scheduler manually:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run scheduler" },
      { status: 500 }
    );
  }
}
