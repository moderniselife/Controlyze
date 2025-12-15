import { NextResponse } from "next/server";
import { recordUptimeCheck, cleanupOldChecks } from "@/lib/uptime/tracker";

export async function POST() {
  try {
    const result = await recordUptimeCheck();
    
    // Clean up old checks occasionally (every ~100 calls on average)
    if (Math.random() < 0.01) {
      await cleanupOldChecks(30);
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording uptime check:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record uptime check" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
