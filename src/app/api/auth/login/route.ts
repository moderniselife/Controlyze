import { NextRequest, NextResponse } from "next/server";
import {
  validateCredentials,
  createSession,
  isAuthEnabled,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: NextRequest, username: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${username.toLowerCase()}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }

  return record.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  record.count += 1;
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function POST(request: NextRequest) {
  try {
    const authEnabled = isAuthEnabled();
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

    const attemptKey = getClientKey(request, username);
    if (isRateLimited(attemptKey)) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Try again later." },
        { status: 429 }
      );
    }

    const valid = await validateCredentials(username, password);
    if (!valid) {
      recordFailedAttempt(attemptKey);
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    clearAttempts(attemptKey);

    const sessionId = await createSession(username);

    const response = NextResponse.json({
      success: true,
      user: { username },
    });

    // Only set Secure flag if actually accessed via HTTPS
    const isHttps = request.headers.get("x-forwarded-proto") === "https" ||
                    request.url.startsWith("https://");

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: isHttps,
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
