import { NextRequest, NextResponse } from "next/server";
import { startScheduler, stopScheduler, isSchedulerRunning } from "@/lib/scheduler";

export async function GET() {
  return NextResponse.json({
    success: true,
    running: isSchedulerRunning(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "start";
    const interval = body.interval || 30000; // Default 30 seconds

    if (action === "start") {
      startScheduler(interval);
      return NextResponse.json({
        success: true,
        message: `Scheduler started with ${interval}ms interval`,
        running: true,
      });
    } else if (action === "stop") {
      stopScheduler();
      return NextResponse.json({
        success: true,
        message: "Scheduler stopped",
        running: false,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'start' or 'stop'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Scheduler error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to control scheduler" },
      { status: 500 }
    );
  }
}
