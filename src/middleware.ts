import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "controlyze_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/status", "/api/public", "/api/auth"];

// Cache for status domain fetched from API
let cachedStatusDomain: string | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

async function getStatusDomain(request: NextRequest): Promise<string> {
  // Check environment variable first (fast path)
  if (process.env.STATUS_PAGE_DOMAIN) {
    return process.env.STATUS_PAGE_DOMAIN;
  }
  
  // Return cached value if still valid
  const now = Date.now();
  if (cachedStatusDomain !== null && now - cacheTime < CACHE_DURATION) {
    return cachedStatusDomain;
  }

  // Fetch from internal API (runs on server start and caches)
  try {
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/internal/status-domain`, {
      headers: { "x-internal-request": "true" },
    });
    if (response.ok) {
      const data = await response.json();
      const domain = data.domain || "";
      cachedStatusDomain = domain;
      cacheTime = now;
      return domain;
    }
  } catch {
    // Silently fail - will use empty string
  }

  cachedStatusDomain = "";
  cacheTime = now;
  return "";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  
  // Skip API calls for internal requests to prevent loops
  if (pathname.startsWith("/api/internal/")) {
    return NextResponse.next();
  }
  
  // Check if this is the status page domain
  const statusDomain = await getStatusDomain(request);
  
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
