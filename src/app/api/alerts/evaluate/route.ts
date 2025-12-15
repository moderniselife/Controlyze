import { NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/alerts/evaluator";

export async function POST() {
  try {
    const results = await evaluateAlerts();
    
    const triggered = results.filter((r) => r.triggered);
    
    return NextResponse.json({
      success: true,
      data: {
        evaluated: results.length,
        triggered: triggered.length,
        alerts: triggered,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error evaluating alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to evaluate alerts" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
