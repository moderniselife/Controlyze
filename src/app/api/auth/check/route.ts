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

    // Read cookie from both request.cookies and raw Cookie header
    let sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    
    // Fallback: parse Cookie header directly (for middleware internal fetch)
    if (!sessionId) {
      const cookieHeader = request.headers.get("cookie") || "";
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
          const [key, ...val] = c.split("=");
          return [key, val.join("=")];
        })
      );
      sessionId = cookies[SESSION_COOKIE];
    }
    
    console.log(`[Auth Check] Session cookie present: ${!!sessionId}, value: ${sessionId?.substring(0, 8) || 'none'}...`);
    
    if (!sessionId) {
      console.log(`[Auth Check] No session cookie found`);
      return NextResponse.json({
        authEnabled: true,
        authenticated: false,
      });
    }

    const username = await validateSession(sessionId);
    console.log(`[Auth Check] Validation result: ${username || 'null'}`);
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
