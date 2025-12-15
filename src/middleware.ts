import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "controlyze_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/status", "/api/public", "/api/auth"];

// Cache for status domain fetched from API
let cachedStatusDomain: string | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

function isStatusDomain(host: string, configuredDomain: string | null): boolean {
  // Check against configured domain first
  if (configuredDomain && host.includes(configuredDomain)) {
    return true;
  }
  
  // Fallback: check for common status subdomain patterns
  const hostname = host.split(":")[0]; // Remove port if present
  if (hostname.startsWith("status.") || hostname.startsWith("status-")) {
    return true;
  }
  
  return false;
}

async function getConfiguredStatusDomain(request: NextRequest): Promise<string | null> {
  // Check environment variable first (fast path)
  if (process.env.STATUS_PAGE_DOMAIN) {
    return process.env.STATUS_PAGE_DOMAIN;
  }
  
  // Return cached value if still valid
  const now = Date.now();
  if (cachedStatusDomain !== null && now - cacheTime < CACHE_DURATION) {
    return cachedStatusDomain || null;
  }

  // Try to fetch from internal API using main app origin
  // Note: This may fail on status subdomain, which is why we have fallback patterns
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
      return domain || null;
    }
  } catch {
    // API call failed - likely on status subdomain, use fallback patterns
  }

  cachedStatusDomain = "";
  cacheTime = now;
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  
  // Skip API calls for internal requests to prevent loops
  if (pathname.startsWith("/api/internal/")) {
    return NextResponse.next();
  }
  
  // Check if this is the status page domain
  const configuredDomain = await getConfiguredStatusDomain(request);
  
  if (isStatusDomain(host, configuredDomain)) {
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
