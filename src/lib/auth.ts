/**
 * Server-side auth helpers. Read the session cookie, verify it with the Admin
 * SDK, and load the GoJob user document. Use in server components, layouts, and
 * route handlers (Node runtime only — not edge middleware).
 */

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "./firebase/admin";
import { SESSION_COOKIE } from "./session";
import type { AppUser, UserRole } from "./types";

/** Returns the signed-in user, or null. Never throws. */
export async function getSessionUser(): Promise<AppUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(token, false);
    const snap = await adminDb().collection("users").doc(decoded.uid).get();

    if (!snap.exists) {
      // Authenticated in Firebase but no GoJob profile doc yet (pre-onboarding).
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        phone: decoded.phone_number ?? null,
        role: null,
        displayName: decoded.name ?? null,
        language: null,
        onboardingComplete: false,
        createdAt: new Date().toISOString(),
      };
    }

    return { uid: decoded.uid, ...(snap.data() as Omit<AppUser, "uid">) };
  } catch {
    return null;
  }
}

/** Require a signed-in user or redirect to /login. */
export async function requireUser(): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a user with a specific role. Redirects unauthenticated users to
 * /login, users without a role to /onboarding, and wrong-role users to their
 * own home.
 */
export async function requireRole(role: UserRole): Promise<AppUser> {
  const user = await requireUser();
  if (!user.role) redirect("/onboarding");
  if (user.role !== role) {
    redirect(user.role === "employer" ? "/employer" : "/candidate");
  }
  return user;
}

/** Where a user should land based on role + onboarding status. */
export function homePathFor(user: Pick<AppUser, "role" | "onboardingComplete">): string {
  if (!user.role) return "/onboarding";
  if (user.role === "employer") {
    return user.onboardingComplete ? "/employer" : "/employer/onboarding";
  }
  if (user.role === "candidate") {
    return user.onboardingComplete ? "/candidate" : "/candidate/onboarding";
  }
  if (user.role === "admin") return "/admin";
  return "/onboarding";
}
