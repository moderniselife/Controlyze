import { NextResponse } from "next/server";
import { detectSchroStack, getSchroStackDashboard } from "@/lib/schrostack/profile";

export async function GET() {
  try {
    const profile = await detectSchroStack();
    const dashboard = profile.detected ? getSchroStackDashboard(profile) : null;

    return NextResponse.json({
      success: true,
      data: {
        profile,
        dashboard,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error detecting SchroStack:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
