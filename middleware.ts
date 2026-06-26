import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/offline", "/_next", "/favicon"];

// Reserverede slugs der ikke må bruges som org-slugs
const RESERVED_SLUGS = new Set([
  "admin", "api", "www", "app", "auth", "login", "static",
  "dashboard", "profile", "manager", "requests",
]);

// Rate-limiting mod brute-force login håndteres udelukkende via
// database-baseret account lockout i auth.ts (5 fejlede forsøg → 15 min lås).

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public + static paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session token cookie (set by next-auth)
  const token =
    req.cookies.get("__Secure-authjs.session-token") ??
    req.cookies.get("authjs.session-token");

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|icons|manifest).*)"],
};
