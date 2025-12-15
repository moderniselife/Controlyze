import { NextRequest, NextResponse } from "next/server";
import { isAuthEnabled, validateSession, SESSION_COOKIE } from "@/lib/auth";

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

    // Read cookie directly from request (works with middleware fetch)
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    
    if (!sessionId) {
      return NextResponse.json({
        authEnabled: true,
        authenticated: false,
      });
    }

    const username = await validateSession(sessionId);
    const authenticated = username !== null;

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
