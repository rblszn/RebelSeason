import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";
import { adminSessionOptions, AdminSessionData } from "@/lib/auth";

/**
 * Next.js 16 Proxy (Middleware) to protect `/admin` and `/api/admin` routes.
 *
 * In iron-session v9, the Web Crypto API is used and the functionality of
 * iron-session/edge is unified under the root "iron-session" package via `nextProxyCookies`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Decrypt and load admin session from cookies
  const session = await getIronSession<AdminSessionData>(
    nextProxyCookies(request, response),
    adminSessionOptions
  );

  const isAdmin = Boolean(session?.isLoggedIn && session?.role === "ADMIN");

  // Allow unauthenticated access to admin login page
  if (pathname === "/admin/login") {
    // If already authenticated as admin, redirect to admin dashboard
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // Protect Admin API routes: return 401 JSON for unauthorized access
  if (pathname.startsWith("/api/admin")) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    return response;
  }

  // Protect Admin web pages: redirect to /admin/login if not authenticated
  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
