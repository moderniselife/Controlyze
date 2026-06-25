import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "controlyze_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/status", "/api/public", "/api/auth"];

function isStatusDomain(host: string, configuredDomain: string | null): boolean {
  const hostname = host.split(":")[0].toLowerCase();

  // Check against configured domain first
  if (configuredDomain && hostname === configuredDomain.toLowerCase()) {
    return true;
  }

  // Fallback: check for common status subdomain patterns
  if (hostname.startsWith("status.") || hostname.startsWith("status-")) {
    return true;
  }

  return false;
}

async function validateSessionCookie(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    return false;
  }

  try {
    const response = await fetch(new URL("/api/auth/check", request.url), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      return data.authenticated === true;
    }
  } catch {
    // Fail closed if the auth check cannot be completed.
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Check if this is the status page domain
  // Custom status domains must be provided via STATUS_PAGE_DOMAIN. The user-editable
  // statusPage.domain config is intentionally not trusted by middleware, otherwise a
  // forged admin request could persistently lock the dashboard behind /status.
  const configuredDomain = process.env.STATUS_PAGE_DOMAIN || null;

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

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/vercel.svg" ||
    pathname === "/file.svg" ||
    pathname === "/window.svg"
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if auth is disabled via environment variable
  // If AUTH_DISABLED=true, allow all requests through
  if (process.env.AUTH_DISABLED === "true") {
    return NextResponse.next();
  }

  const authenticated = await validateSessionCookie(request);
  if (authenticated) {
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
