import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "controlyze_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/status", "/api/public", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  
  // Check if this is the status page domain
  // Can be configured via STATUS_PAGE_DOMAIN env var
  const statusDomain = process.env.STATUS_PAGE_DOMAIN || "";
  
  if (statusDomain && host.includes(statusDomain)) {
    // This is the status page domain - redirect root to /status
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/status", request.url));
    }
    // For status domain, only allow /status and public API routes
    if (pathname.startsWith("/status") || pathname.startsWith("/api/public")) {
      return NextResponse.next();
    }
    // Block other routes on status domain
    return NextResponse.redirect(new URL("/status", request.url));
  }

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

  // Check if auth is disabled via environment variable
  // If AUTH_DISABLED=true, allow all requests through
  if (process.env.AUTH_DISABLED === "true") {
    return NextResponse.next();
  }

  // Check for session cookie - if it exists, allow through
  // Actual session validation happens in API routes/pages
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  
  if (sessionCookie?.value) {
    // Session cookie exists - let the request through
    // Server-side validation will happen in the actual route
    return NextResponse.next();
  }

  // No session cookie - redirect to login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
