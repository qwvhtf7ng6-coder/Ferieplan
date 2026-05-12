import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdmin, isManager } from "@/lib/permissions";

const PUBLIC_PATHS = ["/login"];

const MANAGER_PATHS = ["/manager"];
const ADMIN_PATHS = ["/admin"];

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  // Public routes
  if (PUBLIC_PATHS.includes(pathname)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Require login for everything else
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (session.user as any).role as string;

  // Admin-only paths
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!isAdmin(role as any)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Manager+ paths
  if (MANAGER_PATHS.some((p) => pathname.startsWith(p))) {
    if (!isManager(role as any)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
