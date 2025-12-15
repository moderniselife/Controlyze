import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "controlyze_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/status", "/api/public", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if auth is enabled by calling our API (can't read config directly in edge middleware)
  try {
    const baseUrl = request.nextUrl.origin;
    const authCheckResponse = await fetch(`${baseUrl}/api/auth/check`, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    });

    const authData = await authCheckResponse.json();

    // If auth is not enabled, allow through
    if (!authData.authEnabled) {
      return NextResponse.next();
    }

    // If auth is enabled but user is not authenticated, redirect to login
    if (!authData.authenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    // If auth check fails, allow through (fail open for now)
    console.error("Middleware auth check error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
