import { NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import { recordUptimeCheck } from "@/lib/uptime/tracker";

// This endpoint should be called periodically (e.g., every 30 seconds)
// You can use an external cron service, or call it from the frontend
export async function GET() {
  return POST();
}

export async function POST() {
  const startTime = Date.now();
  
  try {
    // Run uptime check
    const uptimeResults = await recordUptimeCheck();
    
    // Evaluate alerts
    const alertResults = await evaluateAlerts();
    const triggeredAlerts = alertResults.filter((r) => r.triggered);
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: {
        uptime: {
          servicesChecked: uptimeResults.length,
          services: uptimeResults,
        },
        alerts: {
          evaluated: alertResults.length,
          triggered: triggeredAlerts.length,
          details: triggeredAlerts,
        },
        duration: `${duration}ms`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { success: false, error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}
