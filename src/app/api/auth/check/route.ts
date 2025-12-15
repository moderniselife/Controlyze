import { NextRequest, NextResponse } from "next/server";
import { isAuthEnabled, isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authEnabled = isAuthEnabled();
    
    if (!authEnabled) {
      return NextResponse.json({
        authEnabled: false,
        authenticated: true,
      });
    }

    const authenticated = await isAuthenticated();

    return NextResponse.json({
      authEnabled: true,
      authenticated,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({
      authEnabled: false,
      authenticated: true,
      error: "Auth check failed",
    });
  }
}
