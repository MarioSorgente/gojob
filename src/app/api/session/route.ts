/**
 * Session endpoint.
 *   POST   { idToken }  -> mint an httpOnly session cookie from a Firebase ID token
 *   DELETE              -> clear the session cookie (sign out)
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(request: Request) {
  const { idToken } = (await request.json()) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Failed to create session cookie", error);
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
