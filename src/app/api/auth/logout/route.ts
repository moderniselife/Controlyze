import { NextRequest, NextResponse } from "next/server";
import {
  destroySession,
  getSessionFromCookies,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionFromCookies();
    if (sessionId) {
      await destroySession(sessionId);
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
