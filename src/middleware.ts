/**
 * Edge middleware: a lightweight gate that only checks for the *presence* of the
 * session cookie (the Admin SDK can't run on the Edge runtime). Full token
 * verification and role checks happen in server components via requireRole().
 */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  // `pathname + search`, not just the pathname: a deep link carrying filters
  // used to lose them on the way through login.
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  const response = NextResponse.redirect(loginUrl);
  // Without this the 307 itself is cacheable and can be replayed after sign-in.
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/candidate/:path*", "/employer/:path*", "/onboarding/:path*", "/admin/:path*"],
};
