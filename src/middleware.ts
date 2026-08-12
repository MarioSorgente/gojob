/**
 * Edge middleware: a lightweight gate that only checks for the *presence* of the
 * session cookie (the Admin SDK can't run on the Edge runtime). Full token
 * verification and role checks happen in server components via requireRole().
 */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/candidate/:path*", "/employer/:path*", "/onboarding/:path*", "/admin/:path*"],
};
