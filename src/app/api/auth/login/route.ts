import { NextRequest, NextResponse } from "next/server";
import {
  validateCredentials,
  createSession,
  isAuthEnabled,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authEnabled = await isAuthEnabled();
    if (!authEnabled) {
      return NextResponse.json(
        { success: false, error: "Authentication is not enabled" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const valid = await validateCredentials(username, password);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const sessionId = await createSession(username);

    const response = NextResponse.json({
      success: true,
      user: { username },
    });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
